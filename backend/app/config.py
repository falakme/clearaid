"""Application configuration loaded from environment variables.

IMPORTANT: This backend never stores PII. The database holds only mocked,
non-personal disaster alerts. User profile data (ZIP, family size) lives
exclusively in the browser's localStorage.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database (non-PII alerts only).
    # Defaults to localhost for local `uvicorn` runs; docker-compose overrides
    # this with the `db` service hostname via the DATABASE_URL env var.
    database_url: str = (
        "postgresql+psycopg://clearaid:clearaid_dev_pw@localhost:5432/clearaid"
    )

    # NVIDIA Build API
    nvidia_api_key: str = ""
    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1"
    nvidia_model: str = "google/gemma-3n-e4b-it"

    # Security / CORS
    cors_origins: str = "http://localhost:3000"
    admin_api_key: str = "clearaid_admin_dev_key"

    # Max size (MB) for an uploaded document (PDF/image) before OCR.
    max_upload_mb: int = 10

    # Brave Search API — used as a recommendation engine to surface official
    # government relief / recovery links for an active alert's city.
    brave_api_key: str = ""
    brave_base_url: str = "https://api.search.brave.com/res/v1/web/search"

    # Web Push (VAPID). Generate a keypair once and set these. When empty,
    # push is disabled gracefully (subscriptions are still accepted/stored).
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    # "mailto:" subject required by the Web Push spec.
    vapid_subject: str = "mailto:admin@clearaid.app"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
