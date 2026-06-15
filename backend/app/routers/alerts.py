"""Disaster alert endpoints.

Public read endpoint for the dashboard + admin-protected write endpoints
for the hackathon demo control panel. All data here is non-PII.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import Alert
from app.schemas import AlertCreate, AlertOut

router = APIRouter(tags=["alerts"])


def require_admin(x_admin_key: Optional[str] = Header(default=None)) -> None:
    """Guard admin write endpoints with a shared key."""
    settings = get_settings()
    if not x_admin_key or x_admin_key != settings.admin_api_key:
        raise HTTPException(status_code=401, detail="Invalid or missing admin key.")


@router.get("/api/alerts", response_model=list[AlertOut])
def list_alerts(
    zip_code: Optional[str] = Query(default=None, description="Filter by ZIP code."),
    include_inactive: bool = Query(default=False),
    db: Session = Depends(get_db),
) -> list[Alert]:
    """Fetch active disaster alerts, optionally scoped to a ZIP code."""
    stmt = select(Alert)
    if not include_inactive:
        stmt = stmt.where(Alert.is_active.is_(True))
    if zip_code:
        stmt = stmt.where(Alert.zip_code == zip_code)
    stmt = stmt.order_by(Alert.created_at.desc())
    return list(db.scalars(stmt).all())


@router.post(
    "/api/alerts",
    response_model=AlertOut,
    status_code=201,
    dependencies=[Depends(require_admin)],
)
def create_alert(payload: AlertCreate, db: Session = Depends(get_db)) -> Alert:
    """Admin/demo: trigger a new disaster alert."""
    alert = Alert(**payload.model_dump())
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


@router.delete(
    "/api/alerts/{alert_id}",
    status_code=204,
    dependencies=[Depends(require_admin)],
)
def deactivate_alert(alert_id: int, db: Session = Depends(get_db)) -> None:
    """Admin/demo: deactivate (soft-delete) an alert."""
    alert = db.get(Alert, alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found.")
    alert.is_active = False
    db.commit()
