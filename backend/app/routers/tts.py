"""Text-to-Speech endpoint (Microsoft Azure Cognitive Services proxy).

POST /api/tts  — synthesize a neutral English neural voice for the supplied
                 text and stream back MP3 audio. English-only by design.

Returns HTTP 503 when AZURE_TTS_KEY is not configured so the frontend can fall
back to the browser's built-in Web Speech synthesis; 502 on upstream failure.
Like the rest of ClarityAI, this endpoint is stateless and persists nothing.
"""

from fastapi import APIRouter, HTTPException, Request, Response

from app.ratelimit import limiter
from app.schemas import TtsRequest
from app.services.azure_tts import (
    AzureTtsConfigError,
    AzureTtsUpstreamError,
    synthesize_speech,
)

router = APIRouter(tags=["tts"])


@router.post("/api/tts")
@limiter.limit("30/minute")
async def tts(request: Request, payload: TtsRequest) -> Response:
    """Synthesize speech audio (MP3) from text using Azure neural TTS."""
    try:
        audio = await synthesize_speech(payload.text)
    except AzureTtsConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except AzureTtsUpstreamError:
        # Details are kept in server logs; the client gets a generic message (S6).
        raise HTTPException(status_code=502, detail="Text-to-speech is unavailable right now.")

    return Response(
        content=audio,
        media_type="audio/mpeg",
        headers={"Cache-Control": "no-store"},
    )
