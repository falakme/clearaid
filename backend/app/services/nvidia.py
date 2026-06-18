"""NVIDIA Build API integration for the Crisis-to-Action translator.

Two distinct cognitive steps run against `google/gemma-3n-e4b-it`:

1. translate_form()    — classify + summarize + extract a dense document into
                         a strict, multi-capability JSON object.
2. evaluate_resources() — the AI-evaluation half of the agentic recommendation
                         engine: given live search hits + the document context,
                         pick the SINGLE most trustworthy resource and explain
                         why the others were discarded.

The system prompts forbid markdown fences, preamble, and emojis, but models
are unreliable, so we defensively extract and repair the JSON, retry once with
a corrective nudge, and always fail gracefully (never an unhandled 500).
"""

from __future__ import annotations

import json
import re

import httpx

from app.config import get_settings
from app.schemas import (
    DiagramStep,
    SearchResult,
    TableData,
    TaskItem,
    TranslateResponse,
    VerifiedResource,
)

# The system prompt for the multi-capability extraction step. The model must
# return a single JSON object: classification + summary + structured extraction.
SYSTEM_PROMPT = """You are ClarityAI. Your role is to provide empathetic, highly actionable legal and bureaucratic guidance. 
You are equipped with real-time location data and live search results. 
If the user provides an uploaded document, analyze it strictly. 
If the user provides a text-based problem, synthesize the provided local search results to build a roadmap for them.
Your output must be EXACTLY this structured JSON object (no markdown code blocks, no preamble, no emojis):
{
  "urgency_tier": "Urgent Action Required" or "Time Sensitive" or "Informational Only",
  "plain_language_brief": "Explanation of their current situation based on local law.",
  "task_list": [{"id": 1, "task": "Short task title", "description": "More context on the task"}],
  "local_support_resources": ["url1", "url2"]
}
Strictly NO emojis. Professional, clear, and action-oriented tone only."""

RETRY_INSTRUCTION = (
    "Your previous reply was not valid JSON or was missing required fields. Reply again with ONLY the raw JSON "
    "object matching the schema exactly (or the blur_detected error JSON if the text is completely illegible) — no markdown code fences, no commentary, "
    "and no emojis."
)

# AI-evaluation step: choose the single best resource from live search hits.
EVALUATOR_PROMPT = """You are a careful caseworker evaluating live web search results to recommend ONE trustworthy local support resource to a person in crisis.
You are given the person's situation and a numbered list of real search results (title, url, description).
Evaluate them and select the SINGLE most relevant and trustworthy resource. Prefer official government (.gov), recognized nonprofits (e.g. 211.org, Feeding America, Legal Aid), and avoid ads, blogs, or commercial lead-generation sites.
Output ONLY this JSON object, no markdown fences, no emojis:
{
  "recommended_resource_name": "The organization or page name",
  "recommended_resource_url": "The exact URL of the chosen result",
  "ai_reasoning_for_recommendation": "ONE sentence explaining why you chose THIS result over the others."
}
The recommended_resource_url MUST be copied verbatim from one of the provided results. If none of the results are trustworthy or relevant, return empty strings for all three fields."""

# Optional per-module nudge layered on top of the canonical system prompt.
_DOC_TYPE_HINTS = {
    "medical_bill": (
        "Document category: itemized medical bill. Decode billing codes into "
        "plain language, populate table_data with the line items and charges, "
        "and flag likely overcharges. This is not medical or legal advice."
    ),
    "eviction": (
        "Document category: eviction or lease-termination notice. Clarify "
        "deadlines and the recipient's options. This is not legal advice."
    ),
    "housing": "Document category: housing/benefits form. Clarify required documents and deadlines.",
    "school": "Document category: school communication. Clarify dates, actions, and parent/guardian rights.",
    "emergency": "Document category: disaster relief paperwork. Prioritize deadlines and required documents.",
}


def _doc_type_hint(doc_type: str) -> str | None:
    return _DOC_TYPE_HINTS.get(doc_type)


