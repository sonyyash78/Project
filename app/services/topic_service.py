from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.chapter_model import Chapter
from app.models.topic_model import Topic
from app.schemas.topic_schema import TopicCreate
from app.utils.normalization import normalize_entity_name

def create_topic(db: Session, topic: TopicCreate):
    chapter = db.query(Chapter).filter(Chapter.id == topic.chapter_id).first()
    if not chapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chapter not found",
        )

    norm_name = normalize_entity_name(topic.name)
    existing = db.query(Topic).filter(Topic.chapter_id == topic.chapter_id, Topic.normalized_name == norm_name).first()
    if existing:
        return existing

    new_topic = Topic(chapter_id=topic.chapter_id, name=topic.name, normalized_name=norm_name)
    db.add(new_topic)
    db.commit()
    db.refresh(new_topic)
    return new_topic

def get_topics_by_chapter(db: Session, chapter_id: int):
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chapter not found",
        )

    return (
        db.query(Topic)
        .filter(Topic.chapter_id == chapter_id)
        .order_by(Topic.name)
        .all()
    )
