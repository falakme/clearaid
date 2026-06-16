"""Web Push (VAPID) delivery.

Sends notifications to stored browser subscriptions for a given city when an
alert is triggered. Best-effort: missing VAPID keys, an unavailable pywebpush
library, or per-subscription failures never raise to the caller. Expired/gone
subscriptions (HTTP 404/410) are pruned.
"""

from __future__ import annotations

import json
import logging

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import PushSubscription

logger = logging.getLogger("clearaid.push")


def push_configured() -> bool:
    settings = get_settings()
    return bool(settings.vapid_public_key and settings.vapid_private_key)


def _icon_for(severity: str, status: str) -> str:
    """Map an alert's severity/status to a colored notification icon.

    info            -> blue info icon
    warning/emergency -> red warning icon
    resolved/success  -> green check icon
    """
    flag = (status or "").strip().lower()
    sev = (severity or "").strip().lower()
    if flag == "resolved" or sev == "success":
        return "/icons/icon-green.svg"
    if sev in ("warning", "emergency") or flag == "emergency":
        return "/icons/icon-red.svg"
    return "/icons/icon-blue.svg"


def send_city_push(
    db: Session,
    city: str,
    alert_title: str,
    severity: str = "info",
    status: str = "active",
    url: str = "/emergency",
) -> int:
    """Send a push to every subscription registered for `city`.

    Payload format (per spec): the notification title is strictly "ClearAid"
    and the body is the alert name. A severity/status-driven colored icon URL
    is included so the Service Worker shows the right badge. Returns the number
    of notifications dispatched; silently no-ops if push isn't configured or
    the library isn't installed.
    """
    if not city or not push_configured():
        return 0

    try:
        from pywebpush import WebPushException, webpush
    except ImportError:  # pragma: no cover
        logger.warning("pywebpush not installed; skipping push notifications.")
        return 0

    settings = get_settings()
    subs = list(
        db.scalars(
            select(PushSubscription).where(
                func.lower(PushSubscription.city) == city.strip().lower()
            )
        ).all()
    )

    payload = json.dumps(
        {
            "title": "ClearAid",
            "body": alert_title,
            "severity": severity,
            "status": status,
            "icon": _icon_for(severity, status),
            "url": url,
        }
    )
    vapid_claims = {"sub": settings.vapid_subject}
    sent = 0
    stale: list[str] = []

    for sub in subs:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=payload,
                vapid_private_key=settings.vapid_private_key,
                vapid_claims=dict(vapid_claims),
            )
            sent += 1
        except WebPushException as exc:  # noqa: PERF203
            status = getattr(getattr(exc, "response", None), "status_code", None)
            if status in (404, 410):
                stale.append(sub.endpoint)
            else:
                logger.debug("Push failed (%s): %s", status, exc)
        except Exception as exc:  # noqa: BLE001
            logger.debug("Push error: %s", exc)

    if stale:
        db.execute(delete(PushSubscription).where(PushSubscription.endpoint.in_(stale)))
        db.commit()

    return sent