# Strip emojis and variation selectors so output stays clean and professional.
_EMOJI_PATTERN = re.compile(
    "["
    "\U0001f000-\U0001ffff"
    "\u2600-\u27bf"
    "\u2b00-\u2bff"
    "\ufe00-\ufe0f"
    "\u200d"
    "]",
)


def _strip_emoji(text: str) -> str:
    cleaned = _EMOJI_PATTERN.sub("", text)
    return re.sub(r"[ \t]{2,}", " ", cleaned).strip()


class NvidiaConfigError(RuntimeError):
    """Raised when the NVIDIA API key is not configured."""


class NvidiaUpstreamError(RuntimeError):
    """Raised when the NVIDIA API returns an error or unparsable output."""


class BlurDetectedError(RuntimeError):
    """Raised when the AI detects that the document text is illegible or blurry."""



def _first_json_object(s: str) -> str | None:
    """Return the first balanced {...} block, ignoring braces inside strings."""
    start = s.find("{")
    if start == -1:
        return None
    depth = 0
    in_str = False
    esc = False
    for i in range(start, len(s)):
        ch = s[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
        elif ch == '"':
            in_str = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return s[start : i + 1]
    return None


def _try_parse(content: str) -> dict | None:
    """Best-effort parse of a JSON object from raw model output."""
    if not content:
        return None

    text = content.strip()

    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()

    candidates = [text]
    block = _first_json_object(text)
    if block and block != text:
        candidates.append(block)

    for candidate in candidates:
        repaired = re.sub(r",(\s*[}\]])", r"\1", candidate)
        for variant in (candidate, repaired):
            try:
                parsed = json.loads(variant)
            except json.JSONDecodeError:
                continue
            if isinstance(parsed, dict):
                return parsed
    return None


_VALID_URGENCY = {"Urgent Action Required", "Time Sensitive", "Informational Only"}
_VALID_CATEGORY = {
    "eviction",
    "housing",
    "medical",
    "food_assistance",
    "utility",
    "legal",
    "benefits",
    "general",
}
_CONFIDENCE_PERCENT = {"High": 98, "Medium": 85, "Low": 62}


def _normalize(data: dict, source_text: str) -> TranslateResponse:
    """Coerce model output into the structured response schema (emoji-free)."""

    # Classification.
    urgency = str(data.get("urgency_tier", "")).strip()
    if urgency not in _VALID_URGENCY:
        urgency = "Informational Only"

    category = str(data.get("document_category", "")).strip().lower()
    if category not in _VALID_CATEGORY:
        category = "general"

    # Summarization.
    brief = _strip_emoji(str(data.get("plain_language_brief", "")).strip())

    # Markdown explanation (always present).
    markdown = _strip_emoji(str(data.get("plain_language_explanation_markdown", "")).strip())
    if not markdown:
        markdown = "No explanation could be generated from the provided document."

    # Task list — accept dicts ({id, task, description}) or bare strings.
    tasks: list[TaskItem] = []
    for index, raw in enumerate(data.get("task_list") or [], start=1):
        if isinstance(raw, dict):
            label = _strip_emoji(str(raw.get("task", "")).strip())
            desc = _strip_emoji(str(raw.get("description", "")).strip())
            raw_id = raw.get("id", index)
        else:
            label = _strip_emoji(str(raw).strip())
            desc = ""
            raw_id = index
        if not label:
            continue
        try:
            task_id = int(raw_id)
        except (TypeError, ValueError):
            task_id = index
        tasks.append(TaskItem(id=task_id, task=label, description=desc))

    # Table — tolerate missing/garbled shapes; only keep well-formed rows.
    raw_table = data.get("table_data") or {}
    headers: list[str] = []
    rows: list[list[str]] = []
    if isinstance(raw_table, dict):
        headers = [_strip_emoji(str(h).strip()) for h in (raw_table.get("headers") or [])]
        for raw_row in raw_table.get("rows") or []:
            if isinstance(raw_row, list):
                rows.append([_strip_emoji(str(cell).strip()) for cell in raw_row])
    if not headers:
        rows = []

    # Diagram steps.
    steps: list[DiagramStep] = []
    for index, raw in enumerate(data.get("diagram_steps") or [], start=1):
        if not isinstance(raw, dict):
            continue
        title = _strip_emoji(str(raw.get("title", "")).strip())
        description = _strip_emoji(str(raw.get("description", "")).strip())
        if not title and not description:
            continue
        try:
            number = int(raw.get("step_number", index))
        except (TypeError, ValueError):
            number = index
        steps.append(DiagramStep(step_number=number, title=title or f"Step {number}", description=description))

    # Confidence score — coerce to one of High|Medium|Low (default Medium).
    raw_conf = str(data.get("ai_confidence_score", "")).strip().capitalize()
    confidence = raw_conf if raw_conf in _CONFIDENCE_PERCENT else "Medium"

    detected_location = _strip_emoji(str(data.get("detected_location", "")).strip())

    resources = data.get("local_support_resources") or []
    if not isinstance(resources, list):
        resources = []
    else:
        resources = [str(r).strip() for r in resources if str(r).strip()]

    return TranslateResponse(
        urgency_tier=urgency,
        document_category=category,
        plain_language_brief=brief,
        plain_language_explanation_markdown=markdown,
        task_list=tasks,
        table_data=TableData(headers=headers, rows=rows),
        diagram_steps=steps,
        ai_confidence_score=confidence,
        confidence_percent=_CONFIDENCE_PERCENT[confidence],
        detected_location=detected_location,
        local_support_resources=resources,
        source_text=source_text[:12000],
    )


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
        raise NvidiaUpstreamError(
            f"NVIDIA API error {resp.status_code}: {resp.text[:500]}"
        )

    body = resp.json()
    try:
        return body["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise NvidiaUpstreamError("Unexpected response shape from NVIDIA API.") from exc


async def translate_form(
    document_text: str,
    doc_type: str = "general",
    user_context: str = "",
    eli5: bool = False,
    language: str = "",
) -> TranslateResponse:
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

    # Bound the input so a very large paste/OCR result can't blow the model's
    # context window (an upstream 400 -> 502) or push latency past the gateway
    # timeout. Generous limits that comfortably hold a multi-page notice.
    MAX_DOC_CHARS = 20000
    MAX_CONTEXT_CHARS = 6000
    if len(document) > MAX_DOC_CHARS:
        document = document[:MAX_DOC_CHARS] + "\n\n[Document truncated for length.]"
    if len(context) > MAX_CONTEXT_CHARS:
        context = context[:MAX_CONTEXT_CHARS] + " [truncated]"

    sections: list[str] = []
    if context:
        sections.append("USER CONTEXT (what the user said they need help with):\n" + context)
    if document:
        sections.append("DOCUMENT TEXT (extracted from the user's uploaded file):\n" + document)
    user_message = "\n\n".join(sections) if sections else document

    source_text = document or context

    messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]
    hint = _doc_type_hint(doc_type)
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

    async with httpx.AsyncClient(timeout=60.0) as client:
        content = await _call_model(client, messages)
        data = _try_parse(content)

        if data is None:
            retry_messages = messages + [
                {"role": "assistant", "content": content[:2000]},
                {"role": "user", "content": RETRY_INSTRUCTION},
            ]
            content = await _call_model(client, retry_messages)
            data = _try_parse(content)

    if data is None:
        raise NvidiaUpstreamError("The AI returned malformed output. Please try again.")

    if isinstance(data, dict) and data.get("error") == "blur_detected":
        raise BlurDetectedError(data.get("message") or "The document text is too unclear to process safely.")

    return _normalize(data, source_text)


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

    data = _try_parse(content)
    if not data:
        return VerifiedResource()

    name = _strip_emoji(str(data.get("recommended_resource_name", "")).strip())
    url = str(data.get("recommended_resource_url", "")).strip()
    reasoning = _strip_emoji(str(data.get("ai_reasoning_for_recommendation", "")).strip())

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
