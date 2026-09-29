from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ── Existing schemas (BACKWARD COMPATIBLE) ────────────────────

class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    referral_code: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Enhanced user response — extra fields are Optional so old tokens still work."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: str
    avatar_url: Optional[str] = None
    is_verified: Optional[bool] = False
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    timezone: Optional[str] = "Asia/Kolkata"
    language: Optional[str] = "en"
    theme: Optional[str] = "dark"
    notification_enabled: Optional[bool] = True
    subscription_plan: Optional[str] = "free"
    premium_until: Optional[datetime] = None


class TokenResponse(BaseModel):
    """Enhanced — now includes refresh_token."""
    access_token: str
    refresh_token: str = ""
    token_type: str = "bearer"
    role: str
    expires_in: int = 3600  # seconds


# ── Phase 2 — New Request Schemas ─────────────────────────────

class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8, max_length=128)


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    avatar_url: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    theme: Optional[str] = None
    notification_enabled: Optional[bool] = None


class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


# ── Phase 2 — Response Schemas ────────────────────────────────

class ActivityLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    action: str
    ip_address: Optional[str] = None
    device: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None
    details: Optional[str] = None
    created_at: Optional[datetime] = None


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    device_name: Optional[str] = None
    device_type: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None
    ip_address: Optional[str] = None
    location: Optional[str] = None
    last_active: Optional[datetime] = None
    created_at: Optional[datetime] = None
    is_current: bool = False


class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None
