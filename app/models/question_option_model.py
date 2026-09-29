from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database.db import Base

class QuestionOption(Base):
    __tablename__ = "question_options"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    option_key = Column(String(10), nullable=False) # e.g. "a", "b", "c", "d"
    option_value = Column(String(500), nullable=False)
    is_correct = Column(Boolean, default=False, nullable=False)

    question = relationship("Question")
