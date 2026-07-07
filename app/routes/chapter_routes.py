from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.schemas.chapter_schema import ChapterCreate, ChapterResponse, ChapterUpdate
from app.services.chapter_service import (
    create_chapter,
    delete_chapter,
    get_chapter_by_id,
    get_chapters_by_subject,
    update_chapter,
)
from app.utils.dependencies import get_admin_user

router = APIRouter(prefix="/api/chapters", tags=["Chapters"])


@router.post(
    "/",
    response_model=ChapterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new chapter",
    description="Create a chapter under a subject. Admin only.",
)
def add_chapter(
    chapter: ChapterCreate,
    db: Session = Depends(get_db),
    _admin=Depends(get_admin_user),
):
    return create_chapter(db, chapter)


@router.get("/subject/{subject_id}", response_model=list[ChapterResponse])
def list_chapters_by_subject(subject_id: int, db: Session = Depends(get_db)):
    return get_chapters_by_subject(db, subject_id)


@router.get("/{chapter_id}", response_model=ChapterResponse)
def get_chapter(chapter_id: int, db: Session = Depends(get_db)):
    return get_chapter_by_id(db, chapter_id)


@router.put("/{chapter_id}", response_model=ChapterResponse)
def update_chapter_route(
    chapter_id: int,
    chapter_update: ChapterUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(get_admin_user),
):
    return update_chapter(db, chapter_id, chapter_update)


@router.delete("/{chapter_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chapter_route(
    chapter_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(get_admin_user),
):
    delete_chapter(db, chapter_id)
    return None
