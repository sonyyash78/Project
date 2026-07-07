from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.exam_engine_model import ExamSetting, QuestionNote
from app.schemas.exam_engine_schema import (
    AttemptAnswerSaveRequest,
    AttemptStartRequest,
    AttemptSubmitRequest,
    ExamSettingResponse,
    ExamSettingUpsert,
    QuestionNoteUpsert,
)
from app.services.analytics_service import get_exam_dashboard
from app.services.attempt_service import get_attempt_session, save_attempt_answer, start_attempt, submit_attempt
from app.services.leaderboard_service import get_leaderboard
from app.services.notification_service import get_upcoming_exam_notifications
from app.services.result_service import build_attempt_result
from app.services.statistics_service import get_engine_statistics
from app.utils.dependencies import get_admin_user
from app.utils.jwt_handler import get_current_user

router = APIRouter(prefix="/api/exam-engine", tags=["Enterprise Exam Engine"])


@router.get("/settings", response_model=list[ExamSettingResponse], summary="List exam settings")
def list_exam_settings(
    exam_id: int | None = Query(None),
    difficulty: str | None = Query(None),
    sort: str = Query("latest"),
    db: Session = Depends(get_db),
):
    query = db.query(ExamSetting)
    if exam_id is not None:
        query = query.filter(ExamSetting.exam_id == exam_id)
    if difficulty:
        query = query.filter(ExamSetting.difficulty == difficulty)
    query = query.order_by(ExamSetting.updated_at.desc() if sort == "latest" else ExamSetting.exam_id.asc())
    return query.all()


@router.post("/settings", response_model=ExamSettingResponse, status_code=status.HTTP_201_CREATED, summary="Create or update exam settings")
def upsert_exam_setting(
    payload: ExamSettingUpsert,
    db: Session = Depends(get_db),
    _admin=Depends(get_admin_user),
):
    setting = db.query(ExamSetting).filter(ExamSetting.exam_id == payload.exam_id).first()
    if not setting:
        setting = ExamSetting(exam_id=payload.exam_id)
        db.add(setting)
    for field, value in payload.model_dump().items():
        setattr(setting, field, value)
    db.commit()
    db.refresh(setting)
    return setting


@router.post("/attempts/start", summary="Start or resume an enterprise exam attempt")
def start_exam_attempt(
    payload: AttemptStartRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return start_attempt(db, current_user.id, payload)


@router.get("/attempts/{attempt_id}", summary="Get persisted attempt session for resume")
def fetch_attempt_session(
    attempt_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_attempt_session(db, current_user.id, attempt_id)


@router.post("/attempts/{attempt_id}/answers", summary="Autosave a single answer state")
def autosave_attempt_answer(
    attempt_id: int,
    payload: AttemptAnswerSaveRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return save_attempt_answer(db, current_user.id, attempt_id, payload)


@router.post("/attempts/{attempt_id}/submit", summary="Submit an attempt and generate the result")
def submit_exam_attempt(
    attempt_id: int,
    payload: AttemptSubmitRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    attempt = submit_attempt(db, current_user.id, attempt_id, payload)
    return {"attempt_id": attempt.id, "status": attempt.status, "score": attempt.score}


@router.get("/attempts/{attempt_id}/result", summary="Get enterprise result analytics for an attempt")
def get_attempt_result(
    attempt_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return build_attempt_result(db, attempt_id, current_user.id)


@router.get("/analytics/dashboard", summary="Get enterprise analytics dashboard")
def analytics_dashboard(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return {
        "dashboard": get_exam_dashboard(db, current_user.id),
        "statistics": get_engine_statistics(db, current_user.id),
    }


@router.get("/leaderboard", summary="Get enterprise leaderboard")
def leaderboard(
    scope: str = Query("global"),
    exam_id: int | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return get_leaderboard(db, scope=scope, exam_id=exam_id, limit=limit)


@router.get("/notes", summary="List user question notes")
def list_question_notes(
    question_id: int | None = Query(None),
    attempt_id: int | None = Query(None),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(QuestionNote).filter(QuestionNote.user_id == current_user.id)
    if question_id is not None:
        query = query.filter(QuestionNote.question_id == question_id)
    if attempt_id is not None:
        query = query.filter(QuestionNote.attempt_id == attempt_id)
    return query.order_by(QuestionNote.updated_at.desc()).all()


@router.post("/notes", summary="Create or update a note for a question")
def upsert_question_note(
    payload: QuestionNoteUpsert,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = (
        db.query(QuestionNote)
        .filter(QuestionNote.user_id == current_user.id, QuestionNote.question_id == payload.question_id)
        .first()
    )
    if not note:
        note = QuestionNote(user_id=current_user.id, question_id=payload.question_id)
        db.add(note)
    note.attempt_id = payload.attempt_id
    note.note = payload.note
    db.commit()
    db.refresh(note)
    return note


@router.get("/notifications/upcoming", summary="Upcoming scheduled and live mock notifications")
def upcoming_notifications(
    within_hours: int = Query(24, ge=1, le=168),
    db: Session = Depends(get_db),
):
    return get_upcoming_exam_notifications(db, within_hours)
