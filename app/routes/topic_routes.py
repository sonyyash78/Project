from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.schemas.topic_schema import TopicCreate, TopicResponse
from app.services.topic_service import create_topic, get_topics_by_chapter
from app.utils.dependencies import get_admin_user

router = APIRouter(prefix="/api/topics", tags=["Topics"])

@router.post(
    "/",
    response_model=TopicResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new topic",
    description="Create a topic under a chapter. Admin only.",
)
def add_topic(
    topic: TopicCreate,
    db: Session = Depends(get_db),
    _admin=Depends(get_admin_user),
):
    return create_topic(db, topic)

@router.get("/chapter/{chapter_id}", response_model=list[TopicResponse])
def list_topics_by_chapter(chapter_id: int, db: Session = Depends(get_db)):
    return get_topics_by_chapter(db, chapter_id)
