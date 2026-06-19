"""Follow-up chat endpoint.

POST /api/chat — answer a user's follow-up question about a document ClarityAI
has already analyzed. Stateless: the client sends the document context and the
prior conversation turns on every request; the backend keeps no state.

Like the rest of ClarityAI, this never submits or files anything — it only
explains and organizes.
"""

from fastapi import APIRouter, HTTPException, Request

from app.ratelimit import limiter
from app.schemas import ChatRequest, ChatResponse
from app.services.nvidia import NvidiaConfigError, NvidiaUpstreamError, chat as chat_model

router = APIRouter(tags=["chat"])


@router.post("/api/chat", response_model=ChatResponse)
@limiter.limit("30/minute")
async def chat(request: Request, payload: ChatRequest) -> ChatResponse:
    """Answer a follow-up question grounded in the analyzed document."""
    try:
        answer = await chat_model(
            question=payload.question,
            document_brief=payload.document_brief,
            document_explanation=payload.document_explanation,
            source_text=payload.source_text,
            history=payload.history,
            language=payload.language,
            detected_location=payload.detected_location,
        )
    except NvidiaConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except NvidiaUpstreamError:
        # Details are logged server-side; the client gets a generic message.
        raise HTTPException(
            status_code=502,
            detail="ClarityAI had trouble answering that. Please try again.",
        )

    return ChatResponse(answer=answer)
