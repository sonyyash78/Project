from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text

from app.database.db import Base


class User(Base):

    __tablename__ = "users"

    # ── Existing columns (NEVER TOUCH) ─────────────────────────
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(50), default="user", nullable=False)

    # ── Phase 2 — Profile ──────────────────────────────────────
    avatar_url = Column(String(500), nullable=True)
    is_verified = Column(Boolean, default=False, nullable=False)

    # ── Phase 2 — Timestamps ───────────────────────────────────
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    last_active = Column(DateTime, nullable=True)
    last_login_ip = Column(String(50), nullable=True)

    # ── Phase 2 — Preferences ─────────────────────────────────
    timezone = Column(String(50), default="Asia/Kolkata")
    language = Column(String(10), default="en")
    theme = Column(String(20), default="dark")
    notification_enabled = Column(Boolean, default=True)

    # ── Phase 2 — Subscription ────────────────────────────────
    premium_until = Column(DateTime, nullable=True)
    subscription_plan = Column(String(50), default="free")

    # ── Phase 2 — Security ────────────────────────────────────
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)

    # ── Phase 3 — Gamification ────────────────────────────────
    xp = Column(Integer, default=0, nullable=False)
    coins = Column(Integer, default=0, nullable=False)
    level = Column(Integer, default=1, nullable=False)
    streak_days = Column(Integer, default=0, nullable=False)
    longest_streak = Column(Integer, default=0, nullable=False)
    last_streak_date = Column(DateTime, nullable=True)
    total_tests_taken = Column(Integer, default=0, nullable=False)
    total_time_spent = Column(Integer, default=0, nullable=False)
    title = Column(String(100), default="Beginner", nullable=False)