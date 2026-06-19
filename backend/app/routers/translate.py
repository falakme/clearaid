"""Core Crisis-to-Action translation endpoints.

The work is split across TWO endpoints so neither request runs long enough to
hit a reverse-proxy / gateway timeout (which surfaces in the browser as a
502 Bad Gateway):

  POST /api/translate-form  — extract text, redact PII, geolocate (fast), and
                              ONE NVIDIA call that classifies + summarizes +
                              extracts. Kept fast and free of web retrieval.
  POST /api/recommend       — the agentic step: Brave retrieval + a SECOND
                              NVIDIA call that evaluates the hits and selects
                              one "Verified Local Support" resource. The client
                              fires this after the translation renders, so the
                              card streams in without blocking the result. This
                              is the SINGLE place Brave is queried (no duplicate
                              search on the fast path).

Neither endpoint ever submits anything on the user's behalf.
"""

from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from starlette.concurrency import run_in_threadpool

from app.config import get_settings
from app.ratelimit import limiter
from app.schemas import RecommendRequest, TranslateResponse, VerifiedResource
from app.services import brave
from app.services.extract import ExtractionError, extract_text
from app.services.geolocation import resolve_location
from app.services.pii import redact_pii
from app.services.nvidia import (
    BlurDetectedError,
    NvidiaConfigError,
    NvidiaUpstreamError,
    evaluate_resources,
    translate_form,
)

router = APIRouter(tags=["translate"])

# Document types the model knows how to translate (optional domain hint).
ALLOWED_DOC_TYPES = {"emergency", "general", "eviction", "housing", "school", "medical_bill"}

# Bound the work a single request can trigger (memory + latency + cost).
MAX_FILES = 5


async def _extract_documents(files: list[UploadFile], max_upload_mb: int) -> str:
    """Read, size-check, and OCR/parse up to MAX_FILES uploads.

    OCR (pytesseract) and PDF parsing (pypdf) are synchronous and CPU-bound, so
    they run in a worker thread to avoid blocking the async event loop (which
    would otherwise serialize all concurrent requests).
    """
    document_text = ""
    max_bytes = max_upload_mb * 1024 * 1024

    for file in files[:MAX_FILES]:
        data = await file.read()
        if not data:
            continue
        if len(data) > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Max {max_upload_mb} MB.",
            )
        try:
            extracted = await run_in_threadpool(
                extract_text, file.filename, file.content_type, data
            )
        except ExtractionError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        document_text += f"\n--- {file.filename} ---\n{extracted}\n"

    return document_text


@router.post("/api/translate-form", response_model=TranslateResponse)
@limiter.limit("20/minute")
async def translate(
    request: Request,
    text: Optional[str] = Form(default=None),
    doc_type: str = Form(default="general"),
    eli5: bool = Form(default=False),
    language: str = Form(default=""),
    client_ip: Optional[str] = Form(default=None),
    files: list[UploadFile] = File(default=[]),
) -> TranslateResponse:
    """Translate dense paperwork into an actionable, multi-capability workspace.

    Provide `text` OR a `file` (PDF/image). Returns the structured translation
    (classification + summary + extraction). The "Verified Local Support"
    recommendation is fetched separately via POST /api/recommend so this call
    stays fast. Human-in-the-loop: this endpoint NEVER submits anything.
    """
    settings = get_settings()
    if doc_type not in ALLOWED_DOC_TYPES:
        doc_type = "general"

    user_context = (text or "").strip()
    document_text = await _extract_documents(files, settings.max_upload_mb) if files else ""
    # Did we actually OCR/parse an uploaded document? The "blurry photo" error
    # path is only meaningful when there was a document to read.
    has_document = bool(document_text.strip())

    if not user_context and not document_text:
        raise HTTPException(
            status_code=422,
            detail="Tell us what you need help with, or upload a document to translate.",
        )

    # PII REDACTION LAYER: strip SSNs, emails, and phone numbers before anything is sent
    # to the model. Runs on BOTH the typed context and the extracted document.
    user_context, count_user = redact_pii(user_context)
    document_text, count_doc = redact_pii(document_text)
    pii_redacted_count = count_user + count_doc

    # Location-aware intake (fast, best-effort). The detected location flows to
    # the client and is later passed to /api/recommend to bias the Brave query —
    # so Brave is queried exactly once per document, on the slow path.
    detected_location = await resolve_location(client_ip)

    # AI step — classify + summarize + extract (single call, kept fast).
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
    except NvidiaUpstreamError:
        # Generic message to the client; details are logged server-side (S6).
        raise HTTPException(
            status_code=502,
            detail="ClarityAI had trouble reading that. Please try again.",
        )
    except BlurDetectedError:
        # "blur_detected" triggers the "take another photo" message in the UI,
        # so only emit it when a document/photo was actually uploaded. If the
        # input was typed text, the model misfired — return a generic prompt.
        if has_document:
            raise HTTPException(status_code=422, detail="blur_detected")
        raise HTTPException(
            status_code=422,
            detail="We couldn't quite make sense of that. Please add a little more detail about your situation.",
        )

    result.pii_redacted_count = pii_redacted_count
    # If the AI did not confidently detect a location, fall back to IP location.
    if not result.detected_location and detected_location:
        result.detected_location = detected_location

    return result


@router.post("/api/recommend", response_model=VerifiedResource)
@limiter.limit("30/minute")
async def recommend(request: Request, payload: RecommendRequest) -> VerifiedResource:
    """Agentic resource recommendation: Brave retrieval + AI evaluation.

    Best-effort by design — returns empty fields (rather than an error) when
    Brave/NVIDIA are unconfigured, find nothing, or fail, so the client can
    simply omit the "Verified Local Support" card.
    """
    search_location = (payload.location or "").strip() or (payload.detected_location or "").strip()
    try:
        query = brave.build_recommendation_query(payload.document_category, search_location)
        hits = await brave.search(query)
        if not hits:
            return VerifiedResource()
        return await evaluate_resources(
            hits,
            document_brief=payload.plain_language_brief,
            document_category=payload.document_category,
        )
    except Exception:  # noqa: BLE001 - recommendations never raise to the client
        return VerifiedResource()
