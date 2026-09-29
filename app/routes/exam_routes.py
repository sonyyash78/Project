from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.schemas.exam_schema import (
    CategoryResponse,
    ExamCreate,
    ExamResponse,
    ExamUpdate,
)
from app.schemas.subject_schema import SubjectResponse
from app.services.exam_service import (
    create_exam,
    delete_exam,
    get_categories,
    get_exam_by_id,
    get_exams,
    get_exams_by_category,
    update_exam,
)
from app.services.subject_service import get_subjects_by_exam
from app.utils.dependencies import get_admin_user

router = APIRouter(prefix="/api/exams", tags=["Exams"])


@router.post(
    "/",
    response_model=ExamResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new exam",
    description="Create an exam record. Admin only.",
)
def create_new_exam(
    exam: ExamCreate,
    db: Session = Depends(get_db),
    _admin=Depends(get_admin_user),
):
    return create_exam(db, exam)


@router.get(
    "/",
    response_model=list[ExamResponse],
    summary="List exams",
    description="Retrieve exams with optional pagination, search, and sorting.",
)
def list_exams(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search exams by name or category"),
    sort: Optional[str] = Query(
        "alphabetical",
        description="Sort by newest, oldest, year, alphabetical",
    ),
    db: Session = Depends(get_db),
):
    return get_exams(db, page, limit, search, sort)


@router.get(
    "/categories",
    response_model=list[CategoryResponse],
    summary="List exam categories",
    description="Retrieve available exam categories and the exams in each category.",
)
def list_categories(db: Session = Depends(get_db)):
    return get_categories(db)


@router.get(
    "/category/{category}",
    response_model=list[ExamResponse],
    summary="List exams by category",
    description="Retrieve exams filtered by category.",
)
def list_exams_by_category(category: str, db: Session = Depends(get_db)):
    return get_exams_by_category(db, category)


@router.get(
    "/{exam_id}",
    response_model=ExamResponse,
    summary="Get exam details",
    description="Retrieve a single exam by ID.",
)
def get_exam(exam_id: int, db: Session = Depends(get_db)):
    return get_exam_by_id(db, exam_id)


@router.put(
    "/{exam_id}",
    response_model=ExamResponse,
    summary="Update exam",
    description="Update exam details. Admin only.",
)
def put_exam(
    exam_id: int,
    exam_update: ExamUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(get_admin_user),
):
    return update_exam(db, exam_id, exam_update)


@router.delete(
    "/{exam_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete exam",
    description="Delete an exam and cascade delete related subjects, chapters, and questions. Admin only.",
)
def delete_exam_route(
    exam_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(get_admin_user),
):
    delete_exam(db, exam_id)
    return None


@router.get(
    "/{exam_id}/subjects",
    response_model=list[SubjectResponse],
    summary="List subjects for an exam",
    description="Retrieve subjects belonging to a specific exam.",
)
def list_subjects_by_exam(exam_id: int, db: Session = Depends(get_db)):
    return get_subjects_by_exam(db, exam_id)
