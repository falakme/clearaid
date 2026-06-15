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
from app.schemas import TranslateResponse

# The EXACT system prompt required by the spec. Do not edit casually — the
# downstream UI and Responsible AI guarantees depend on this schema.
SYSTEM_PROMPT = """You are a legal crisis translator. Your user is a stressed victim of a natural disaster who needs to fill out government relief paperwork immediately. 
I will provide you with the raw text of a government form or terms and conditions. 
Your ONLY job is to read the text, skip the standard boilerplate, and output a highly specific, actionable checklist in strict JSON format. Do not use markdown blocks, and do not say "Here is the JSON." Output ONLY the raw JSON object.

Follow this exact JSON schema:
{
  "bottom_line_summary": "A 1-sentence plain language summary of what this form gets the user.",
  "deadline": "The exact submission deadline extracted from the text, or null if none.",
  "required_attachments": ["List of physical documents needed, e.g., 'Utility Bill', 'Photo ID'"],
  "signature_locations": ["List of exactly where to sign, e.g., 'Page 3, Bottom Right'"],
  "critical_warnings": ["Any major catch, e.g., 'If you accept this, you waive other aid'"],
  "source_text_reference": "A 1-2 sentence direct quote from the original text that proves the deadline or warning."
}"""

RETRY_INSTRUCTION = (
    "Your previous reply was not valid JSON. Reply again with ONLY the raw JSON "
    "object matching the schema exactly — no markdown, no code fences, no commentary."
)


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


def _normalize(data: dict) -> TranslateResponse:
    """Coerce model output into our strict response schema."""

    def as_list(value: object) -> list[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]
        return [str(value).strip()]

    deadline = data.get("deadline")
    if isinstance(deadline, str) and deadline.strip().lower() in {"null", "none", ""}:
        deadline = None

    return TranslateResponse(
        bottom_line_summary=str(data.get("bottom_line_summary", "")).strip()
        or "No summary could be generated from the provided text.",
        deadline=deadline,
        required_attachments=as_list(data.get("required_attachments")),
        signature_locations=as_list(data.get("signature_locations")),
        critical_warnings=as_list(data.get("critical_warnings")),
        source_text_reference=str(data.get("source_text_reference", "")).strip(),
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


async def translate_form(text: str) -> TranslateResponse:
    """Call the NVIDIA model and return a structured checklist.

    Retries once with a corrective instruction if the first reply is not
    parseable JSON. Raises NvidiaUpstreamError (handled as HTTP 502) rather
    than crashing if the model output cannot be parsed.
    """
    settings = get_settings()

    if not settings.nvidia_api_key:
        raise NvidiaConfigError(
            "NVIDIA_API_KEY is not set. Add it to the backend environment."
        )

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": text},
    ]

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

    return _normalize(data)
