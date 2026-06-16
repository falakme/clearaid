"""Core Crisis-to-Action translation endpoint.

Accepts either pasted text OR an uploaded document (PDF / image). Uploaded
files are converted to text (pypdf or OCR) before being sent to the model.
"""

from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.config import get_settings
from app.schemas import TranslateResponse
from app.services.extract import ExtractionError, extract_text
from app.services.pii import redact_pii
from app.services.nvidia import (
    NvidiaConfigError,
    NvidiaUpstreamError,
    translate_form,
)

router = APIRouter(tags=["translate"])

# Document types the model knows how to translate.
ALLOWED_DOC_TYPES = {"emergency", "general", "eviction", "housing", "school", "medical_bill"}


@router.post("/api/translate-form", response_model=TranslateResponse)
async def translate(
    text: Optional[str] = Form(default=None),
    doc_type: str = Form(default="general"),
    eli5: bool = Form(default=False),
    language: str = Form(default=""),
    file: Optional[UploadFile] = File(default=None),
) -> TranslateResponse:
    """Translate dense paperwork into an actionable checklist.

    Provide `text` OR a `file` (PDF/image). Human-in-the-loop: this endpoint
    NEVER submits anything on the user's behalf — it only extracts, clarifies,
    and summarizes. `eli5` requests a 5-year-old-friendly explanation;
    `language` translates the output values into that language.
    """
    settings = get_settings()
    if doc_type not in ALLOWED_DOC_TYPES:
        doc_type = "general"

    # The user's typed context — what they said they need help with. When a
    # document is attached this is forwarded ALONGSIDE the extracted text.
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

    try:
        return await translate_form(
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
