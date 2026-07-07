from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.exam_engine_model import ExamSetting
from app.models.exam_model import Exam


def get_upcoming_exam_notifications(db: Session, within_hours: int = 24) -> list[dict]:
    now = datetime.utcnow()
    window_end = now + timedelta(hours=within_hours)
    rows = (
        db.query(ExamSetting, Exam.exam_name)
        .join(Exam, Exam.id == ExamSetting.exam_id)
        .filter(ExamSetting.scheduled_start_at.isnot(None))
        .filter(ExamSetting.scheduled_start_at >= now, ExamSetting.scheduled_start_at <= window_end)
        .order_by(ExamSetting.scheduled_start_at.asc())
        .all()
    )
    return [
        {
            "exam_id": row[0].exam_id,
            "exam_name": row[1],
            "scheduled_start_at": row[0].scheduled_start_at,
            "scheduled_end_at": row[0].scheduled_end_at,
            "live_mode_enabled": row[0].live_mode_enabled,
            "message": f"{row[1]} starts soon",
        }
        for row in rows
    ]
