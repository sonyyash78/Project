from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.schemas.chapter_schema import ChapterResponse
from app.schemas.subject_schema import (
    SubjectCreate,
    SubjectResponse,
    SubjectUpdate,
)
from app.services.chapter_service import get_chapters_by_subject
from app.services.subject_service import (
    create_subject,
    delete_subject,
    get_subject_by_id,
    get_subjects,
    get_subjects_by_exam,
    update_subject,
)
from app.utils.dependencies import get_admin_user

router = APIRouter(prefix="/api/subjects", tags=["Subjects"])


@router.post(
    "/",
    response_model=SubjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new subject",
    description="Create a subject under a specific exam. Admin only.",
)
def add_subject(
    subject: SubjectCreate,
    db: Session = Depends(get_db),
    _admin=Depends(get_admin_user),
):
    return create_subject(db, subject)


@router.get(
    "/",
    response_model=list[SubjectResponse],
    summary="List subjects",
    description="Retrieve subjects with optional pagination and exam filtering.",
)
def list_subjects(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    exam_id: Optional[int] = Query(None, description="Filter subjects by exam ID"),
    db: Session = Depends(get_db),
):
    return get_subjects(db, page, limit, exam_id)


@router.get(
    "/{subject_id}",
    response_model=SubjectResponse,
    summary="Get subject details",
    description="Retrieve a subject by ID.",
)
def get_subject(subject_id: int, db: Session = Depends(get_db)):
    return get_subject_by_id(db, subject_id)


@router.put(
    "/{subject_id}",
    response_model=SubjectResponse,
    summary="Update subject",
    description="Update subject details. Admin only.",
)
def put_subject(
    subject_id: int,
    subject_update: SubjectUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(get_admin_user),
):
    return update_subject(db, subject_id, subject_update)


@router.delete(
    "/{subject_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete subject",
    description="Delete a subject and related chapters and questions. Admin only.",
)
def delete_subject_route(
    subject_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(get_admin_user),
):
    delete_subject(db, subject_id)
    return None


@router.get(
    "/{subject_id}/chapters",
    response_model=list[ChapterResponse],
    summary="List chapters for a subject",
    description="Retrieve chapters that belong to a subject.",
)
def list_chapters_by_subject(subject_id: int, db: Session = Depends(get_db)):
    return get_chapters_by_subject(db, subject_id)
