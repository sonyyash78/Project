"""Central exception handling and security utilities."""

from __future__ import annotations

import re
import time
import uuid

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.utils.config import MIN_PASSWORD_LENGTH
from app.utils.logger import logger


# ── Global Exception Handler ──────────────────────────────────

def register_exception_handlers(app: FastAPI) -> None:
    """Register global exception handlers on the FastAPI app."""

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        """Catch all unhandled exceptions and return consistent JSON."""
        request_id = getattr(request.state, "request_id", "unknown")
        logger.error(
            f"[{request_id}] Unhandled exception on {request.method} {request.url.path}: {exc}",
            exc_info=True,
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": "An internal server error occurred.",
                "request_id": request_id,
            },
        )

    @app.exception_handler(404)
    async def not_found_handler(request: Request, exc):
        return JSONResponse(
            status_code=404,
            content={"detail": "The requested resource was not found."},
        )


# ── Request Middleware ────────────────────────────────────────

def register_middleware(app: FastAPI) -> None:
    """Register request-level middleware for logging and security headers."""

    @app.middleware("http")
    async def request_middleware(request: Request, call_next):
        # Assign request ID
        request_id = str(uuid.uuid4())[:8]
        request.state.request_id = request_id

        start_time = time.time()

        response = await call_next(request)

        # Response time logging
        duration_ms = round((time.time() - start_time) * 1000, 2)
        logger.info(
            f"[{request_id}] {request.method} {request.url.path} "
            f"→ {response.status_code} ({duration_ms}ms)"
        )

        # Security headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

        return response


# ── Password Strength Validation ──────────────────────────────

def validate_password_strength(password: str) -> tuple[bool, str]:
    """Validate password meets security requirements.

    Returns (is_valid, error_message).
    """
    if len(password) < MIN_PASSWORD_LENGTH:
        return False, f"Password must be at least {MIN_PASSWORD_LENGTH} characters long."

    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter."

    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter."

    if not re.search(r"\d", password):
        return False, "Password must contain at least one digit."

    return True, ""


# ── User-Agent Parser (lightweight) ───────────────────────────

def parse_user_agent(ua_string: str | None) -> dict:
    """Extract basic device/browser/OS info from User-Agent string."""
    if not ua_string:
        return {"device": "Unknown", "browser": "Unknown", "os": "Unknown"}

    ua = ua_string.lower()

    # Device
    if "mobile" in ua or "android" in ua and "tablet" not in ua:
        device_type = "Mobile"
    elif "tablet" in ua or "ipad" in ua:
        device_type = "Tablet"
    else:
        device_type = "Desktop"

    # Browser
    if "edg/" in ua:
        browser = "Edge"
    elif "chrome" in ua and "edg" not in ua:
        browser = "Chrome"
    elif "firefox" in ua:
        browser = "Firefox"
    elif "safari" in ua and "chrome" not in ua:
        browser = "Safari"
    else:
        browser = "Other"

    # OS
    if "windows" in ua:
        os_name = "Windows"
    elif "mac os" in ua or "macintosh" in ua:
        os_name = "macOS"
    elif "linux" in ua and "android" not in ua:
        os_name = "Linux"
    elif "android" in ua:
        os_name = "Android"
    elif "iphone" in ua or "ipad" in ua:
        os_name = "iOS"
    else:
        os_name = "Other"

    # Build readable device name
    device_name = f"{browser} on {os_name}"

    return {
        "device": device_name,
        "device_type": device_type,
        "browser": browser,
        "os": os_name,
    }
