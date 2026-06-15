"""Text extraction from uploaded documents.

PDFs are read with pypdf (selectable text); images are OCR'd with
pytesseract. All failures raise ExtractionError with a user-friendly message
so the API can return a clean 422 instead of a 500.

PRIVACY: extracted text is held only in memory for the duration of the
request and forwarded to the model; it is never written to the database.
"""

from __future__ import annotations

import io

PDF_TYPES = {"application/pdf"}
IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
PDF_EXT = (".pdf",)
IMAGE_EXT = (".png", ".jpg", ".jpeg", ".webp")


class ExtractionError(RuntimeError):
    """Raised when a document cannot be turned into usable text."""


def extract_text(filename: str | None, content_type: str | None, data: bytes) -> str:
    """Dispatch to the right extractor based on file type."""
    name = (filename or "").lower()
    ctype = (content_type or "").lower().split(";")[0].strip()

    if ctype in PDF_TYPES or name.endswith(PDF_EXT):
        return _extract_pdf(data)
    if ctype in IMAGE_TYPES or ctype.startswith("image/") or name.endswith(IMAGE_EXT):
        return _extract_image(data)

    raise ExtractionError(
        "Unsupported file type. Upload a PDF or an image (PNG/JPG)."
    )



def _extract_pdf(data: bytes) -> str:
    try:
        from pypdf import PdfReader
    except ImportError as exc:  # pragma: no cover
        raise ExtractionError("PDF support is not available on the server.") from exc

    try:
        reader = PdfReader(io.BytesIO(data))
        parts = [(page.extract_text() or "") for page in reader.pages]
    except Exception as exc:  # noqa: BLE001
        raise ExtractionError("Could not read this PDF. It may be corrupted.") from exc

    text = "\n".join(parts).strip()
    if not text:
        raise ExtractionError(
            "This PDF has no selectable text (it may be a scan). Try uploading "
            "a photo or image of the document instead."
        )
    return text


def _extract_image(data: bytes) -> str:
    try:
        import pytesseract
        from PIL import Image
    except ImportError as exc:  # pragma: no cover
        raise ExtractionError("Image OCR is not available on the server.") from exc

    try:
        image = Image.open(io.BytesIO(data))
    except Exception as exc:  # noqa: BLE001
        raise ExtractionError("Could not open the image file.") from exc

    try:
        text = pytesseract.image_to_string(image)
    except pytesseract.TesseractNotFoundError as exc:
        raise ExtractionError(
            "The OCR engine (tesseract) is not installed on the server."
        ) from exc
    except Exception as exc:  # noqa: BLE001
        raise ExtractionError("Could not read text from the image.") from exc

    text = text.strip()
    if not text:
        raise ExtractionError(
            "No readable text was found in the image. Try a clearer, well-lit photo."
        )
    return text
