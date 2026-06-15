"""Core Crisis-to-Action translation endpoint.

Accepts either pasted text OR an uploaded document (PDF / image). Uploaded
files are converted to text (pypdf or OCR) before being sent to the model.
"""

from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.config import get_settings
from app.schemas import TranslateResponse
from app.services.extract import ExtractionError, extract_text
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
    file: Optional[UploadFile] = File(default=None),
) -> TranslateResponse:
    """Translate dense paperwork into an actionable checklist.

    Provide `text` OR a `file` (PDF/image). Human-in-the-loop: this endpoint
    NEVER submits anything on the user's behalf — it only extracts, clarifies,
    and summarizes.
    """
    settings = get_settings()
    if doc_type not in ALLOWED_DOC_TYPES:
        doc_type = "general"

    source_text = (text or "").strip()

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
            source_text = extract_text(file.filename, file.content_type, data)
        except ExtractionError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    if not source_text:
        raise HTTPException(
            status_code=422,
            detail="Provide some text or upload a document to translate.",
        )

    try:
        return await translate_form(source_text, doc_type)
    except NvidiaConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except NvidiaUpstreamError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
