"""Production authentication service — handles all auth business logic."""

from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session

from app.models.user_model import User
from app.models.token_model import RefreshToken
from app.models.activity_model import (
    ActivityLog,
    UserSession,
    PasswordResetToken,
    EmailVerificationToken,
)
from app.schemas.user_schema import UserCreate, ProfileUpdateRequest
from app.utils.jwt_handler import (
    create_access_token,
    generate_refresh_token,
    hash_token,
    get_refresh_token_expiry,
    create_reset_token,
    verify_reset_token,
    create_verification_token,
    verify_email_token,
)
from app.utils.password_hash import hash_password, verify_password
from app.utils.exceptions import validate_password_strength, parse_user_agent
from app.utils.email import (
    send_password_reset_email,
    send_verification_email,
    send_welcome_email,
)
from app.utils.rate_limiter import get_client_ip
from app.utils.config import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
    ACCOUNT_LOCK_ATTEMPTS,
    ACCOUNT_LOCK_MINUTES,
)
from app.utils.logger import logger, security_logger


# ── Activity Logging ──────────────────────────────────────────

def log_activity(
    db: Session,
    user_id: int | None,
    action: str,
    request: Request | None = None,
    details: str | None = None,
) -> None:
    """Log a user activity event."""
    try:
        ip = get_client_ip(request) if request else None
        ua_str = request.headers.get("user-agent") if request else None
        ua_info = parse_user_agent(ua_str)

        activity = ActivityLog(
            user_id=user_id,
            action=action,
            ip_address=ip,
            user_agent=ua_str,
            device=ua_info.get("device"),
            browser=ua_info.get("browser"),
            os=ua_info.get("os"),
            details=details,
        )
        db.add(activity)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to log activity: {e}")


# ── Session Management ────────────────────────────────────────

def create_session(
    db: Session,
    user_id: int,
    refresh_token_hash: str,
    request: Request | None = None,
) -> UserSession:
    """Create a session record for multi-device tracking."""
    ip = get_client_ip(request) if request else None
    ua_str = request.headers.get("user-agent") if request else None
    ua_info = parse_user_agent(ua_str)

    session = UserSession(
        user_id=user_id,
        session_token=refresh_token_hash,
        device_name=ua_info.get("device", "Unknown"),
        device_type=ua_info.get("device_type", "desktop"),
        browser=ua_info.get("browser", "Unknown"),
        os=ua_info.get("os", "Unknown"),
        ip_address=ip,
        is_active="true",
        last_active=datetime.utcnow(),
        expires_at=get_refresh_token_expiry(),
    )
    db.add(session)
    return session


# ── Signup ────────────────────────────────────────────────────

