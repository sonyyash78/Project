from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.chapter_model import Chapter
from app.models.subject_model import Subject
from app.schemas.chapter_schema import ChapterCreate, ChapterUpdate


from app.utils.normalization import normalize_entity_name

def create_chapter(db: Session, chapter: ChapterCreate):
    subject = db.query(Subject).filter(Subject.id == chapter.subject_id).first()
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found",
        )

    norm_name = normalize_entity_name(chapter.name)
    existing = db.query(Chapter).filter(Chapter.subject_id == chapter.subject_id, Chapter.normalized_name == norm_name).first()
    if existing:
        return existing

    new_chapter = Chapter(subject_id=chapter.subject_id, name=chapter.name, normalized_name=norm_name)
    db.add(new_chapter)
    db.commit()
    db.refresh(new_chapter)
    return new_chapter


def get_chapters_by_subject(db: Session, subject_id: int):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found",
        )

    return (
        db.query(Chapter)
        .filter(Chapter.subject_id == subject_id)
        .order_by(Chapter.name)
        .all()
    )


def get_chapter_by_id(db: Session, chapter_id: int):
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chapter not found",
        )
    return chapter


def update_chapter(db: Session, chapter_id: int, chapter_update: ChapterUpdate):
    chapter = get_chapter_by_id(db, chapter_id)
    if chapter_update.name is not None:
        chapter.name = chapter_update.name
        chapter.normalized_name = normalize_entity_name(chapter_update.name)
    db.commit()
    db.refresh(chapter)
    return chapter


def delete_chapter(db: Session, chapter_id: int):
    chapter = get_chapter_by_id(db, chapter_id)
    db.delete(chapter)
    db.commit()
