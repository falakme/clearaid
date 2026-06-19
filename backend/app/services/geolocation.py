"""Best-effort IP geolocation for location-aware resource recommendations.

This NEVER raises: any failure (bad IP, timeout, upstream error) returns an
empty string so the translation pipeline is never blocked by geolocation.

SECURITY (S4): the client IP arrives from a client-controllable header
(`X-Forwarded-For`). We validate it as a real, public IP address with the
stdlib `ipaddress` module before interpolating it into the upstream URL, which
prevents path/URL injection and avoids leaking private addresses.
"""

from __future__ import annotations

import ipaddress

import httpx

# ip-api.com offers HTTPS on its paid tier only; the public endpoint is HTTP.
# Override via settings/env in production with an HTTPS provider (see review S5).
_GEO_ENDPOINT = "http://ip-api.com/json/{ip}"


def _is_public_ip(value: str | None) -> bool:
    """True only for a syntactically valid, globally routable IP address."""
    if not value:
        return False
    try:
        ip = ipaddress.ip_address(value.strip())
    except ValueError:
        return False
    return not (ip.is_private or ip.is_loopback or ip.is_reserved or ip.is_link_local)


async def resolve_location(client_ip: str | None) -> str:
    """Return "City, Region, CC" for a public IP, or "" on any failure."""
    if not _is_public_ip(client_ip):
        return ""

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(_GEO_ENDPOINT.format(ip=client_ip.strip()))
        if resp.status_code != 200:
            return ""
        data = resp.json()
    except (httpx.HTTPError, ValueError):
        return ""

    if not isinstance(data, dict) or data.get("status") != "success":
        return ""

    parts = [str(data.get(k, "")).strip() for k in ("city", "regionName", "countryCode")]
    return ", ".join(p for p in parts if p)
