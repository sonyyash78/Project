from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship

from app.database.db import Base


class ActivityLog(Base):
    """Comprehensive user activity audit trail."""

    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)  # login, logout, signup, password_change, etc.
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)
    device = Column(String(200), nullable=True)
    browser = Column(String(100), nullable=True)
    os = Column(String(100), nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")

    __table_args__ = (
        Index("ix_activity_logs_user_id", "user_id"),
        Index("ix_activity_logs_action", "action"),
        Index("ix_activity_logs_created_at", "created_at"),
    )


class UserSession(Base):
    """Multi-device session tracking."""

    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    session_token = Column(String(500), nullable=False, unique=True)
    device_name = Column(String(200), nullable=True)
    device_type = Column(String(50), nullable=True)  # desktop, mobile, tablet
    browser = Column(String(100), nullable=True)
    os = Column(String(100), nullable=True)
    ip_address = Column(String(50), nullable=True)
    location = Column(String(200), nullable=True)
    is_active = Column(String(10), default="true")
    last_active = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)

    user = relationship("User")

    __table_args__ = (
        Index("ix_user_sessions_user_id", "user_id"),
        Index("ix_user_sessions_session_token", "session_token"),
    )


class PasswordResetToken(Base):
    """Secure password reset tokens."""

    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(500), nullable=False, unique=True)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(String(10), default="false")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")


class EmailVerificationToken(Base):
    """Email verification tokens."""

    __tablename__ = "email_verification_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(500), nullable=False, unique=True)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(String(10), default="false")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
