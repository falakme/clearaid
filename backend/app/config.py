"""Application configuration loaded from environment variables.

PRIVACY: ClarityAI is a stateless, in-memory translation service. It persists
nothing — there is no database. Uploaded documents and typed context exist
only for the lifetime of a single request.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # NVIDIA Build API (cognitive engine).
    nvidia_api_key: str = ""
    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1"
    nvidia_model: str = "google/gemma-3n-e4b-it"

    # CORS — only needed when the browser calls the backend directly.
    cors_origins: str = "http://localhost:3000"

    # Max size (MB) for an uploaded document (PDF/image) before OCR.
    max_upload_mb: int = 10

    # Brave Search API — powers the agentic "Verified Local Support"
    # recommendation engine. When empty, recommendations are skipped gracefully.
    brave_api_key: str = ""
    brave_base_url: str = "https://api.search.brave.com/res/v1/web/search"

    # Microsoft Azure Cognitive Services — Text-to-Speech (neural voices).
    # When empty, the frontend gracefully falls back to the browser's built-in
    # Web Speech synthesis, so read-aloud always works.
    azure_tts_key: str = ""
    azure_tts_endpoint: str = (
        "https://centralindia.tts.speech.microsoft.com/cognitiveservices/v1"
    )
    # A premium, natural-sounding neutral English voice. Read-aloud is English-only.
    azure_tts_voice: str = "en-US-JennyNeural"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
