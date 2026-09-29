from sqlalchemy import Column, Integer, String, DateTime, Float
from datetime import datetime
from app.database.db import Base

class AIGenerationLog(Base):
    __tablename__ = "ai_generation_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    exam = Column(String(200), nullable=False)
    subject = Column(String(200), nullable=False)
    chapter = Column(String(200), nullable=False)
    topic = Column(String(200), nullable=True)
    language = Column(String(50), nullable=False)
    question_count = Column(Integer, nullable=False)
    duplicates_removed = Column(Integer, default=0)
    generation_time = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
