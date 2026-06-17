"""Core Crisis-to-Action translation endpoint.

Accepts either pasted text OR an uploaded document (PDF / image). The pipeline:

  1. Extract text (pypdf / OCR) and redact PII.
  2. AI step 1 — classify + summarize + extract into a structured object.
  3. Retrieval — query Brave Search by document category + location.
  4. AI step 2 — evaluate the live search hits and select ONE trustworthy
     "Verified Local Support" resource, with a one-sentence rationale.

The endpoint NEVER submits anything on the user's behalf; it only clarifies
and organizes.
"""

from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.config import get_settings
from app.schemas import TranslateResponse
from app.services import brave
from app.services.extract import ExtractionError, extract_text
from app.services.pii import redact_pii
from app.services.nvidia import (
    NvidiaConfigError,
    NvidiaUpstreamError,
    evaluate_resources,
    translate_form,
)

router = APIRouter(tags=["translate"])

# Document types the model knows how to translate (optional domain hint).
ALLOWED_DOC_TYPES = {"emergency", "general", "eviction", "housing", "school", "medical_bill"}


@router.post("/api/translate-form", response_model=TranslateResponse)
async def translate(
    text: Optional[str] = Form(default=None),
    doc_type: str = Form(default="general"),
    eli5: bool = Form(default=False),
    language: str = Form(default=""),
    location: str = Form(default=""),
    file: Optional[UploadFile] = File(default=None),
) -> TranslateResponse:
    """Translate dense paperwork into an actionable, multi-capability workspace.

    Provide `text` OR a `file` (PDF/image). `location` (optional) scopes the
    agentic resource recommendation; when empty, the model's detected location
    is used. Human-in-the-loop: this endpoint NEVER submits anything.
    """
    settings = get_settings()
    if doc_type not in ALLOWED_DOC_TYPES:
        doc_type = "general"

    user_context = (text or "").strip()
    document_text = ""

    if file is not None:
        data = await file.read()
        max_bytes = settings.max_upload_mb * 1024 * 1024
        if len(data) == 0:
            raise HTTPException(status_code=422, detail="The uploaded file is empty.")
        if len(data) > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Max {settings.max_upload_mb} MB.",
            )
        try:
            document_text = extract_text(file.filename, file.content_type, data)
        except ExtractionError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    if not user_context and not document_text:
        raise HTTPException(
            status_code=422,
            detail="Tell us what you need help with, or upload a document to translate.",
        )

    # PII REDACTION LAYER: strip SSNs (and future PII) before anything is sent
    # to the model. Runs on BOTH the typed context and the extracted document.
    user_context = redact_pii(user_context)
    document_text = redact_pii(document_text)

    # AI step 1 — classify + summarize + extract.
    try:
        result = await translate_form(
            document_text,
            doc_type,
            user_context=user_context,
            eli5=eli5,
            language=language,
        )
    except NvidiaConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except NvidiaUpstreamError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    # Agentic recommendation — retrieval (Brave) + AI evaluation. Best-effort:
    # any failure here leaves the recommendation fields empty and the core
    # translation is still returned.
    search_location = (location or "").strip() or result.detected_location
    try:
        query = brave.build_recommendation_query(result.document_category, search_location)
        hits = await brave.search(query)
        if hits:
            verified = await evaluate_resources(
                hits,
                document_brief=result.plain_language_brief,
                document_category=result.document_category,
            )
            result.recommended_resource_name = verified.recommended_resource_name
            result.recommended_resource_url = verified.recommended_resource_url
            result.ai_reasoning_for_recommendation = verified.ai_reasoning_for_recommendation
    except Exception:  # noqa: BLE001 - recommendations never break the response
        pass

    return result
