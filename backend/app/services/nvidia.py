"""NVIDIA Build API integration for the Crisis-to-Action translator.

Sends raw government form text to `google/gemma-3n-e4b-it` and parses a
strict JSON checklist back out. The system prompt forbids markdown and
preamble, but models are unreliable, so we defensively extract and repair
the JSON, retry once with a corrective nudge, and always fail gracefully
(never with an unhandled 500).
"""

from __future__ import annotations

import json
import re

import httpx

from app.config import get_settings
from app.schemas import DiagramStep, TableData, TaskItem, TranslateResponse

# The EXACT system prompt required by the spec. The model must return a
# structured JSON object (markdown explanation + task list + table + diagram).
SYSTEM_PROMPT = """You are a legal crisis translator. Your user is a stressed individual who needs to understand a complex administrative, legal, or financial document immediately. 
Your ONLY job is to analyze the document text and output a highly structured JSON object. Do not include markdown code fences (like ```json), and do NOT use any emojis in your response. 

Follow this exact JSON schema strictly:
{
  "plain_language_explanation_markdown": "A comprehensive, simple explanation of the document written in clear Markdown. Use bolding and headers where necessary. Strictly NO emojis.",
  "task_list": [
    { "id": 1, "task": "Actionable task statement 1" },
    { "id": 2, "task": "Actionable task statement 2" }
  ],
  "table_data": {
    "headers": ["Column 1 Title", "Column 2 Title"],
    "rows": [
      ["Row 1 Cell 1 Data", "Row 1 Cell 2 Data"],
      ["Row 2 Cell 1 Data", "Row 2 Cell 2 Data"]
    ]
  },
  "diagram_steps": [
    { "step_number": 1, "title": "Brief Step Title", "description": "What to do in this phase" },
    { "step_number": 2, "title": "Next Step Title", "description": "What to do next" }
  ],
  "ai_confidence_score": "High"
}
The "ai_confidence_score" MUST be exactly one of "High", "Medium", or "Low". Set it to "High" only when the document text is clear and complete, "Medium" when some details are ambiguous, and "Low" when the input is sparse, garbled, or you are largely inferring.
If the document does not contain data relevant for a table, leave the 'table_data' arrays empty. Always populate the markdown explanation, the task_list, the diagram_steps, and the ai_confidence_score."""

RETRY_INSTRUCTION = (
    "Your previous reply was not valid JSON. Reply again with ONLY the raw JSON "
    "object matching the schema exactly — no markdown code fences, no commentary, "
    "and no emojis."
)

