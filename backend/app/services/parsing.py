"""Defensive parsing and normalization of model output.

Models are unreliable: they wrap JSON in markdown fences, add trailing commas,
emit emojis, or drift from the schema. This module extracts the first balanced
JSON object, repairs common mistakes, strips emojis, and coerces the result
into the strict `TranslateResponse` schema — never raising on bad shapes.
"""

from __future__ import annotations

import json
import re

from app.schemas import DiagramStep, TableData, TaskItem, TranslateResponse

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


def strip_emoji(text: str) -> str:
    cleaned = _EMOJI_PATTERN.sub("", text)
    return re.sub(r"[ \t]{2,}", " ", cleaned).strip()


def is_safe_url(url: str) -> bool:
    """Only allow plain http(s) links — blocks javascript:, data:, etc. (S3)."""
    return bool(re.match(r"^https?://", url.strip(), re.IGNORECASE))


def first_json_object(s: str) -> str | None:
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


def try_parse(content: str) -> dict | None:
    """Best-effort parse of a JSON object from raw model output."""
    if not content:
        return None

    text = content.strip()

    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()

    candidates = [text]
    block = first_json_object(text)
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


def normalize(data: dict, source_text: str) -> TranslateResponse:
    """Coerce model output into the structured response schema (emoji-free)."""

    # Classification.
    urgency = str(data.get("urgency_tier", "")).strip()
    if urgency not in _VALID_URGENCY:
        urgency = "Informational Only"

    category = str(data.get("document_category", "")).strip().lower()
    if category not in _VALID_CATEGORY:
        category = "general"

    # Summarization.
    brief = strip_emoji(str(data.get("plain_language_brief", "")).strip())

    # Markdown explanation (always present).
    markdown = strip_emoji(str(data.get("plain_language_explanation_markdown", "")).strip())
    if not markdown:
        markdown = "No explanation could be generated from the provided document."

    # Task list — accept dicts ({id, task, description}) or bare strings.
    tasks: list[TaskItem] = []
    for index, raw in enumerate(data.get("task_list") or [], start=1):
        if isinstance(raw, dict):
            label = strip_emoji(str(raw.get("task", "")).strip())
            desc = strip_emoji(str(raw.get("description", "")).strip())
            raw_id = raw.get("id", index)
        else:
            label = strip_emoji(str(raw).strip())
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
        headers = [strip_emoji(str(h).strip()) for h in (raw_table.get("headers") or [])]
        for raw_row in raw_table.get("rows") or []:
            if isinstance(raw_row, list):
                rows.append([strip_emoji(str(cell).strip()) for cell in raw_row])
    if not headers:
        rows = []

    # Diagram steps.
    steps: list[DiagramStep] = []
    for index, raw in enumerate(data.get("diagram_steps") or [], start=1):
        if not isinstance(raw, dict):
            continue
        title = strip_emoji(str(raw.get("title", "")).strip())
        description = strip_emoji(str(raw.get("description", "")).strip())
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

    detected_location = strip_emoji(str(data.get("detected_location", "")).strip())

    # Resource URLs — keep only well-formed http(s) links (S3 hardening).
    raw_resources = data.get("local_support_resources") or []
    resources: list[str] = []
    if isinstance(raw_resources, list):
        resources = [
            str(r).strip()
            for r in raw_resources
            if str(r).strip() and is_safe_url(str(r))
        ]

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
