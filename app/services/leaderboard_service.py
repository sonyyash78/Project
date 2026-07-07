from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.exam_engine_model import Attempt, LeaderboardEntry
from app.models.user_model import User


def refresh_leaderboard(db: Session, exam_id: int | None = None) -> list[LeaderboardEntry]:
    query = db.query(Attempt).filter(Attempt.status == "submitted")
    if exam_id is not None:
        query = query.filter(Attempt.exam_id == exam_id)

    aggregates = (
        query.with_entities(
            Attempt.user_id,
            func.sum(Attempt.score).label("score"),
            func.avg(Attempt.accuracy).label("accuracy"),
            func.avg(Attempt.speed).label("speed"),
            func.count(Attempt.id).label("tests_taken"),
        )
        .group_by(Attempt.user_id)
        .order_by(func.sum(Attempt.score).desc(), func.avg(Attempt.accuracy).desc())
        .limit(100)
        .all()
    )

    scope = "exam" if exam_id is not None else "global"
    db.query(LeaderboardEntry).filter(LeaderboardEntry.scope == scope, LeaderboardEntry.exam_id == exam_id).delete()

    entries = []
    for index, row in enumerate(aggregates, start=1):
        entry = LeaderboardEntry(
            user_id=row[0],
            exam_id=exam_id,
            scope=scope,
            period="all_time",
            score=round(row[1] or 0, 2),
            accuracy=round(row[2] or 0, 2),
            speed=round(row[3] or 0, 2),
            xp=int((row[1] or 0) * 10),
            coins=int((row[2] or 0) // 5),
            tests_taken=int(row[4] or 0),
            rank=index,
        )
        db.add(entry)
        entries.append(entry)

    db.commit()
    return entries


def get_leaderboard(db: Session, scope: str = "global", exam_id: int | None = None, limit: int = 20) -> list[dict]:
    refresh_leaderboard(db, exam_id if scope == "exam" else None)
    rows = (
        db.query(LeaderboardEntry, User.name, User.email)
        .join(User, User.id == LeaderboardEntry.user_id)
        .filter(LeaderboardEntry.scope == scope)
        .filter(LeaderboardEntry.exam_id == exam_id if scope == "exam" else LeaderboardEntry.exam_id.is_(None))
        .order_by(LeaderboardEntry.rank.asc())
        .limit(limit)
        .all()
    )
    return [
        {
            "rank": row[0].rank,
            "user_id": row[0].user_id,
            "name": row[1],
            "email": row[2],
            "score": row[0].score,
            "accuracy": row[0].accuracy,
            "speed": row[0].speed,
            "xp": row[0].xp,
            "coins": row[0].coins,
            "tests_taken": row[0].tests_taken,
        }
        for row in rows
    ]
