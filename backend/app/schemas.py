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


class AlertUpdate(BaseModel):
    """Partial update for an alert (admin). All fields optional."""

    zip_code: Optional[str] = Field(default=None, max_length=16)
    title: Optional[str] = Field(default=None, max_length=200)
    message: Optional[str] = None
    severity: Optional[str] = Field(default=None, pattern="^(info|warning|success)$")
    programs_open: Optional[int] = Field(default=None, ge=0)
    is_active: Optional[bool] = None


class AlertOut(AlertBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: datetime


# --- Translate ---
class TaskItem(BaseModel):
    """A single actionable step rendered in the interactive task list."""

    id: int
    task: str


class TableData(BaseModel):
    """Tabular allocations (fee breakdowns, eligibility brackets, etc.)."""

    headers: list[str] = Field(default_factory=list)
    rows: list[list[str]] = Field(default_factory=list)


class DiagramStep(BaseModel):
    """A node in the process visualizer / step-by-step flowchart."""

    step_number: int
    title: str
    description: str


class TranslateResponse(BaseModel):
    """Structured, multi-component output rendered by the Translator view.

    The first four fields mirror the exact JSON schema the LLM is instructed
    to return. `source_text` is attached by the backend (not the model) to
    power the Source Transparency engine.
    """

    plain_language_explanation_markdown: str
    task_list: list[TaskItem] = Field(default_factory=list)
    table_data: TableData = Field(default_factory=TableData)
    diagram_steps: list[DiagramStep] = Field(default_factory=list)
    # Backend-attached provenance (the exact extracted/source text).
    source_text: str = ""


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "clearaid-backend"
    version: str
    nvidia_configured: bool
    nvidia_model: str = ""
    database_connected: bool = False
