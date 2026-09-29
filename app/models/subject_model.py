from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from app.database.db import Base


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(
        Integer,
        ForeignKey("exams.id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(String(200), nullable=False)
    normalized_name = Column(String(200), index=True)

    exam = relationship("Exam", back_populates="subjects")
    chapters = relationship(
        "Chapter",
        back_populates="subject",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
