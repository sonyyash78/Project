from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship

from app.database.db import Base


class ExamSetting(Base):
    __tablename__ = "exam_settings"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, unique=True)
    duration_minutes = Column(Integer, default=60, nullable=False)
    positive_marks = Column(Float, default=4.0, nullable=False)
    negative_marks = Column(Float, default=-1.0, nullable=False)
    passing_marks = Column(Float, default=0.0, nullable=False)
    difficulty = Column(String(50), default="mixed", nullable=False)
    language = Column(String(20), default="en", nullable=False)
    calculator_allowed = Column(Boolean, default=False, nullable=False)
    fullscreen_required = Column(Boolean, default=False, nullable=False)
    shuffle_questions = Column(Boolean, default=True, nullable=False)
    shuffle_options = Column(Boolean, default=False, nullable=False)
    question_limit = Column(Integer, default=30, nullable=False)
    scheduled_start_at = Column(DateTime, nullable=True)
    scheduled_end_at = Column(DateTime, nullable=True)
    live_mode_enabled = Column(Boolean, default=False, nullable=False)
    instructions = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class Attempt(Base):
    __tablename__ = "attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="SET NULL"), nullable=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id", ondelete="SET NULL"), nullable=True, index=True)
    exam_setting_id = Column(Integer, ForeignKey("exam_settings.id", ondelete="SET NULL"), nullable=True, index=True)
    mode = Column(String(50), nullable=False, index=True)
    status = Column(String(30), default="in_progress", nullable=False, index=True)
    total_questions = Column(Integer, default=0, nullable=False)
    duration_seconds = Column(Integer, default=0, nullable=False)
    remaining_seconds = Column(Integer, default=0, nullable=False)
    elapsed_seconds = Column(Integer, default=0, nullable=False)
    score = Column(Float, default=0.0, nullable=False)
    total_marks = Column(Float, default=0.0, nullable=False)
    correct_count = Column(Integer, default=0, nullable=False)
    wrong_count = Column(Integer, default=0, nullable=False)
    skipped_count = Column(Integer, default=0, nullable=False)
    accuracy = Column(Float, default=0.0, nullable=False)
    speed = Column(Float, default=0.0, nullable=False)
    percentile = Column(Float, default=0.0, nullable=False)
    rank = Column(Integer, nullable=True)
    config_snapshot = Column(JSON, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_saved_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    submitted_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)

    user = relationship("User")
    exam = relationship("Exam")
    subject = relationship("Subject")
    chapter = relationship("Chapter")
    exam_setting = relationship("ExamSetting")
    answers = relationship(
        "AttemptAnswer",
        back_populates="attempt",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class AttemptAnswer(Base):
    __tablename__ = "attempt_answers"

    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    selected_answer = Column(String(255), nullable=True)
    is_correct = Column(Boolean, default=False, nullable=False)
    is_bookmarked = Column(Boolean, default=False, nullable=False)
    is_marked_for_review = Column(Boolean, default=False, nullable=False)
    visited = Column(Boolean, default=False, nullable=False)
    skipped = Column(Boolean, default=True, nullable=False)
    hidden_options = Column(JSON, nullable=True)
    eliminated_options = Column(JSON, nullable=True)
    answer_changes = Column(Integer, default=0, nullable=False)
    time_spent_seconds = Column(Integer, default=0, nullable=False)
    last_answered_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    attempt = relationship("Attempt", back_populates="answers")
    question = relationship("Question")


class QuestionNote(Base):
    __tablename__ = "question_notes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    attempt_id = Column(Integer, ForeignKey("attempts.id", ondelete="SET NULL"), nullable=True, index=True)
    note = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User")
    question = relationship("Question")
    attempt = relationship("Attempt")


class LeaderboardEntry(Base):
    __tablename__ = "leaderboards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="SET NULL"), nullable=True, index=True)
    scope = Column(String(30), default="global", nullable=False, index=True)
    period = Column(String(30), default="all_time", nullable=False, index=True)
    score = Column(Float, default=0.0, nullable=False)
    accuracy = Column(Float, default=0.0, nullable=False)
    speed = Column(Float, default=0.0, nullable=False)
    xp = Column(Integer, default=0, nullable=False)
    coins = Column(Integer, default=0, nullable=False)
    tests_taken = Column(Integer, default=0, nullable=False)
    rank = Column(Integer, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User")
    exam = relationship("Exam")


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(100), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    xp_reward = Column(Integer, default=0, nullable=False)
    coins_reward = Column(Integer, default=0, nullable=False)
    unlocked_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Badge(Base):
    __tablename__ = "badges"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    badge_name = Column(String(200), nullable=False)
    badge_level = Column(String(50), default="bronze", nullable=False)
    awarded_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class DailyReward(Base):
    __tablename__ = "daily_rewards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    reward_date = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    xp_awarded = Column(Integer, default=0, nullable=False)
    coins_awarded = Column(Integer, default=0, nullable=False)
    streak_day = Column(Integer, default=1, nullable=False)
