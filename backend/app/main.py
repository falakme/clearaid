"""ClearAid FastAPI application entrypoint."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app import __version__
from app.config import get_settings
from app.database import Base, engine
from app.routers import alerts, er_teams, health, push, recommendations, translate
from app.seed import seed

logger = logging.getLogger("clearaid")


def _ensure_area_columns() -> None:
    """Add newer columns to pre-existing tables.

    `create_all` creates missing TABLES but never alters existing ones, so
    databases created before these features need the columns backfilled.
    Idempotent and safe to run on every startup (Postgres ADD COLUMN IF NOT
    EXISTS). New tables (er_teams, push_subscriptions) are handled by
    create_all itself.
    """
    statements = [
        "ALTER TABLE alerts ADD COLUMN IF NOT EXISTS city VARCHAR(120) NOT NULL DEFAULT ''",
        "ALTER TABLE alerts ADD COLUMN IF NOT EXISTS region VARCHAR(120) NOT NULL DEFAULT ''",
        "ALTER TABLE alerts ADD COLUMN IF NOT EXISTS country VARCHAR(120) NOT NULL DEFAULT ''",
        "ALTER TABLE alerts ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'",
        "ALTER TABLE alerts ALTER COLUMN zip_code DROP NOT NULL",
        "CREATE INDEX IF NOT EXISTS ix_alerts_city ON alerts (lower(city))",
        "CREATE INDEX IF NOT EXISTS ix_alerts_status ON alerts (status)",
    ]
    with engine.begin() as conn:
        for sql in statements:
            try:
                conn.execute(text(sql))
            except Exception as exc:  # noqa: BLE001
                logger.debug("Skipping migration step (%s): %s", exc.__class__.__name__, sql)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables and seed non-PII demo alerts on startup.
    # Never block startup if the DB is unreachable — the core /api/translate-form
    # endpoint does not need a database, so the API should still come up.
    try:
        Base.metadata.create_all(bind=engine)
        _ensure_area_columns()
        seed()
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Could not reach the database at startup (%s). The API will still "
            "start, but alert endpoints will fail until Postgres is available. "
            "Tip: run `docker compose up db` or point DATABASE_URL at a running "
            "Postgres instance.",
            exc.__class__.__name__,
        )
    yield


settings = get_settings()

app = FastAPI(
    title="ClearAid API",
    description=(
        "Crisis-to-Action translator backend. Stores only non-PII disaster "
        "alerts; user profile data lives exclusively in the browser."
    ),
    version=__version__,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(alerts.router)
app.include_router(translate.router)
app.include_router(er_teams.router)
app.include_router(recommendations.router)
app.include_router(push.router)


@app.get("/", tags=["system"])
def root() -> dict[str, str]:
    return {"service": "clearaid-backend", "docs": "/docs"}
