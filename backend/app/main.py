"""ClearAid FastAPI application entrypoint."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.config import get_settings
from app.database import Base, engine
from app.routers import alerts, health, translate
from app.seed import seed

logger = logging.getLogger("clearaid")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables and seed non-PII demo alerts on startup.
    # Never block startup if the DB is unreachable — the core /api/translate-form
    # endpoint does not need a database, so the API should still come up.
    try:
        Base.metadata.create_all(bind=engine)
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


@app.get("/", tags=["system"])
def root() -> dict[str, str]:
    return {"service": "clearaid-backend", "docs": "/docs"}