def signup_user(db: Session, user: UserCreate, request: Request | None = None):
    """Register a new user with validation."""

    # Check password strength
    is_valid, error_msg = validate_password_strength(user.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )

    # Check duplicate email
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists",
        )

    new_user = User(
        name=user.name,
        email=user.email,
        password=hash_password(user.password),
        role="user",
        is_verified=False,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    if user.referral_code:
        try:
            from app.services import referral_service
            referral_service.apply_referral_code(db, new_user.id, user.referral_code)
        except Exception as e:
            logger.error(f"Failed to apply referral code for new user {new_user.id}: {e}")

    # Send verification email
    try:
        token = create_verification_token(new_user.email)
        token_record = EmailVerificationToken(
            user_id=new_user.id,
            token_hash=hash_token(token),
            expires_at=datetime.utcnow() + timedelta(hours=24),
        )
        db.add(token_record)
        db.commit()
        send_verification_email(new_user.email, token)
    except Exception as e:
        logger.error(f"Failed to send verification email: {e}")

    # Send welcome email
    try:
        send_welcome_email(new_user.email, new_user.name)
    except Exception as e:
        logger.error(f"Failed to send welcome email: {e}")

    # Log activity
    log_activity(db, new_user.id, "signup", request, f"New account: {new_user.email}")
    security_logger.info(f"New signup: {new_user.email}")

    return new_user


# ── Login ─────────────────────────────────────────────────────

def login_user(
    db: Session,
    email: str,
    password: str,
    request: Request | None = None,
    remember_me: bool = False,
):
    """Authenticate user and return access + refresh tokens."""

    user = db.query(User).filter(User.email == email).first()

    if not user:
        security_logger.warning(f"Login failed — email not found: {email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Check account lock
    if user.locked_until and user.locked_until > datetime.utcnow():
        remaining = int((user.locked_until - datetime.utcnow()).total_seconds())
        security_logger.warning(f"Login blocked — account locked: {email}")
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=f"Account temporarily locked. Try again in {remaining} seconds.",
        )

    # Verify password
    if not verify_password(password, user.password):
        # Increment failed attempts
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        if user.failed_login_attempts >= ACCOUNT_LOCK_ATTEMPTS:
            user.locked_until = datetime.utcnow() + timedelta(minutes=ACCOUNT_LOCK_MINUTES)
            security_logger.critical(
                f"Account locked after {ACCOUNT_LOCK_ATTEMPTS} failed attempts: {email}"
            )
        db.commit()

        log_activity(db, user.id, "login_failed", request, "Invalid password")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Reset failed attempts on successful login
    user.failed_login_attempts = 0
    user.locked_until = None

    # Update login metadata
    ip = get_client_ip(request) if request else None
    user.last_login = datetime.utcnow()
    user.last_active = datetime.utcnow()
    user.last_login_ip = ip

    # Generate tokens
    access_token = create_access_token({"sub": user.email, "role": user.role})

    refresh_token_raw = generate_refresh_token()
    refresh_token_hashed = hash_token(refresh_token_raw)

    # Determine refresh token expiry (longer for remember_me)
    expire_days = REFRESH_TOKEN_EXPIRE_DAYS * 4 if remember_me else REFRESH_TOKEN_EXPIRE_DAYS

    # Store refresh token
    rt = RefreshToken(
        user_id=user.id,
        token_hash=refresh_token_hashed,
        device_name=parse_user_agent(
            request.headers.get("user-agent") if request else None
        ).get("device", "Unknown"),
        device_ip=ip,
        user_agent=request.headers.get("user-agent") if request else None,
        expires_at=datetime.utcnow() + timedelta(days=expire_days),
    )
    db.add(rt)

    # Create session
    create_session(db, user.id, refresh_token_hashed, request)

    db.commit()

    log_activity(db, user.id, "login", request, f"Successful login from {ip}")
    security_logger.info(f"Login: {email} from {ip}")

    return {
        "access_token": access_token,
        "refresh_token": refresh_token_raw,
        "token_type": "bearer",
        "role": user.role,
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


# ── Refresh Token ─────────────────────────────────────────────

def refresh_access_token(db: Session, refresh_token_raw: str, request: Request | None = None):
    """Rotate refresh token and issue new access token."""

    token_hashed = hash_token(refresh_token_raw)

    rt = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == token_hashed)
        .filter(RefreshToken.is_revoked == False)
        .first()
    )

    if not rt:
        security_logger.warning("Refresh token not found or revoked")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked refresh token",
        )

    if rt.expires_at < datetime.utcnow():
        rt.is_revoked = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired. Please log in again.",
        )

    user = db.query(User).filter(User.id == rt.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    # Rotate: revoke old, issue new
    rt.is_revoked = True

    new_refresh_raw = generate_refresh_token()
    new_refresh_hashed = hash_token(new_refresh_raw)

    new_rt = RefreshToken(
        user_id=user.id,
        token_hash=new_refresh_hashed,
        device_name=rt.device_name,
        device_ip=get_client_ip(request) if request else rt.device_ip,
        user_agent=request.headers.get("user-agent") if request else rt.user_agent,
        expires_at=get_refresh_token_expiry(),
    )
    db.add(new_rt)

    # Update session token
    session = (
        db.query(UserSession)
        .filter(UserSession.session_token == token_hashed)
        .first()
    )
    if session:
        session.session_token = new_refresh_hashed
        session.last_active = datetime.utcnow()

    user.last_active = datetime.utcnow()
    db.commit()

    new_access = create_access_token({"sub": user.email, "role": user.role})

    return {
        "access_token": new_access,
        "refresh_token": new_refresh_raw,
        "token_type": "bearer",
        "role": user.role,
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


# ── Logout ────────────────────────────────────────────────────

def logout_user(
    db: Session,
    user: User,
    refresh_token_raw: str | None = None,
    request: Request | None = None,
):
    """Revoke refresh token and deactivate session."""

    if refresh_token_raw:
        token_hashed = hash_token(refresh_token_raw)
        rt = (
            db.query(RefreshToken)
            .filter(RefreshToken.token_hash == token_hashed)
            .filter(RefreshToken.user_id == user.id)
            .first()
        )
        if rt:
            rt.is_revoked = True

        # Deactivate session
        session = (
            db.query(UserSession)
            .filter(UserSession.session_token == token_hashed)
            .first()
        )
        if session:
            session.is_active = "false"
    else:
        # Revoke ALL tokens for this user (full logout)
        db.query(RefreshToken).filter(
            RefreshToken.user_id == user.id,
            RefreshToken.is_revoked == False,
        ).update({"is_revoked": True})

        db.query(UserSession).filter(
            UserSession.user_id == user.id,
            UserSession.is_active == "true",
        ).update({"is_active": "false"})

    db.commit()
    log_activity(db, user.id, "logout", request)
    security_logger.info(f"Logout: {user.email}")

    return {"message": "Logged out successfully"}


# ── Forgot Password ───────────────────────────────────────────

def forgot_password(db: Session, email: str, request: Request | None = None):
    """Send password reset email."""

    user = db.query(User).filter(User.email == email).first()

    if not user:
        # Don't reveal if email exists
        return {"message": "If an account with that email exists, a reset link has been sent."}

    # Generate reset token
    reset_token = create_reset_token(email)
    token_record = PasswordResetToken(
        user_id=user.id,
        token_hash=hash_token(reset_token),
        expires_at=datetime.utcnow() + timedelta(minutes=15),
    )
    db.add(token_record)
    db.commit()

    send_password_reset_email(email, reset_token)
    log_activity(db, user.id, "forgot_password", request)
    security_logger.info(f"Password reset requested: {email}")

    return {"message": "If an account with that email exists, a reset link has been sent."}


# ── Reset Password ────────────────────────────────────────────

def reset_password(db: Session, token: str, new_password: str, request: Request | None = None):
    """Reset password using the token from the email link."""

    # Validate password strength
    is_valid, error_msg = validate_password_strength(new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )

    # Verify JWT token
    email = verify_reset_token(token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token.",
        )

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    # Check DB token record
    token_hashed = hash_token(token)
    db_token = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token_hash == token_hashed)
        .filter(PasswordResetToken.is_used == "false")
        .first()
    )
    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token already used or invalid.",
        )

    # Update password
    user.password = hash_password(new_password)
    user.failed_login_attempts = 0
    user.locked_until = None
    user.updated_at = datetime.utcnow()
    db_token.is_used = "true"

    # Revoke all existing sessions for security
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user.id,
        RefreshToken.is_revoked == False,
    ).update({"is_revoked": True})

    db.commit()

    log_activity(db, user.id, "password_reset", request, "Password reset via email link")
    security_logger.info(f"Password reset completed: {email}")

    return {"message": "Password has been reset successfully. Please log in with your new password."}


