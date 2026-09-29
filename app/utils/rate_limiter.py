"""In-memory sliding window rate limiter. No Redis dependency."""

from __future__ import annotations

import time
from collections import defaultdict
from threading import Lock

from fastapi import HTTPException, Request, status

from app.utils.config import (
    LOGIN_RATE_LIMIT,
    LOGIN_RATE_WINDOW,
    API_RATE_LIMIT,
    API_RATE_WINDOW,
)


class SlidingWindowRateLimiter:
    """Thread-safe sliding window rate limiter."""

    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def _clean_expired(self, key: str, now: float) -> None:
        cutoff = now - self.window_seconds
        self._requests[key] = [
            t for t in self._requests[key] if t > cutoff
        ]

    def is_allowed(self, key: str) -> bool:
        """Check if a request is allowed. If yes, record it."""
        now = time.time()
        with self._lock:
            self._clean_expired(key, now)
            if len(self._requests[key]) >= self.max_requests:
                return False
            self._requests[key].append(now)
            return True

    def remaining(self, key: str) -> int:
        """Return remaining requests in current window."""
        now = time.time()
        with self._lock:
            self._clean_expired(key, now)
            return max(0, self.max_requests - len(self._requests[key]))

    def reset_time(self, key: str) -> float:
        """Seconds until the oldest request in window expires."""
        now = time.time()
        with self._lock:
            self._clean_expired(key, now)
            if not self._requests[key]:
                return 0
            oldest = min(self._requests[key])
            return max(0, self.window_seconds - (now - oldest))


# ── Singleton instances ───────────────────────────────────────
login_limiter = SlidingWindowRateLimiter(LOGIN_RATE_LIMIT, LOGIN_RATE_WINDOW)
api_limiter = SlidingWindowRateLimiter(API_RATE_LIMIT, API_RATE_WINDOW)


def get_client_ip(request: Request) -> str:
    """Extract client IP from request, respecting X-Forwarded-For."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def check_login_rate_limit(request: Request) -> None:
    """Raise 429 if login rate limit exceeded."""
    ip = get_client_ip(request)
    if not login_limiter.is_allowed(ip):
        retry_after = int(login_limiter.reset_time(ip)) + 1
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many login attempts. Try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)},
        )


def check_api_rate_limit(request: Request) -> None:
    """Raise 429 if API rate limit exceeded."""
    ip = get_client_ip(request)
    if not api_limiter.is_allowed(ip):
        retry_after = int(api_limiter.reset_time(ip)) + 1
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)},
        )
