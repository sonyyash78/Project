from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.chapter_model import Chapter
from app.models.exam_engine_model import Attempt, AttemptAnswer
from app.models.question_model import Question
from app.models.subject_model import Subject


def get_exam_dashboard(db: Session, user_id: int) -> dict:
    attempts = db.query(Attempt).filter(Attempt.user_id == user_id, Attempt.status == "submitted").all()
    total_attempts = len(attempts)
    if not attempts:
        return {
            "total_attempts": 0,
            "accuracy_trend": [],
            "score_trend": [],
            "weekly_progress": [],
            "monthly_progress": [],
            "chapter_comparison": [],
            "subject_comparison": [],
            "difficulty_comparison": [],
        }

    now = datetime.utcnow()
    weekly_cutoff = now - timedelta(days=7)
    monthly_cutoff = now - timedelta(days=30)

    accuracy_trend = [{"attempt_id": attempt.id, "accuracy": attempt.accuracy, "submitted_at": attempt.submitted_at} for attempt in attempts[-10:]]
    score_trend = [{"attempt_id": attempt.id, "score": attempt.score, "submitted_at": attempt.submitted_at} for attempt in attempts[-10:]]
    weekly_progress = [{"attempt_id": attempt.id, "score": attempt.score, "date": attempt.submitted_at.date().isoformat()} for attempt in attempts if attempt.submitted_at and attempt.submitted_at >= weekly_cutoff]
    monthly_progress = [{"attempt_id": attempt.id, "score": attempt.score, "date": attempt.submitted_at.date().isoformat()} for attempt in attempts if attempt.submitted_at and attempt.submitted_at >= monthly_cutoff]

    chapter_rows = (
        db.query(Chapter.name, func.count(AttemptAnswer.id), func.sum(AttemptAnswer.is_correct))
        .join(Question, Question.chapter_id == Chapter.id)
        .join(AttemptAnswer, AttemptAnswer.question_id == Question.id)
        .join(Attempt, Attempt.id == AttemptAnswer.attempt_id)
        .filter(Attempt.user_id == user_id, Attempt.status == "submitted")
        .group_by(Chapter.name)
        .all()
    )
    subject_rows = (
        db.query(Subject.name, func.count(AttemptAnswer.id), func.sum(AttemptAnswer.is_correct))
        .join(Chapter, Chapter.subject_id == Subject.id)
        .join(Question, Question.chapter_id == Chapter.id)
        .join(AttemptAnswer, AttemptAnswer.question_id == Question.id)
        .join(Attempt, Attempt.id == AttemptAnswer.attempt_id)
        .filter(Attempt.user_id == user_id, Attempt.status == "submitted")
        .group_by(Subject.name)
        .all()
    )
    difficulty_rows = (
        db.query(Question.difficulty, func.count(AttemptAnswer.id), func.sum(AttemptAnswer.is_correct))
        .join(AttemptAnswer, AttemptAnswer.question_id == Question.id)
        .join(Attempt, Attempt.id == AttemptAnswer.attempt_id)
        .filter(Attempt.user_id == user_id, Attempt.status == "submitted")
        .group_by(Question.difficulty)
        .all()
    )

    def format_rows(rows, label):
        return [
            {
                label: row[0] or "Unknown",
                "total": int(row[1] or 0),
                "correct": int(row[2] or 0),
                "accuracy": round(((row[2] or 0) / row[1]) * 100, 2) if row[1] else 0.0,
            }
            for row in rows
        ]

    return {
        "total_attempts": total_attempts,
        "accuracy_trend": accuracy_trend,
        "score_trend": score_trend,
        "weekly_progress": weekly_progress,
        "monthly_progress": monthly_progress,
        "chapter_comparison": format_rows(chapter_rows, "chapter"),
        "subject_comparison": format_rows(subject_rows, "subject"),
        "difficulty_comparison": format_rows(difficulty_rows, "difficulty"),
    }
