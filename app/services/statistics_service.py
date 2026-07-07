from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.exam_engine_model import Attempt, AttemptAnswer, QuestionNote


def get_engine_statistics(db: Session, user_id: int) -> dict:
    submitted = db.query(Attempt).filter(Attempt.user_id == user_id, Attempt.status == "submitted")
    total_attempts = submitted.count()
    total_time = submitted.with_entities(func.sum(Attempt.elapsed_seconds)).scalar() or 0
    avg_accuracy = submitted.with_entities(func.avg(Attempt.accuracy)).scalar() or 0.0
    avg_speed = submitted.with_entities(func.avg(Attempt.speed)).scalar() or 0.0
    marked_for_review = (
        db.query(AttemptAnswer)
        .join(Attempt, Attempt.id == AttemptAnswer.attempt_id)
        .filter(Attempt.user_id == user_id, AttemptAnswer.is_marked_for_review.is_(True))
        .count()
    )
    notes_count = db.query(QuestionNote).filter(QuestionNote.user_id == user_id).count()

    return {
        "total_attempts": total_attempts,
        "total_time_seconds": int(total_time),
        "average_accuracy": round(avg_accuracy, 2),
        "average_speed": round(avg_speed, 2),
        "marked_for_review": marked_for_review,
        "notes_count": notes_count,
    }
