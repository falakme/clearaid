"""Shared rate limiter (slowapi).

Defined in its own module so both `main.py` (which registers the limiter and
the 429 handler on the app) and the routers (which decorate endpoints) can
import the same instance without a circular import.

NOTE: behind the Next.js same-origin proxy the backend sees the proxy's IP, so
these limits act as an aggregate cap that protects against runaway cost / DoS
on the paid upstreams (NVIDIA, Brave, Azure). For true per-user limits, also
rate limit at the proxy/edge using the real client IP.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
