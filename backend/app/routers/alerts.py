"""Disaster alert endpoints.

Public read endpoint for the dashboard + admin-protected write endpoints
for the hackathon demo control panel. All data here is non-PII.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import Alert
from app.schemas import AlertCreate, AlertOut, AlertUpdate
from app.seed import insert_demo_alerts
from app.services.push import send_city_push

router = APIRouter(tags=["alerts"])


def require_admin(x_admin_key: Optional[str] = Header(default=None)) -> None:
    """Guard admin write endpoints with a shared key."""
    settings = get_settings()
    if not x_admin_key or x_admin_key != settings.admin_api_key:
        raise HTTPException(status_code=401, detail="Invalid or missing admin key.")


def _active_alert_for_city(db: Session, city: str) -> Optional[Alert]:
    """Return an existing ACTIVE alert for the given city, if any."""
    if not city:
        return None
    return db.scalar(
        select(Alert)
        .where(Alert.is_active.is_(True))
        .where(func.lower(Alert.city) == city.strip().lower())
        .order_by(Alert.created_at.desc())
    )


@router.get("/api/alerts", response_model=list[AlertOut])
def list_alerts(
    city: Optional[str] = Query(default=None, description="Filter by city (case-insensitive)."),
    zip_code: Optional[str] = Query(default=None, description="Filter by ZIP code (legacy)."),
    include_inactive: bool = Query(default=False),
    db: Session = Depends(get_db),
) -> list[Alert]:
    """Fetch active disaster alerts, optionally scoped to an area.

    Targeting is primarily by city (matched case-insensitively). The legacy
    `zip_code` filter is still honoured for backward compatibility.
    """
    stmt = select(Alert)
    if not include_inactive:
        stmt = stmt.where(Alert.is_active.is_(True))
    if city:
        stmt = stmt.where(func.lower(Alert.city) == city.strip().lower())
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
def create_alert(
    payload: AlertCreate,
    force: bool = Query(
        default=False,
        description="Bypass the one-active-alert-per-city rule (admin override).",
    ),
    db: Session = Depends(get_db),
) -> Alert:
    """Trigger a new disaster alert.

    ALERT GROUPING: to stop multiple ER teams in the same city from spamming
    residents, only one ACTIVE alert is allowed per city. If one already
    exists and `force` is false (the ER-team path), this returns 409 so the
    caller updates the existing alert instead. Admins can pass `force=true`.
    """
    existing = _active_alert_for_city(db, payload.city)
    if existing is not None and not force:
        raise HTTPException(
            status_code=409,
            detail={
                "message": (
                    f"An active alert already exists for {payload.city}. "
                    "Update the existing alert instead of creating a duplicate."
                ),
                "existing_alert_id": existing.id,
            },
        )

    alert = Alert(**payload.model_dump())
    db.add(alert)
    db.commit()
    db.refresh(alert)

    # Best-effort push to residents subscribed in this city.
    if alert.is_active and alert.status == "active":
        send_city_push(
            db,
            city=alert.city,
            title=alert.title,
            body=alert.message,
            url="/emergency",
        )
    return alert


@router.post(
    "/api/alerts/seed",
    response_model=list[AlertOut],
    status_code=201,
    dependencies=[Depends(require_admin)],
)
def seed_alerts(db: Session = Depends(get_db)) -> list[Alert]:
    """Admin/demo: load the bundled demo alert set."""
    insert_demo_alerts(db)
    stmt = select(Alert).order_by(Alert.created_at.desc())
    return list(db.scalars(stmt).all())


@router.patch(
    "/api/alerts/{alert_id}",
    response_model=AlertOut,
    dependencies=[Depends(require_admin)],
)
def update_alert(
    alert_id: int, payload: AlertUpdate, db: Session = Depends(get_db)
) -> Alert:
    """Admin/ER: edit an alert, toggle active state, or resolve it.

    Setting `status` to "resolved" flips residents into recovery mode; the
    frontend then switches to the green theme and queries long-term recovery
    grants instead of emergency relief.
    """
    alert = db.get(Alert, alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found.")
    fields = payload.model_dump(exclude_unset=True)
    for field, value in fields.items():
        setattr(alert, field, value)
    db.commit()
    db.refresh(alert)

    # Notify residents on a meaningful, still-active content change.
    notify_fields = {"title", "message", "is_active"}
    if alert.is_active and alert.status == "active" and notify_fields & set(fields):
        send_city_push(
            db,
            city=alert.city,
            title=alert.title,
            body=alert.message,
            url="/emergency",
        )
    return alert


@router.delete(
    "/api/alerts/{alert_id}",
    status_code=204,
    dependencies=[Depends(require_admin)],
)
def delete_alert(alert_id: int, db: Session = Depends(get_db)) -> None:
    """Admin/demo: permanently delete an alert."""
    alert = db.get(Alert, alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found.")
    db.delete(alert)
    db.commit()


@router.delete(
    "/api/alerts",
    status_code=204,
    dependencies=[Depends(require_admin)],
)
def clear_alerts(db: Session = Depends(get_db)) -> None:
    """Admin/demo: delete ALL alerts (danger)."""
    db.execute(delete(Alert))
    db.commit()
