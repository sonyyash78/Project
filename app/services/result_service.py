from __future__ import annotations

from sqlalchemy.orm import Session, joinedload

from app.models.chapter_model import Chapter
from app.models.exam_engine_model import Attempt, AttemptAnswer
from app.models.subject_model import Subject


def build_attempt_result(db: Session, attempt_id: int, user_id: int) -> dict | None:
    attempt = (
        db.query(Attempt)
        .options(joinedload(Attempt.answers).joinedload(AttemptAnswer.question))
        .filter(Attempt.id == attempt_id, Attempt.user_id == user_id)
        .first()
    )
    if not attempt:
        return None

    chapter_ids = [answer.question.chapter_id for answer in attempt.answers if answer.question and answer.question.chapter_id]
    chapter_map = {}
    if chapter_ids:
        rows = (
            db.query(Chapter.id, Chapter.name, Subject.name)
            .join(Subject, Subject.id == Chapter.subject_id)
            .filter(Chapter.id.in_(set(chapter_ids)))
            .all()
        )
        chapter_map = {row[0]: {"chapter_name": row[1], "subject_name": row[2]} for row in rows}

    subject_analysis = {}
    difficulty_analysis = {}
    time_analysis = []
    questions = []

    for answer in attempt.answers:
        question = answer.question
        if not question:
            continue

        chapter_meta = chapter_map.get(question.chapter_id, {"chapter_name": "General", "subject_name": "General"})
        subject_name = chapter_meta["subject_name"]
        difficulty_name = question.difficulty or "Unknown"

        subject_analysis.setdefault(subject_name, {"correct": 0, "wrong": 0, "skipped": 0, "total": 0})
        difficulty_analysis.setdefault(difficulty_name, {"correct": 0, "wrong": 0, "skipped": 0, "total": 0})

        bucket = "skipped" if answer.selected_answer in (None, "") else "correct" if answer.is_correct else "wrong"
        subject_analysis[subject_name][bucket] += 1
        subject_analysis[subject_name]["total"] += 1
        difficulty_analysis[difficulty_name][bucket] += 1
        difficulty_analysis[difficulty_name]["total"] += 1

        time_analysis.append(
            {
                "question_id": question.id,
                "time_spent_seconds": answer.time_spent_seconds,
                "difficulty": difficulty_name,
                "chapter_name": chapter_meta["chapter_name"],
            }
        )
        questions.append(
            {
                "question_id": question.id,
                "question_text": question.question,
                "selected_answer": answer.selected_answer,
                "correct_answer": question.correct_answer,
                "is_correct": answer.is_correct,
                "solution": question.solution,
                "difficulty": difficulty_name,
                "chapter_name": chapter_meta["chapter_name"],
                "subject_name": subject_name,
                "time_spent_seconds": answer.time_spent_seconds,
            }
        )

    # Calculate rank and percentile within scope
    filter_cond = Attempt.status == "submitted"
    if attempt.exam_id is not None:
        filter_cond = (Attempt.exam_id == attempt.exam_id) & filter_cond
    elif attempt.chapter_id is not None:
        filter_cond = (Attempt.chapter_id == attempt.chapter_id) & filter_cond

    total_candidates = db.query(Attempt).filter(filter_cond).count()
    current_score = attempt.score or 0.0
    better_scores_count = db.query(Attempt).filter(filter_cond, Attempt.score > current_score).count()
    rank = better_scores_count + 1

    if total_candidates > 0:
        percentile = round(((total_candidates - better_scores_count) / total_candidates) * 100, 2)
    else:
        percentile = 100.0

    return {
        "attempt_id": attempt.id,
        "status": attempt.status,
        "score": attempt.score,
        "total_marks": attempt.total_marks,
        "correct": attempt.correct_count,
        "wrong": attempt.wrong_count,
        "skipped": attempt.skipped_count,
        "accuracy": attempt.accuracy,
        "speed": attempt.speed,
        "elapsed_seconds": attempt.elapsed_seconds,
        "remaining_seconds": attempt.remaining_seconds,
        "subject_analysis": subject_analysis,
        "difficulty_analysis": difficulty_analysis,
        "time_analysis": time_analysis,
        "questions": questions,
        "rank": rank,
        "percentile": percentile,
    }
