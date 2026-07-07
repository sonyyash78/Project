from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.database.db import Base

class MockTest(Base):
    __tablename__ = "mock_tests"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    exam = relationship("Exam")
    questions = relationship("MockTestQuestion", back_populates="mock_test", cascade="all, delete-orphan")

class MockTestQuestion(Base):
    __tablename__ = "mock_test_questions"

    id = Column(Integer, primary_key=True, index=True)
    mock_test_id = Column(Integer, ForeignKey("mock_tests.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)

    mock_test = relationship("MockTest", back_populates="questions")
    question = relationship("Question")
