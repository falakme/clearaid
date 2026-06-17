"""Health check endpoint."""

from fastapi import APIRouter

from app import __version__
from app.config import get_settings
from app.schemas import HealthResponse

router = APIRouter(tags=["system"])


@router.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        version=__version__,
        nvidia_configured=bool(settings.nvidia_api_key),
        nvidia_model=settings.nvidia_model,
        brave_configured=bool(settings.brave_api_key),
    )
