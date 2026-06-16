"""Health check endpoint."""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import __version__
from app.config import get_settings
from app.database import get_db
from app.schemas import HealthResponse

router = APIRouter(tags=["system"])


@router.get("/api/health", response_model=HealthResponse)
def health(db: Session = Depends(get_db)) -> HealthResponse:
    settings = get_settings()

    database_connected = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:  # noqa: BLE001 - report status without failing the check
        database_connected = False

    return HealthResponse(
        version=__version__,
        nvidia_configured=bool(settings.nvidia_api_key),
        nvidia_model=settings.nvidia_model,
        database_connected=database_connected,
    )
