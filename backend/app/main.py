"""ClarityAI FastAPI application entrypoint.

Direction A: Crisis-to-Action Translator. A stateless service that turns
dense administrative, legal, and financial documents into a structured,
plain-language workspace. No database, no persistence — documents live only
in memory for the duration of a request.
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app import __version__
from app.config import get_settings
from app.ratelimit import limiter
from app.routers import health, translate, tts

settings = get_settings()

app = FastAPI(
    title="ClarityAI API",
    description=(
        "Crisis-to-Action translator backend. Stateless: it stores nothing. "
        "Documents are processed in memory and never persisted."
    ),
    version=__version__,
)

# Rate limiting (slowapi) — protects the paid upstreams from abuse / runaway
# cost. Endpoints opt in via @limiter.limit(...); over-limit returns HTTP 429.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

cors_origins_env = os.getenv("CORS_ORIGINS")
if cors_origins_env is not None:
    origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
else:
    origins = settings.cors_origins_list

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    # No cookies/auth are used (the same-origin proxy holds all secrets), so
    # credentials must stay off and the surface stays minimal (S9).
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.include_router(health.router)
app.include_router(translate.router)
app.include_router(tts.router)


@app.get("/", tags=["system"])
def root() -> dict[str, str]:
    return {"service": "clarityai-backend", "docs": "/docs"}