# ── Change Password ───────────────────────────────────────────

def change_password(
    db: Session,
    user: User,
    old_password: str,
    new_password: str,
    request: Request | None = None,
):
    """Change password for authenticated user."""

    if not verify_password(old_password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect.",
        )

    # Validate strength
    is_valid, error_msg = validate_password_strength(new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )

    if old_password == new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from the current password.",
        )

    user.password = hash_password(new_password)
    user.updated_at = datetime.utcnow()
    db.commit()

    log_activity(db, user.id, "password_change", request)
    security_logger.info(f"Password changed: {user.email}")

    return {"message": "Password changed successfully."}


# ── Profile Update ────────────────────────────────────────────

def update_profile(
    db: Session,
    user: User,
    update_data: ProfileUpdateRequest,
    request: Request | None = None,
):
    """Update user profile fields."""

    if update_data.name is not None:
        user.name = update_data.name
    if update_data.avatar_url is not None:
        user.avatar_url = update_data.avatar_url
    if update_data.timezone is not None:
        user.timezone = update_data.timezone
    if update_data.language is not None:
        user.language = update_data.language
    if update_data.theme is not None:
        user.theme = update_data.theme
    if update_data.notification_enabled is not None:
        user.notification_enabled = update_data.notification_enabled

    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)

    log_activity(db, user.id, "profile_update", request)

    return user


