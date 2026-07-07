from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, Float, Boolean, DateTime
from sqlalchemy.orm import relationship

from app.database.db import Base


class Bookmark(Base):
    __tablename__ = "bookmarks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User")
    question = relationship("Question")


class TestAttempt(Base):
    __tablename__ = "test_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    test_type = Column(String(50), nullable=False)  # "practice" or "mock"
    target_id = Column(Integer, nullable=False)     # chapter_id or exam_id
    score = Column(Float, nullable=False)
    total_marks = Column(Float, nullable=False)
    correct_count = Column(Integer, default=0)
    incorrect_count = Column(Integer, default=0)
    skipped_count = Column(Integer, default=0)
    accuracy = Column(Float, default=0.0)           # percentage
    time_taken = Column(Integer, default=0)         # in seconds
    submitted_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User")
    question_attempts = relationship(
        "QuestionAttempt",
        back_populates="attempt",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class QuestionAttempt(Base):
    __tablename__ = "question_attempts"

    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("test_attempts.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    selected_answer = Column(String(50), nullable=True)
    is_correct = Column(Boolean, default=False)
    time_spent = Column(Integer, default=0)         # in seconds

    # Relationships
    attempt = relationship("TestAttempt", back_populates="question_attempts")
    question = relationship("Question")
