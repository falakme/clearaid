"""Web Push subscription endpoints.

The browser registers its push subscription (scoped to its city) so we can
notify residents when an alert is triggered. Non-PII: only the opaque push
endpoint + keys + city are stored.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import PushSubscription
from app.schemas import PushSubscriptionIn

router = APIRouter(tags=["push"])


@router.get("/api/push/vapid-public-key")
def vapid_public_key() -> dict:
    """Expose the VAPID public key so the browser can subscribe."""
    settings = get_settings()
    return {"public_key": settings.vapid_public_key, "configured": bool(settings.vapid_public_key)}


@router.post("/api/push/subscribe", status_code=201)
def subscribe(payload: PushSubscriptionIn, db: Session = Depends(get_db)) -> dict:
    """Upsert a browser push subscription, scoped to a city."""
    existing = db.scalar(
        select(PushSubscription).where(PushSubscription.endpoint == payload.endpoint)
    )
    if existing is not None:
        existing.p256dh = payload.keys.p256dh
        existing.auth = payload.keys.auth
        existing.city = payload.city
    else:
        db.add(
            PushSubscription(
                endpoint=payload.endpoint,
                p256dh=payload.keys.p256dh,
                auth=payload.keys.auth,
                city=payload.city,
            )
        )
    db.commit()
    return {"ok": True}
