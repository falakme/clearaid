"""Recommendation endpoint backed by Brave Search.

Surfaces official government relief (active alert) or long-term recovery
grant (resolved alert) links for a city + disaster type. Public read.
"""

from typing import Optional

from fastapi import APIRouter, Query

from app.schemas import RecommendationsOut
from app.services.brave import search_recommendations

router = APIRouter(tags=["recommendations"])


@router.get("/api/recommendations", response_model=RecommendationsOut)
async def recommendations(
    city: str = Query(..., description="City to find official relief links for."),
    region: Optional[str] = Query(default=""),
    disaster: Optional[str] = Query(default="", description="Disaster type / alert title."),
    mode: str = Query(default="relief", pattern="^(relief|recovery)$"),
) -> RecommendationsOut:
    query, results = await search_recommendations(
        city=city.strip(),
        region=(region or "").strip(),
        disaster=(disaster or "").strip(),
        mode=mode,
    )
    return RecommendationsOut(mode=mode, query=query, results=results)
