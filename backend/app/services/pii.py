"""PII redaction.

Runs on extracted/typed text BEFORE it is sent to the NVIDIA model, so
sensitive identifiers never leave the backend. Currently redacts US Social
Security Numbers; the pattern set can be extended without touching callers.

PRIVACY: redaction is in-memory only; nothing is logged or persisted.
"""

from __future__ import annotations

import re

REDACTED = "[REDACTED]"

# US SSN: XXX-XX-XXXX (also tolerates spaces as separators). Word boundaries
# avoid clipping longer digit runs (e.g. phone numbers / IDs).
_SSN_RE = re.compile(r"\b\d{3}[-\s]\d{2}[-\s]\d{4}\b")


def redact_pii(text: str) -> str:
    """Replace recognised PII (SSNs) with a [REDACTED] placeholder."""
    if not text:
        return text
    return _SSN_RE.sub(REDACTED, text)
