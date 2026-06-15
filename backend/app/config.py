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

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
