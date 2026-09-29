"""Production auth routes — all existing endpoints preserved, new endpoints added."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.schemas.user_schema import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    MessageResponse,
    ProfileUpdateRequest,
    RefreshTokenRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserCreate,
    UserResponse,
    VerifyEmailRequest,
    ActivityLogResponse,
    SessionResponse,
)
from app.services.auth_service import (
    change_password,
    forgot_password,
    get_user_activity,
    get_user_sessions,
    login_user,
    logout_user,
    refresh_access_token,
    resend_verification,
    reset_password,
    revoke_session,
    signup_user,
    update_profile,
    verify_user_email,
)
from app.utils.jwt_handler import get_current_user
from app.utils.rate_limiter import check_login_rate_limit

router = APIRouter(prefix="/api/auth", tags=["Auth"])


# ══════════════════════════════════════════════════════════════
# EXISTING ENDPOINTS (BACKWARD COMPATIBLE)
# ══════════════════════════════════════════════════════════════


@router.post(
    "/signup",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user account",
    description="Register a new user account with email, name, and password. "
    "Sends a verification email and welcome email.",
)
def signup(user: UserCreate, request: Request, db: Session = Depends(get_db)):
    created_user = signup_user(db, user, request)
    return created_user


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate a user",
    description="Authenticate with email and password to receive JWT access token and refresh token. "
    "Rate limited to 5 attempts per minute per IP.",
)
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    remember_me: bool = Query(False, description="Extend session to 28 days"),
):
    check_login_rate_limit(request)
    return login_user(db, form_data.username, form_data.password, request, remember_me)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user",
    description="Return the authenticated user's profile data.",
)
def get_me(current_user=Depends(get_current_user)):
    return current_user


# ══════════════════════════════════════════════════════════════
# PHASE 2 — NEW ENDPOINTS
# ══════════════════════════════════════════════════════════════


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token",
    description="Exchange a valid refresh token for a new access token and rotated refresh token.",
)
def refresh(
    payload: RefreshTokenRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    return refresh_access_token(db, payload.refresh_token, request)


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Secure logout",
    description="Revoke the current refresh token and deactivate the session. "
    "If no refresh_token is provided, revokes ALL sessions.",
)
def logout(
    request: Request,
    payload: Optional[RefreshTokenRequest] = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    refresh_token = payload.refresh_token if payload else None
    return logout_user(db, current_user, refresh_token, request)


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Request password reset",
    description="Send a password reset email. Does not reveal whether the email exists.",
)
def forgot_pw(
    payload: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    return forgot_password(db, payload.email, request)


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Reset password",
    description="Set a new password using the token from the password reset email.",
)
def reset_pw(
    payload: ResetPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    return reset_password(db, payload.token, payload.new_password, request)


@router.post(
    "/change-password",
    response_model=MessageResponse,
    summary="Change password",
    description="Change the authenticated user's password. Requires old password.",
)
def change_pw(
    payload: ChangePasswordRequest,
    request: Request,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return change_password(db, current_user, payload.old_password, payload.new_password, request)


@router.put(
    "/profile",
    response_model=UserResponse,
    summary="Update profile",
    description="Update user profile: name, avatar, timezone, language, theme, notifications.",
)
def update_user_profile(
    payload: ProfileUpdateRequest,
    request: Request,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_profile(db, current_user, payload, request)


@router.post(
    "/verify-email",
    response_model=MessageResponse,
    summary="Verify email address",
    description="Verify the user's email address using the token from the verification email.",
)
def verify_email(
    payload: VerifyEmailRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    return verify_user_email(db, payload.token, request)


@router.post(
    "/resend-verification",
    response_model=MessageResponse,
    summary="Resend verification email",
    description="Resend the email verification link.",
)
def resend_verify(
    payload: ResendVerificationRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    return resend_verification(db, payload.email, request)


@router.get(
    "/activity",
    response_model=list[ActivityLogResponse],
    summary="Get activity log",
    description="Return the authenticated user's activity history.",
)
def get_activity(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_user_activity(db, current_user, limit, offset)


@router.get(
    "/sessions",
    response_model=list[SessionResponse],
    summary="List active sessions",
    description="Return all active sessions for the authenticated user across devices.",
)
def list_sessions(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_user_sessions(db, current_user)


@router.delete(
    "/sessions/{session_id}",
    response_model=MessageResponse,
    summary="Revoke a session",
    description="Revoke a specific session (logs out that device).",
)
def delete_session(
    session_id: int,
    request: Request,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return revoke_session(db, current_user, session_id, request)