# Optional per-module nudge layered on top of the canonical system prompt
# (without altering it). Keeps document-type specialization while enforcing
# the single structured schema above.
_DOC_TYPE_HINTS = {
    "medical_bill": (
        "Document category: itemized medical bill. Decode billing codes into "
        "plain language, populate table_data with the line items and charges, "
        "and flag likely overcharges. Include a clear statement that this is "
        "not medical or legal advice. Do not give medical or legal advice."
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
    "\U0001f000-\U0001ffff"  # SMP: emoji, symbols, pictographs, flags, etc.
    "\u2600-\u27bf"  # misc symbols + dingbats
    "\u2b00-\u2bff"  # misc symbols and arrows (stars, etc.)
    "\ufe00-\ufe0f"  # variation selectors
    "\u200d"  # zero-width joiner
    "]",
)


def _strip_emoji(text: str) -> str:
    cleaned = _EMOJI_PATTERN.sub("", text)
    # Collapse any double spaces left behind by removed glyphs.
    return re.sub(r"[ \t]{2,}", " ", cleaned).strip()


class NvidiaConfigError(RuntimeError):
    """Raised when the NVIDIA API key is not configured."""


class NvidiaUpstreamError(RuntimeError):
    """Raised when the NVIDIA API returns an error or unparsable output."""


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
    return None  # unbalanced (likely truncated output)


def _try_parse(content: str) -> dict | None:
    """Best-effort parse of a JSON object from raw model output.

    Tries the whole string, a fenced block, and the first balanced object,
    each with a trailing-comma repair pass. Returns None if nothing parses.
    """
    if not content:
        return None

    text = content.strip()

    # Strip ```json ... ``` fences if the model ignored instructions.
    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()

    candidates = [text]
    block = _first_json_object(text)
    if block and block != text:
        candidates.append(block)

    for candidate in candidates:
        # Try as-is, then with trailing commas removed (a common LLM slip).
        repaired = re.sub(r",(\s*[}\]])", r"\1", candidate)
        for variant in (candidate, repaired):
            try:
                parsed = json.loads(variant)
            except json.JSONDecodeError:
                continue
            if isinstance(parsed, dict):
                return parsed
    return None


def _normalize(data: dict, source_text: str) -> TranslateResponse:
    """Coerce model output into the structured response schema (emoji-free)."""

    # Markdown explanation (always present).
    markdown = _strip_emoji(str(data.get("plain_language_explanation_markdown", "")).strip())
    if not markdown:
        markdown = "No explanation could be generated from the provided document."

    # Task list — accept dicts ({id, task}) or bare strings.
    tasks: list[TaskItem] = []
    for index, raw in enumerate(data.get("task_list") or [], start=1):
        if isinstance(raw, dict):
            label = _strip_emoji(str(raw.get("task", "")).strip())
            raw_id = raw.get("id", index)
        else:
            label = _strip_emoji(str(raw).strip())
            raw_id = index
        if not label:
            continue
        try:
            task_id = int(raw_id)
        except (TypeError, ValueError):
            task_id = index
        tasks.append(TaskItem(id=task_id, task=label))

    # Table — tolerate missing/garbled shapes; only keep well-formed rows.
    raw_table = data.get("table_data") or {}
    headers: list[str] = []
    rows: list[list[str]] = []
    if isinstance(raw_table, dict):
        headers = [_strip_emoji(str(h).strip()) for h in (raw_table.get("headers") or [])]
        for raw_row in raw_table.get("rows") or []:
            if isinstance(raw_row, list):
                rows.append([_strip_emoji(str(cell).strip()) for cell in raw_row])
    # Drop a table that has no headers (nothing meaningful to render).
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
    confidence = raw_conf if raw_conf in {"High", "Medium", "Low"} else "Medium"

    return TranslateResponse(
        plain_language_explanation_markdown=markdown,
        task_list=tasks,
        table_data=TableData(headers=headers, rows=rows),
        diagram_steps=steps,
        ai_confidence_score=confidence,
        source_text=source_text[:12000],
    )


async def _call_model(client: httpx.AsyncClient, messages: list[dict]) -> str:
    """POST a chat completion and return the assistant message content."""
    settings = get_settings()
    payload = {
        "model": settings.nvidia_model,
        "messages": messages,
        "temperature": 0.2,
        "top_p": 0.7,
        # Generous budget so the JSON object is never truncated mid-object.
        "max_tokens": 2048,
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
    except httpx.HTTPError as exc:  # network-level failure
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
    """Call the NVIDIA model and return a structured checklist.

    Accepts the user's typed `user_context` (what they said they need help
    with) and/or the `document_text` extracted from an uploaded file (OCR or
    PDF). Both are forwarded to the model, clearly delineated, so the
    explanation reflects the user's situation as well as the document.

    `doc_type` selects an optional domain hint layered on top of the canonical
    system prompt. `eli5` appends an "explain like I'm 5" instruction;
    `language` forces the JSON values to be translated into that language.
    Retries once with a corrective instruction if the first reply is not
    parseable JSON. Raises NvidiaUpstreamError (handled as HTTP 502) rather
    than crashing if the model output cannot be parsed.
    """
    settings = get_settings()

    if not settings.nvidia_api_key:
        raise NvidiaConfigError(
            "NVIDIA_API_KEY is not set. Add it to the backend environment."
        )

    context = (user_context or "").strip()
    document = (document_text or "").strip()

    # Compose a single user message that clearly separates the user's own
    # words from the (OCR'd) document text so the model can use both.
    sections: list[str] = []
    if context:
        sections.append(
            "USER CONTEXT (what the user said they need help with):\n" + context
        )
    if document:
        sections.append(
            "DOCUMENT TEXT (extracted from the user's uploaded file):\n" + document
        )
    user_message = "\n\n".join(sections) if sections else document

    # Provenance for the Source Transparency engine: prefer the document text,
    # falling back to the user's typed words when no file was provided.
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
                    "short sentences in the plain_language_explanation_markdown and "
                    "the task_list, while keeping all facts, dates, and amounts "
                    "accurate. Still return the exact JSON schema."
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
                    "Translate every human-readable string value (explanation, tasks, "
                    "table headers/cells, diagram titles/descriptions) into "
                    f"{lang}. Keep the JSON keys and structure exactly as specified, "
                    "and keep ai_confidence_score as one of High, Medium, or Low."
                ),
            }
        )
    messages.append({"role": "user", "content": user_message})

    async with httpx.AsyncClient(timeout=60.0) as client:
        content = await _call_model(client, messages)
        data = _try_parse(content)

        if data is None:
            # One corrective retry — show the model its bad output and insist.
            retry_messages = messages + [
                {"role": "assistant", "content": content[:2000]},
                {"role": "user", "content": RETRY_INSTRUCTION},
            ]
            content = await _call_model(client, retry_messages)
            data = _try_parse(content)

    if data is None:
        raise NvidiaUpstreamError(
            "The AI returned malformed output. Please try again."
        )

    return _normalize(data, source_text)
