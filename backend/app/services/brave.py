"""Brave Search integration — recommendation engine for official relief links.

Given an active alert's city and disaster type, queries Brave Search for
official government (.gov) resources. In emergency mode it looks for immediate
relief applications; in recovery mode (a resolved alert) it looks for
long-term recovery grants.

Gracefully returns an empty list when no API key is configured or the upstream
errors — recommendations are an enhancement, never a hard dependency.
"""

from __future__ import annotations

import httpx

from app.config import get_settings
from app.schemas import Recommendation


def build_query(city: str, region: str, disaster: str, mode: str) -> str:
    """Compose a Brave query biased toward official government sources."""
    intent = (
        "long-term recovery grants"
        if mode == "recovery"
        else "emergency relief application"
    )
    place = " ".join(p for p in [city, region] if p).strip()
    disaster = (disaster or "disaster").strip()
    # e.g. "FEMA hurricane relief application Dallas Texas site:.gov"
    return f"FEMA {disaster} {intent} {place} site:.gov".strip()


async def search_recommendations(
    city: str,
    region: str = "",
    disaster: str = "",
    mode: str = "relief",
    count: int = 6,
) -> tuple[str, list[Recommendation]]:
    """Return (query, results). Empty results if Brave isn't configured."""
    settings = get_settings()
    query = build_query(city, region, disaster, mode)

    if not settings.brave_api_key:
        return query, []

    headers = {
        "Accept": "application/json",
        "X-Subscription-Token": settings.brave_api_key,
    }
    params = {"q": query, "count": count, "result_filter": "web"}

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.get(settings.brave_base_url, headers=headers, params=params)
        if resp.status_code >= 400:
            return query, []
        body = resp.json()
    except (httpx.HTTPError, ValueError):
        return query, []

    results: list[Recommendation] = []
    for item in (body.get("web", {}) or {}).get("results", []) or []:
        url = str(item.get("url", "")).strip()
        title = str(item.get("title", "")).strip()
        if not url or not title:
            continue
        results.append(
            Recommendation(
                title=title,
                url=url,
                description=str(item.get("description", "")).strip(),
            )
        )
        if len(results) >= count:
            break

    return query, results
