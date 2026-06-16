"""ORM models.

Only non-PII disaster alert data is stored. No user names, addresses, IDs,
or form contents are ever persisted here.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Alert(Base):
    """A mocked, non-personal disaster / aid-availability alert."""

    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Geographic targeting by area (non-PII, public information). We target by
    # city/region/country derived from coarse geolocation — never by exact
    # coordinates or any personal address.
    city: Mapped[str] = mapped_column(String(120), index=True, default="")
    region: Mapped[str] = mapped_column(String(120), default="")
    country: Mapped[str] = mapped_column(String(120), default="")
    # Optional, legacy ZIP targeting (kept for backward compatibility).
    zip_code: Mapped[str] = mapped_column(String(16), index=True, default="")

    title: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(Text)

    # info | warning | success
    severity: Mapped[str] = mapped_column(String(20), default="info")

    # Number of aid programs newly open (for the dashboard banner).
    programs_open: Mapped[int] = mapped_column(Integer, default=0)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)

    # Lifecycle state: "active" (emergency) | "resolved" (recovery phase).
    # Distinct from is_active (which hides an alert entirely). A resolved alert
    # is still shown to residents, but flips the UI to the green recovery mode.
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class ErTeam(Base):
    """An emergency-response team, created by a System Admin and assigned to a
    specific city. ER team members trigger localized alerts for their city.

    Non-PII: stores only an organisation name, the assigned city, and the
    Clerk user id of the responder (nullable until they register/are linked).
    """

    __tablename__ = "er_teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Nullable until the responder registers and the admin links their account.
    clerk_user_id: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True, index=True
    )

    org_name: Mapped[str] = mapped_column(String(160))
    assigned_city: Mapped[str] = mapped_column(String(120), index=True)
    # Region/country kept so the assigned area matches residents' detected area.
    region: Mapped[str] = mapped_column(String(120), default="")
    country: Mapped[str] = mapped_column(String(120), default="")

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class PushSubscription(Base):
    """A browser Web Push subscription, scoped to a city so we only notify
    residents of the relevant area. Non-PII (opaque push endpoint + keys)."""

    __tablename__ = "push_subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    endpoint: Mapped[str] = mapped_column(Text, unique=True)
    p256dh: Mapped[str] = mapped_column(String(255))
    auth: Mapped[str] = mapped_column(String(255))
    city: Mapped[str] = mapped_column(String(120), index=True, default="")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
