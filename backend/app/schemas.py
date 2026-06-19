"""Pydantic schemas for request/response validation."""

from pydantic import BaseModel, Field


# --- Translate: structured sub-objects ---
class TaskItem(BaseModel):
    """A single actionable step rendered in the interactive task list."""

    id: int
    task: str
    description: str = ""


class TableData(BaseModel):
    """Tabular allocations (fee breakdowns, eligibility brackets, etc.)."""

    headers: list[str] = Field(default_factory=list)
    rows: list[list[str]] = Field(default_factory=list)


class DiagramStep(BaseModel):
    """A node in the process visualizer / step-by-step flowchart."""

    step_number: int
    title: str
    description: str


# --- Agentic recommendation (internal) ---
class SearchResult(BaseModel):
    """A raw Brave Search hit, passed to the AI evaluator for selection."""

    title: str
    url: str
    description: str = ""


class AdditionalResource(BaseModel):
    """A supplementary resource from the Brave search hits."""

    name: str = ""
    url: str = ""
    description: str = ""


class VerifiedResource(BaseModel):
    """The top AI-selected resource plus supplementary hits from Brave."""

    recommended_resource_name: str = ""
    recommended_resource_url: str = ""
    ai_reasoning_for_recommendation: str = ""
    additional_resources: list[AdditionalResource] = Field(default_factory=list)


class RecommendRequest(BaseModel):
    """Input for the agentic recommendation step (run as a separate request so
    the main translation can return fast and stay under gateway timeouts)."""

    document_category: str = "general"
    plain_language_brief: str = ""
    # Location source priority: explicit `location`, else `detected_location`.
    location: str = ""
    detected_location: str = ""


# --- Translate response ---
URGENCY_TIERS = ("Urgent Action Required", "Time Sensitive", "Informational Only")


class TranslateResponse(BaseModel):
    """Structured, multi-capability output rendered by the Translator view.

    Showcases explicit AI capabilities:
      - Classification  -> urgency_tier, document_category
      - Summarization   -> plain_language_brief
      - Extraction      -> plain_language_explanation_markdown, task_list,
                           table_data, diagram_steps
      - Agentic RAG     -> recommended_resource_* (selected from live search)

    `source_text` is attached by the backend (not the model) to power the
    Source Transparency engine.
    """

    # Classification.
    urgency_tier: str = Field(
        default="Informational Only",
        description="One of: Urgent Action Required | Time Sensitive | Informational Only",
    )
    document_category: str = Field(
        default="general",
        description="Short machine label, e.g. eviction, medical, food_assistance.",
    )

    # Summarization.
    plain_language_brief: str = ""

    # Extraction.
    plain_language_explanation_markdown: str = ""
    task_list: list[TaskItem] = Field(default_factory=list)
    table_data: TableData = Field(default_factory=TableData)
    diagram_steps: list[DiagramStep] = Field(default_factory=list)

    # Confidence (Responsible AI gateway).
    ai_confidence_score: str = Field(default="Medium", pattern="^(High|Medium|Low)$")
    confidence_percent: int = Field(default=85, ge=0, le=100)

    # Agentic resource recommendation ("Verified Local Support").
    local_support_resources: list[str] = Field(default_factory=list)
    recommended_resource_name: str = ""
    recommended_resource_url: str = ""
    ai_reasoning_for_recommendation: str = ""
    additional_resources: list[AdditionalResource] = Field(default_factory=list)

    # Location the model detected in the document (drives the search query).
    detected_location: str = ""

    # Backend-attached provenance (the exact extracted/source text).
    source_text: str = ""

    # Count of sensitive PII items redacted during intake.
    pii_redacted_count: int = 0



class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "clarityai-backend"
    version: str
    nvidia_configured: bool
    nvidia_model: str = ""
    brave_configured: bool = False
    azure_tts_configured: bool = False


class TtsRequest(BaseModel):
    """Input for the Azure Cognitive Services text-to-speech proxy.

    `language` selects a matching neural voice + locale so non-Latin scripts
    (Hindi, Arabic, Chinese, …) are pronounced correctly. Defaults to English.
    """

    text: str = Field(min_length=1, max_length=6000)
    language: str = ""


# --- Follow-up chat ---
class ChatMessage(BaseModel):
    """A single turn in the follow-up conversation."""

    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    """Input for the stateless follow-up chat.

    The client sends the document context (brief + source text), the full
    message history, and the detected user location on every turn — the backend
    keeps no conversation state.
    """

    question: str = Field(min_length=1, max_length=4000)
    # Document context the conversation is anchored to.
    document_brief: str = ""
    document_explanation: str = ""
    source_text: str = ""
    # Prior turns (oldest first), excluding the new `question`.
    history: list[ChatMessage] = Field(default_factory=list)
    language: str = ""
    # City/region detected from the user's IP — used to give location-specific
    # resource suggestions in the chat (e.g. local bar associations, clinics).
    detected_location: str = ""


class ChatResponse(BaseModel):
    """The assistant's answer to a follow-up question."""

    answer: str = ""
