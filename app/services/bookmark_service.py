from sqlalchemy.orm import Session

from app.models.exam_engine_model import AttemptAnswer
from app.models.progress_model import Bookmark


def sync_bookmark_state(db: Session, user_id: int, question_id: int, bookmarked: bool) -> None:
    existing = db.query(Bookmark).filter(Bookmark.user_id == user_id, Bookmark.question_id == question_id).first()
    if bookmarked and not existing:
        db.add(Bookmark(user_id=user_id, question_id=question_id))
    if not bookmarked and existing:
        db.delete(existing)


def sync_attempt_bookmarks(db: Session, attempt_id: int) -> int:
    answers = db.query(AttemptAnswer).filter(AttemptAnswer.attempt_id == attempt_id, AttemptAnswer.is_bookmarked.is_(True)).all()
    return len(answers)
