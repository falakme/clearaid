"""ClearAid FastAPI application entrypoint.

Direction A: Crisis-to-Action Translator. A stateless service that turns
dense administrative, legal, and financial documents into a structured,
plain-language workspace. No database, no persistence — documents live only
in memory for the duration of a request.
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.config import get_settings
from app.routers import health, translate, tts

settings = get_settings()

app = FastAPI(
    title="ClearAid API",
    description=(
        "Crisis-to-Action translator backend. Stateless: it stores nothing. "
        "Documents are processed in memory and never persisted."
    ),
    version=__version__,
)

cors_origins_env = os.getenv("CORS_ORIGINS")
if cors_origins_env is not None:
    origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
else:
    origins = settings.cors_origins_list

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(translate.router)
app.include_router(tts.router)


@app.get("/", tags=["system"])
def root() -> dict[str, str]:
    return {"service": "clearaid-backend", "docs": "/docs"}
