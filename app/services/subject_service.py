from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.exam_model import Exam
from app.models.subject_model import Subject
from app.schemas.subject_schema import SubjectCreate, SubjectUpdate


from app.utils.normalization import normalize_entity_name

def create_subject(db: Session, subject: SubjectCreate):
    exam = db.query(Exam).filter(Exam.id == subject.exam_id).first()
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found",
        )

    norm_name = normalize_entity_name(subject.name)
    existing = db.query(Subject).filter(Subject.exam_id == subject.exam_id, Subject.normalized_name == norm_name).first()
    if existing:
        return existing

    new_subject = Subject(exam_id=subject.exam_id, name=subject.name, normalized_name=norm_name)
    db.add(new_subject)
    db.commit()
    db.refresh(new_subject)
    return new_subject


def get_subjects_by_exam(db: Session, exam_id: int):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found",
        )

    return (
        db.query(Subject)
        .filter(Subject.exam_id == exam_id)
        .order_by(Subject.name)
        .all()
    )


def get_subjects(db: Session, page: int = 1, limit: int = 20, exam_id: int | None = None):
    query = db.query(Subject)
    if exam_id is not None:
        query = query.filter(Subject.exam_id == exam_id)

    offset = (page - 1) * limit
    return query.order_by(Subject.name).offset(offset).limit(limit).all()


def get_subject_by_id(db: Session, subject_id: int):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found",
        )
    return subject


def update_subject(db: Session, subject_id: int, subject_update: SubjectUpdate):
    subject = get_subject_by_id(db, subject_id)
    if subject_update.name is not None:
        subject.name = subject_update.name
        subject.normalized_name = normalize_entity_name(subject_update.name)

    db.commit()
    db.refresh(subject)
    return subject


def delete_subject(db: Session, subject_id: int):
    subject = get_subject_by_id(db, subject_id)
    db.delete(subject)
    db.commit()
