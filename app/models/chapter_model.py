from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from app.database.db import Base


class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(
        Integer,
        ForeignKey("subjects.id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(String(200), nullable=False)
    normalized_name = Column(String(200), index=True)

    subject = relationship("Subject", back_populates="chapters")
    questions = relationship(
        "Question",
        back_populates="chapter",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