# ── Email Verification ────────────────────────────────────────

def verify_user_email(db: Session, token: str, request: Request | None = None):
    """Verify user email with the token from the verification email."""

    email = verify_email_token(token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token.",
        )

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    if user.is_verified:
        return {"message": "Email already verified."}

    user.is_verified = True
    user.updated_at = datetime.utcnow()
    db.commit()

    log_activity(db, user.id, "email_verified", request)
    security_logger.info(f"Email verified: {email}")

    return {"message": "Email verified successfully!"}


def resend_verification(db: Session, email: str, request: Request | None = None):
    """Resend email verification link."""

    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Don't reveal if email exists
        return {"message": "If an account with that email exists, a verification link has been sent."}

    if user.is_verified:
        return {"message": "Email is already verified."}

    token = create_verification_token(email)
    token_record = EmailVerificationToken(
        user_id=user.id,
        token_hash=hash_token(token),
        expires_at=datetime.utcnow() + timedelta(hours=24),
    )
    db.add(token_record)
    db.commit()

    send_verification_email(email, token)
    log_activity(db, user.id, "resend_verification", request)

    return {"message": "If an account with that email exists, a verification link has been sent."}


# ── Session Management ────────────────────────────────────────

def get_user_sessions(db: Session, user: User, current_refresh_token: str | None = None):
    """Get all active sessions for a user."""
    sessions = (
        db.query(UserSession)
        .filter(UserSession.user_id == user.id)
        .filter(UserSession.is_active == "true")
        .order_by(UserSession.last_active.desc())
        .all()
    )

    current_hash = hash_token(current_refresh_token) if current_refresh_token else None

    result = []
    for s in sessions:
        session_dict = {
            "id": s.id,
            "device_name": s.device_name,
            "device_type": s.device_type,
            "browser": s.browser,
            "os": s.os,
            "ip_address": s.ip_address,
            "location": s.location,
            "last_active": s.last_active,
            "created_at": s.created_at,
            "is_current": s.session_token == current_hash if current_hash else False,
        }
        result.append(session_dict)

    return result


def revoke_session(db: Session, user: User, session_id: int, request: Request | None = None):
    """Revoke a specific session."""

    session = (
        db.query(UserSession)
        .filter(UserSession.id == session_id)
        .filter(UserSession.user_id == user.id)
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    session.is_active = "false"

    # Also revoke the associated refresh token
    rt = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == session.session_token)
        .first()
    )
    if rt:
        rt.is_revoked = True

    db.commit()

    log_activity(db, user.id, "session_revoked", request, f"Revoked session {session_id}")
    security_logger.info(f"Session revoked: user={user.email}, session_id={session_id}")

    return {"message": "Session revoked successfully."}


# ── Activity Logs ─────────────────────────────────────────────

def get_user_activity(db: Session, user: User, limit: int = 20, offset: int = 0):
    """Get paginated activity logs for a user."""
    activities = (
        db.query(ActivityLog)
        .filter(ActivityLog.user_id == user.id)
        .order_by(ActivityLog.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return activities
