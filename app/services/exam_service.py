from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.exam_model import Exam
from app.schemas.exam_schema import CategoryResponse, ExamCreate, ExamResponse


from app.utils.normalization import normalize_entity_name

def create_exam(db: Session, exam: ExamCreate):
    norm_name = normalize_entity_name(exam.exam_name)
    existing = db.query(Exam).filter(Exam.normalized_name == norm_name).first()
    if existing:
        return existing

    new_exam = Exam(
        exam_name=exam.exam_name,
        normalized_name=norm_name,
        category=exam.category,
        image=exam.image,
    )

    db.add(new_exam)
    db.commit()
    db.refresh(new_exam)
    return new_exam


def get_exams(
    db: Session,
    page: int = 1,
    limit: int = 20,
    search: str | None = None,
    sort: str | None = None,
):
    query = db.query(Exam)

    if search:
        search_value = f"%{search}%"
        query = query.filter(
            or_(Exam.exam_name.ilike(search_value), Exam.category.ilike(search_value))
        )

    if sort == "newest":
        query = query.order_by(Exam.id.desc())
    elif sort == "oldest":
        query = query.order_by(Exam.id.asc())
    elif sort == "year":
        query = query.order_by(Exam.exam_name.asc())
    else:
        query = query.order_by(Exam.category.asc(), Exam.exam_name.asc())

    offset = (page - 1) * limit
    return query.offset(offset).limit(limit).all()


def get_exam_by_id(db: Session, exam_id: int):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found",
        )
    return exam


def update_exam(db: Session, exam_id: int, exam_update):
    exam = get_exam_by_id(db, exam_id)
    if exam_update.exam_name is not None:
        exam.exam_name = exam_update.exam_name
        exam.normalized_name = normalize_entity_name(exam_update.exam_name)
    if exam_update.category is not None:
        exam.category = exam_update.category
    if exam_update.image is not None:
        exam.image = exam_update.image

    db.commit()
    db.refresh(exam)
    return exam


def delete_exam(db: Session, exam_id: int):
    exam = get_exam_by_id(db, exam_id)
    db.delete(exam)
    db.commit()


def get_exams_by_category(db: Session, category: str):
    exams = (
        db.query(Exam)
        .filter(Exam.category == category)
        .order_by(Exam.exam_name)
        .all()
    )
    if not exams:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No exams found for this category",
        )
    return exams


def get_categories(db: Session):
    exams = db.query(Exam).order_by(Exam.category, Exam.exam_name).all()
    grouped: dict[str, list[Exam]] = {}

    for exam in exams:
        grouped.setdefault(exam.category, []).append(exam)

    return [
        CategoryResponse(
            category=category,
            exams=[ExamResponse.model_validate(exam) for exam in exams_in_category],
        )
        for category, exams_in_category in grouped.items()
    ]
