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
from app.schemas import SearchResult, VerifiedResource
from app.services.parsing import normalize, strip_emoji, try_parse
from app.services.prompts import (
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
    """Assemble the system + hint + user messages for the extraction call."""
    sections: list[str] = []
    if context:
        sections.append("USER CONTEXT (what the user said they need help with):\n" + context)
    if document:
        sections.append("DOCUMENT TEXT (extracted from the user's uploaded file):\n" + document)
    user_message = "\n\n".join(sections) if sections else document

    messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]
    hint = doc_type_hint(doc_type)
    if hint:
        messages.append({"role": "system", "content": hint})
    if eli5:
        messages.append(
            {
                "role": "system",
                "content": (
                    "Explain this as if I am 5 years old. Use very simple words and "
                    "short sentences in the plain_language_brief, the "
                    "plain_language_explanation_markdown, and the task_list, while "
                    "keeping all facts, dates, and amounts accurate. Still return the "
                    "exact JSON schema."
                ),
            }
        )
    lang = (language or "").strip()
    if lang and lang.lower() not in {"english", "en"}:
        messages.append(
            {
                "role": "system",
                "content": (
                    f"Output the JSON values strictly translated into {lang}. "
                    "Translate every human-readable string value (brief, explanation, "
                    "tasks, table headers/cells, diagram titles/descriptions) into "
                    f"{lang}. Keep the JSON keys, urgency_tier, document_category, "
                    "detected_location, and ai_confidence_score in English exactly as "
                    "specified."
                ),
            }
        )
    messages.append({"role": "user", "content": user_message})
    return messages


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

    async with httpx.AsyncClient(timeout=60.0) as client:
        content = await _call_model(client, messages)
        data = try_parse(content)

        if data is None:
            retry_messages = messages + [
                {"role": "assistant", "content": content[:2000]},
                {"role": "user", "content": RETRY_INSTRUCTION},
            ]
            content = await _call_model(client, retry_messages)
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

    return VerifiedResource(
        recommended_resource_name=name,
        recommended_resource_url=url,
        ai_reasoning_for_recommendation=reasoning,
    )
