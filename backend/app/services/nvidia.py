"""NVIDIA Build API integration for the Crisis-to-Action translator.

Two distinct cognitive steps run against `google/gemma-3n-e4b-it`:

1. translate_form()    — classify + summarize + extract a dense document into
                         a strict, multi-capability JSON object.
2. evaluate_resources() — the AI-evaluation half of the agentic recommendation
                         engine: given live search hits + the document context,
                         pick the SINGLE most trustworthy resource and explain
                         why the others were discarded.

This module is the orchestrator: prompts live in `prompts.py`, output parsing
and normalization in `parsing.py`. The system prompts forbid markdown fences,
preamble, and emojis, but models are unreliable, so we defensively extract and
repair the JSON, retry once with a corrective nudge, and always fail gracefully
(never an unhandled 500).
"""

from __future__ import annotations

import httpx

from app.config import get_settings
from app.schemas import AdditionalResource, ChatMessage, SearchResult, VerifiedResource
from app.services.parsing import normalize, strip_emoji, try_parse
from app.services.prompts import (
    CHAT_SYSTEM_PROMPT,
    EVALUATOR_PROMPT,
    RETRY_INSTRUCTION,
    SYSTEM_PROMPT,
    doc_type_hint,
)

# Bound the input so a very large paste/OCR result can't blow the model's
# context window (an upstream 400 -> 502) or push latency past the gateway
# timeout. Generous limits that comfortably hold a multi-page notice.
MAX_DOC_CHARS = 20000
MAX_CONTEXT_CHARS = 6000

# Output-token budget for the extraction/translation call. gemma-3n-e4b-it on
# the NVIDIA Build API caps generation at 4096 tokens, so we request the full
# ceiling. This matters most for NON-ENGLISH output: scripts like Arabic,
# Chinese, and Hindi (Devanagari) tokenize to ~1.5-2.5x more tokens than the
# equivalent English text, so the translated JSON easily overran the old 2048
# limit, getting truncated mid-object. A truncated reply fails to parse, the
# retry truncates too, and the request surfaced to the user as a 502
# "ClarityAI had trouble reading that." Requesting the max is a free ceiling —
# the model stops as soon as the JSON is complete, so English stays just as
# fast while longer non-Latin output now has room to finish.
MAX_OUTPUT_TOKENS = 4096

# Follow-up chat bounds.
MAX_CHAT_CONTEXT_CHARS = 8000
MAX_CHAT_HISTORY_TURNS = 10


class NvidiaConfigError(RuntimeError):
    """Raised when the NVIDIA API key is not configured."""


class NvidiaUpstreamError(RuntimeError):
    """Raised when the NVIDIA API returns an error or unparsable output."""


class BlurDetectedError(RuntimeError):
    """Raised when the AI detects that the document text is illegible or blurry."""


