"""Microsoft Azure Cognitive Services — Text-to-Speech integration.

Synthesizes a premium neural voice by POSTing SSML to the Azure
`/cognitiveservices/v1` endpoint and streaming back MP3 audio. The voice and
SSML locale are chosen to MATCH the document's output language, so read-aloud
pronounces Hindi, Arabic, Chinese, etc. correctly instead of reading non-Latin
text with an English voice (which skips the words and only speaks digits).

Authentication uses the subscription-key header (`Ocp-Apim-Subscription-Key`),
which the v1 endpoint accepts directly. When no key is configured the caller
should fall back to the browser's Web Speech synthesis.
"""

from __future__ import annotations

from xml.sax.saxutils import escape

import httpx

from app.config import get_settings

# 24 kHz mono MP3 — small, widely supported by the browser <audio> element.
_OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3"

# Per-language Azure neural voice + SSML locale, keyed by dictionary code.
# These cover the languages offered in the selector.
_VOICES: dict[str, tuple[str, str]] = {
    "en": ("en-US", "en-US-JennyNeural"),
    "es": ("es-ES", "es-ES-ElviraNeural"),
    "fr": ("fr-FR", "fr-FR-DeniseNeural"),
    "ar": ("ar-EG", "ar-EG-SalmaNeural"),
    "zh": ("zh-CN", "zh-CN-XiaoxiaoNeural"),
    "hi": ("hi-IN", "hi-IN-SwaraNeural"),
}

# Accept either the human-readable language name (what the UI sends) or a code.
_LANG_TO_CODE: dict[str, str] = {
    "english": "en", "en": "en",
    "spanish": "es", "es": "es", "español": "es", "espanol": "es",
    "french": "fr", "fr": "fr", "français": "fr", "francais": "fr",
    "arabic": "ar", "ar": "ar", "عربي": "ar",
    "chinese (simplified)": "zh", "chinese": "zh", "zh": "zh", "中文": "zh",
    "hindi": "hi", "hi": "hi", "हिन्दी": "hi",
}


class AzureTtsConfigError(RuntimeError):
    """Raised when the Azure TTS key is not configured."""


class AzureTtsUpstreamError(RuntimeError):
    """Raised when the Azure TTS endpoint returns an error."""


def _lang_code(language: str) -> str:
    """Resolve a language name (or code) to a known dictionary code."""
    return _LANG_TO_CODE.get((language or "").strip().lower(), "en")


def _build_ssml(text: str, voice: str, locale: str) -> str:
    """Wrap the (escaped) text in SSML for the chosen neural voice + locale."""
    safe = escape(text)
    return (
        f'<speak version="1.0" xml:lang="{locale}">'
        f'<voice xml:lang="{locale}" name="{voice}">{safe}</voice>'
        f"</speak>"
    )


async def synthesize_speech(text: str, language: str = "") -> bytes:
    """Return MP3 audio bytes for `text`, voiced in `language`, using Azure TTS.

    Raises AzureTtsConfigError if unconfigured, AzureTtsUpstreamError on
    upstream failure.
    """
    settings = get_settings()
    if not settings.azure_tts_key:
        raise AzureTtsConfigError("AZURE_TTS_KEY is not set.")

    cleaned = (text or "").strip()
    if not cleaned:
        raise AzureTtsUpstreamError("No text to synthesize.")
    # Bound the request so a huge explanation can't run unbounded.
    cleaned = cleaned[:6000]

    code = _lang_code(language)
    locale, voice = _VOICES.get(code, _VOICES["en"])
    # Allow an explicit English voice override from configuration.
    if code == "en" and settings.azure_tts_voice:
        voice = settings.azure_tts_voice

    headers = {
        "Ocp-Apim-Subscription-Key": settings.azure_tts_key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": _OUTPUT_FORMAT,
        "User-Agent": "clarityai",
    }
    ssml = _build_ssml(cleaned, voice, locale)

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                settings.azure_tts_endpoint, content=ssml.encode("utf-8"), headers=headers
            )
    except httpx.HTTPError as exc:
        raise AzureTtsUpstreamError(f"Could not reach Azure TTS: {exc}") from exc

    if resp.status_code >= 400:
        raise AzureTtsUpstreamError(
            f"Azure TTS error {resp.status_code}: {resp.text[:300]}"
        )

    return resp.content
