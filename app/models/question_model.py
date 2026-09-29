from datetime import datetime
from sqlalchemy import Column, Float, Integer, String, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship

from app.database.db import Base


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)

    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id", ondelete="SET NULL"), nullable=True, index=True)

    question = Column(Text, nullable=False)
    question_type = Column(String(50), default="mcq")

    option_a = Column(String(500), nullable=True)
    option_b = Column(String(500), nullable=True)
    option_c = Column(String(500), nullable=True)
    option_d = Column(String(500), nullable=True)

    correct_answer = Column(String(100), nullable=False)
    solution = Column(Text, nullable=True)

    year = Column(Integer, nullable=True)
    exam_session = Column(String(200), nullable=True)
    difficulty = Column(String(50), default="Medium", index=True)
    marks = Column(Float, default=4.0)
    negative_marks = Column(Float, default=-1.0)
    time = Column(Integer, default=60)
    topic = Column(String(200), nullable=True, index=True)
    language = Column(String(50), default="en", nullable=False)
    source = Column(String(200), nullable=True)
    tags = Column(String(500), nullable=True)
    status = Column(String(50), default="active", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    exam = relationship(
        "Exam",
        back_populates="questions",
        passive_deletes=True,
    )
    chapter = relationship(
        "Chapter",
        back_populates="questions",
        passive_deletes=True,
    )