async def _call_model(client: httpx.AsyncClient, messages: list[dict], max_tokens: int = 2048) -> str:
    """POST a chat completion and return the assistant message content."""
    settings = get_settings()
    payload = {
        "model": settings.nvidia_model,
        "messages": messages,
        "temperature": 0.2,
        "top_p": 0.7,
        "max_tokens": max_tokens,
        "stream": False,
    }
    headers = {
        "Authorization": f"Bearer {settings.nvidia_api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    url = f"{settings.nvidia_base_url.rstrip('/')}/chat/completions"

    try:
        resp = await client.post(url, json=payload, headers=headers)
    except httpx.HTTPError as exc:
        raise NvidiaUpstreamError(f"Could not reach NVIDIA API: {exc}") from exc

    if resp.status_code >= 400:
        # Full upstream text is kept in the exception for server-side logs only;
        # the router translates this into a generic client message (S6).
        raise NvidiaUpstreamError(
            f"NVIDIA API error {resp.status_code}: {resp.text[:500]}"
        )

    body = resp.json()
    try:
        return body["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise NvidiaUpstreamError("Unexpected response shape from NVIDIA API.") from exc


def _build_messages(
    document: str, context: str, doc_type: str, eli5: bool, language: str
) -> list[dict]:
    """Assemble the messages for the extraction call.

    IMPORTANT: gemma-3n-e4b-it (Gemma family) uses a chat template that does
    not natively support the `system` role. Serving stacks tolerate a SINGLE
    leading system message by folding it into the first user turn, but a
    SECOND system message breaks the required user/model alternation and the
    upstream rejects the request (4xx) -> surfaces to the client as a 502.

    Previously the doc-type hint, ELI5 instruction, and the
    "translate into <language>" instruction were each appended as their own
    system message. English with the default doc type produced exactly ONE
    system message (worked), but ANY non-English request added a second one
    (always failed). To stay robust we collapse every instruction into a
    SINGLE system message and keep exactly one user turn.
    """
    instructions: list[str] = [SYSTEM_PROMPT]

    hint = doc_type_hint(doc_type)
    if hint:
        instructions.append(hint)

    if eli5:
        instructions.append(
            "Explain this as if I am 5 years old. Use very simple words and "
            "short sentences in the plain_language_brief, the "
            "plain_language_explanation_markdown, and the task_list, while "
            "keeping all facts, dates, and amounts accurate. Still return the "
            "exact JSON schema."
        )

    lang = (language or "").strip()
    if lang and lang.lower() not in {"english", "en"}:
        instructions.append(
            f"Output the JSON values strictly translated into {lang}. "
            "Translate every human-readable string value (brief, explanation, "
            "tasks, table headers/cells, diagram titles/descriptions) into "
            f"{lang}. Keep the JSON keys, urgency_tier, document_category, "
            "detected_location, and ai_confidence_score in English exactly as "
            "specified."
        )

    system_content = "\n\n".join(instructions)

    sections: list[str] = []
    if context:
        sections.append("USER CONTEXT (what the user said they need help with):\n" + context)
    if document:
        sections.append("DOCUMENT TEXT (extracted from the user's uploaded file):\n" + document)
    user_message = "\n\n".join(sections) if sections else document

    return [
        {"role": "system", "content": system_content},
        {"role": "user", "content": user_message},
    ]


async def translate_form(
    document_text: str,
    doc_type: str = "general",
    user_context: str = "",
    eli5: bool = False,
    language: str = "",
):
    """Call the NVIDIA model and return a structured, multi-capability result.

    Classifies (urgency_tier, document_category), summarizes
    (plain_language_brief), and extracts (markdown, tasks, table, diagram) the
    user's typed `user_context` and/or the `document_text` extracted from an
    uploaded file. Retries once with a corrective instruction if the first
    reply is not parseable JSON.
    """
    settings = get_settings()

    if not settings.nvidia_api_key:
        raise NvidiaConfigError(
            "NVIDIA_API_KEY is not set. Add it to the backend environment."
        )

    context = (user_context or "").strip()
    document = (document_text or "").strip()

    if len(document) > MAX_DOC_CHARS:
        document = document[:MAX_DOC_CHARS] + "\n\n[Document truncated for length.]"
    if len(context) > MAX_CONTEXT_CHARS:
        context = context[:MAX_CONTEXT_CHARS] + " [truncated]"

    source_text = document or context
    messages = _build_messages(document, context, doc_type, eli5, language)

    # Non-Latin output is slower to generate, so allow more wall-clock time
    # before the request would otherwise time out into a 502.
    async with httpx.AsyncClient(timeout=90.0) as client:
        content = await _call_model(client, messages, max_tokens=MAX_OUTPUT_TOKENS)
        data = try_parse(content)

        if data is None:
            retry_messages = messages + [
                {"role": "assistant", "content": content[:2000]},
                {"role": "user", "content": RETRY_INSTRUCTION},
            ]
            content = await _call_model(client, retry_messages, max_tokens=MAX_OUTPUT_TOKENS)
            data = try_parse(content)

    if data is None:
        raise NvidiaUpstreamError("The AI returned malformed output. Please try again.")

    if isinstance(data, dict) and data.get("error") == "blur_detected":
        raise BlurDetectedError(data.get("message") or "The document text is too unclear to process safely.")

    return normalize(data, source_text)


async def evaluate_resources(
    results: list[SearchResult],
    document_brief: str,
    document_category: str,
) -> VerifiedResource:
    """AI-evaluation step: pick the single best resource from live search hits.

    Best-effort: returns an empty VerifiedResource if the model is not
    configured, the input is empty, or the output cannot be parsed — the
    recommendation is an enhancement, never a hard dependency.
    """
    settings = get_settings()
    if not settings.nvidia_api_key or not results:
        return VerifiedResource()

    numbered = "\n".join(
        f"{i}. title: {r.title}\n   url: {r.url}\n   description: {r.description}"
        for i, r in enumerate(results, start=1)
    )
    user_message = (
        f"PERSON'S SITUATION (category: {document_category or 'general'}):\n"
        f"{document_brief or 'A person needs local support for the situation above.'}\n\n"
        f"SEARCH RESULTS:\n{numbered}"
    )
    messages = [
        {"role": "system", "content": EVALUATOR_PROMPT},
        {"role": "user", "content": user_message},
    ]

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            content = await _call_model(client, messages, max_tokens=512)
    except NvidiaUpstreamError:
        return VerifiedResource()

    data = try_parse(content)
    if not data:
        return VerifiedResource()

    name = strip_emoji(str(data.get("recommended_resource_name", "")).strip())
    url = str(data.get("recommended_resource_url", "")).strip()
    reasoning = strip_emoji(str(data.get("ai_reasoning_for_recommendation", "")).strip())

    # Trust only a URL that actually appears in the provided results.
    valid_urls = {r.url for r in results}
    if url and url not in valid_urls:
        # Some models normalize trailing slashes; try a loose match.
        match = next((u for u in valid_urls if u.rstrip("/") == url.rstrip("/")), "")
        url = match

    if not url:
        return VerifiedResource()

    # Include the remaining Brave hits (up to 4) as supplementary resources.
    additional = [
        AdditionalResource(name=r.title, url=r.url, description=r.description)
        for r in results
        if r.url.rstrip("/") != url.rstrip("/") and r.url.strip()
    ][:4]

    return VerifiedResource(
        recommended_resource_name=name,
        recommended_resource_url=url,
        ai_reasoning_for_recommendation=reasoning,
        additional_resources=additional,
    )


async def chat(
    question: str,
    document_brief: str = "",
    document_explanation: str = "",
    source_text: str = "",
    history: list[ChatMessage] | None = None,
    language: str = "",
    detected_location: str = "",
) -> str:
    """Answer a follow-up question, grounded in the already-analyzed document.

    Stateless: the caller supplies the document context and the prior turns on
    every request. Returns the assistant's plain-text/Markdown answer.
    """
    settings = get_settings()
    if not settings.nvidia_api_key:
        raise NvidiaConfigError(
            "NVIDIA_API_KEY is not set. Add it to the backend environment."
        )

    # Assemble the grounding context (bounded).
    context_parts: list[str] = []
    if document_brief.strip():
        context_parts.append("SUMMARY:\n" + document_brief.strip())
    if document_explanation.strip():
        context_parts.append("EXPLANATION:\n" + document_explanation.strip())
    if source_text.strip():
        context_parts.append("ORIGINAL DOCUMENT TEXT:\n" + source_text.strip())
    context = "\n\n".join(context_parts) if context_parts else "No document context was provided."
    if len(context) > MAX_CHAT_CONTEXT_CHARS:
        context = context[:MAX_CHAT_CONTEXT_CHARS] + "\n\n[context truncated]"

    # gemma-3n-e4b-it allows AT MOST ONE system message and it must be the very
    # first message; every following message must alternate user/assistant.
    # So fold the persona, the document context, the (optional) language
    # instruction, and the (optional) location into a SINGLE system message.
    system_parts = [
        CHAT_SYSTEM_PROMPT,
        "DOCUMENT CONTEXT FOR THIS CONVERSATION:\n\n" + context,
    ]

    loc = (detected_location or "").strip()
    if loc:
        system_parts.append(
            f"USER LOCATION: {loc}. "
            "When the user asks about local resources, services, offices, lawyers, doctors, "
            "hotlines, or any location-specific help, tailor your answer to this location. "
            "Name real, known organizations, agencies, or services that serve this area where "
            "possible. If you are not confident about a specific resource for that location, "
            "say so and suggest how the person can find one (e.g. local government website, "
            "211, bar association directory)."
        )
    lang = (language or "").strip()
    if lang and lang.lower() not in {"english", "en"}:
        system_parts.append(
            f"Reply in {lang}. Keep proper nouns, amounts, and dates as written in the document."
        )

    messages: list[dict] = [
        {"role": "system", "content": "\n\n".join(system_parts)},
    ]

    # Replay the recent history (bounded to the last N turns).
    for turn in (history or [])[-MAX_CHAT_HISTORY_TURNS:]:
        content = (turn.content or "").strip()
        if content:
            messages.append({"role": turn.role, "content": content[:MAX_CONTEXT_CHARS]})

    messages.append({"role": "user", "content": question.strip()[:MAX_CONTEXT_CHARS]})

    async with httpx.AsyncClient(timeout=45.0) as client:
        # A touch warmer than extraction — this is conversational, not structured.
        content = await _call_model(client, messages, max_tokens=700)

    answer = strip_emoji((content or "").strip())
    if not answer:
        raise NvidiaUpstreamError("The AI returned an empty answer.")
    return answer
