"""Seed the database with mocked, non-PII disaster alerts.

Idempotent: only inserts the demo alerts if the table is empty.
"""

from sqlalchemy import select

from app.database import SessionLocal
from app.models import Alert

SEED_ALERTS = [
    {
        "zip_code": "77001",
        "title": "Hurricane warning lifted",
        "message": "The hurricane warning for your area has been lifted. 3 aid programs are now open for ZIP 77001.",
        "severity": "success",
        "programs_open": 3,
    },
    {
        "zip_code": "70112",
        "title": "Flood recovery assistance open",
        "message": "Federal flood recovery assistance is now accepting applications for ZIP 70112.",
        "severity": "info",
        "programs_open": 2,
    },
]


def seed() -> None:
    db = SessionLocal()
    try:
        existing = db.scalar(select(Alert).limit(1))
        if existing is not None:
            return
        for data in SEED_ALERTS:
            db.add(Alert(**data))
        db.commit()
    finally:
        db.close()


def insert_demo_alerts(db) -> int:
    """Insert the demo alert set into the given session. Returns count added."""
    count = 0
    for data in SEED_ALERTS:
        db.add(Alert(**data))
        count += 1
    db.commit()
    return count
