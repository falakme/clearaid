"""Pydantic schemas for request/response validation."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# --- Alerts ---
class AlertBase(BaseModel):
    zip_code: str = Field(..., max_length=16, examples=["77001"])
    title: str = Field(..., max_length=200)
    message: str
    severity: str = Field(default="info", pattern="^(info|warning|success)$")
    programs_open: int = Field(default=0, ge=0)


class AlertCreate(AlertBase):
    """Payload used by the admin demo panel to trigger an alert."""


class AlertOut(AlertBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: datetime


# --- Translate ---
class TranslateRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=1,
        description="Raw text of a government relief form or terms & conditions.",
    )
    source_label: Optional[str] = Field(
        default=None,
        description="Optional label of where the text came from (e.g. program name).",
    )


class TranslateResponse(BaseModel):
    """Structured, plain-language output rendered by the Translator view.

    Matches the exact schema the LLM is instructed to return.
    """

    bottom_line_summary: str
    deadline: Optional[str] = None
    required_attachments: list[str] = Field(default_factory=list)
    signature_locations: list[str] = Field(default_factory=list)
    critical_warnings: list[str] = Field(default_factory=list)
    source_text_reference: str = ""


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "clearaid-backend"
    version: str
    nvidia_configured: bool
