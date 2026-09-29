from __future__ import annotations

import random
from datetime import datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.chapter_model import Chapter
from app.models.exam_engine_model import Attempt, AttemptAnswer, ExamSetting
from app.models.exam_model import Exam
from app.models.question_model import Question
from app.models.subject_model import Subject


SUPPORTED_MODES = {
    "chapter_practice",
    "subject_practice",
    "exam_practice",
    "daily_quiz",
    "weekly_quiz",
    "previous_year",
    "unlimited_practice",
    "random",
    "custom_mock",
    "scheduled_mock",
    "live_mock",
}


def _get_exam_setting(db: Session, exam_id: int | None) -> ExamSetting | None:
    if not exam_id:
        return None
    return db.query(ExamSetting).filter(ExamSetting.exam_id == exam_id).first()


def _build_question_query(db: Session, payload) -> tuple[list[Question], ExamSetting | None]:
    if payload.mode not in SUPPORTED_MODES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported exam mode")

    query = db.query(Question).join(Exam, Exam.id == Question.exam_id)

    if payload.exam_id is not None:
        query = query.filter(Question.exam_id == payload.exam_id)
    if payload.subject_id is not None:
        query = query.join(Chapter, Chapter.id == Question.chapter_id).join(Subject, Subject.id == Chapter.subject_id)
        query = query.filter(Subject.id == payload.subject_id)
    if payload.chapter_id is not None:
        query = query.filter(Question.chapter_id == payload.chapter_id)
    if payload.difficulty:
        query = query.filter(func.lower(Question.difficulty) == payload.difficulty.lower())
    if payload.year is not None:
        query = query.filter(Question.year == payload.year)
    if payload.question_types:
        query = query.filter(Question.question_type.in_(payload.question_types))

    if payload.mode == "daily_quiz":
        query = query.order_by(Question.year.desc().nullslast(), Question.id.desc())
        payload.question_count = min(payload.question_count, 10)
    elif payload.mode == "weekly_quiz":
        query = query.order_by(Question.year.desc().nullslast(), Question.id.desc())
        payload.question_count = min(payload.question_count, 25)
    elif payload.mode == "previous_year" and payload.year is None:
        query = query.filter(Question.year.isnot(None)).order_by(Question.year.desc(), Question.id.desc())
    else:
        query = query.order_by(Question.id.desc())

    questions = query.limit(max(payload.question_count * 4, payload.question_count)).all()
    if not questions:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No questions found for the selected configuration")

    if payload.shuffle_questions or payload.mode in {"random", "custom_mock", "live_mock"}:
        random.shuffle(questions)

    questions = questions[: payload.question_count]
    return questions, _get_exam_setting(db, payload.exam_id)


def _question_payload(question: Question, shuffle_options: bool) -> dict:
    options = [
        {"key": "A", "text": question.option_a},
        {"key": "B", "text": question.option_b},
        {"key": "C", "text": question.option_c},
        {"key": "D", "text": question.option_d},
    ]
    options = [option for option in options if option["text"]]
    if shuffle_options:
        random.shuffle(options)

    return {
        "id": question.id,
        "question": question.question,
        "question_type": question.question_type,
        "difficulty": question.difficulty,
        "marks": question.marks,
        "negative_marks": question.negative_marks,
        "topic": question.topic,
        "year": question.year,
        "chapter_id": question.chapter_id,
        "options": options,
    }


def start_attempt(db: Session, user_id: int, payload):
    if payload.resume_attempt_id:
        return get_attempt_session(db, user_id, payload.resume_attempt_id)

    questions, exam_setting = _build_question_query(db, payload)
    duration_minutes = payload.time_limit_minutes or (exam_setting.duration_minutes if exam_setting else None) or max(5, len(questions) * 2)
    duration_seconds = duration_minutes * 60
    total_marks = sum((question.marks or 4.0) for question in questions)

    attempt = Attempt(
        user_id=user_id,
        exam_id=payload.exam_id,
        subject_id=payload.subject_id,
        chapter_id=payload.chapter_id,
        exam_setting_id=exam_setting.id if exam_setting else None,
        mode=payload.mode,
        status="in_progress",
        total_questions=len(questions),
        duration_seconds=duration_seconds,
        remaining_seconds=duration_seconds,
        total_marks=total_marks,
        config_snapshot={
            "difficulty": payload.difficulty,
            "question_count": payload.question_count,
            "shuffle_questions": payload.shuffle_questions,
            "shuffle_options": payload.shuffle_options,
            "question_ids": [question.id for question in questions],
        },
        expires_at=datetime.utcnow() + timedelta(seconds=duration_seconds),
    )
    db.add(attempt)
    db.flush()

    for question in questions:
        db.add(
            AttemptAnswer(
                attempt_id=attempt.id,
                question_id=question.id,
                hidden_options=[],
                eliminated_options=[],
            )
        )

    db.commit()
    return get_attempt_session(db, user_id, attempt.id)


def get_attempt_session(db: Session, user_id: int, attempt_id: int):
    attempt = (
        db.query(Attempt)
        .options(joinedload(Attempt.answers).joinedload(AttemptAnswer.question))
        .filter(Attempt.id == attempt_id, Attempt.user_id == user_id)
        .first()
    )
    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")

    config = attempt.config_snapshot or {}
    shuffle_options = bool(config.get("shuffle_options"))

    return {
        "attempt_id": attempt.id,
        "mode": attempt.mode,
        "status": attempt.status,
        "exam_id": attempt.exam_id,
        "subject_id": attempt.subject_id,
        "chapter_id": attempt.chapter_id,
        "duration_seconds": attempt.duration_seconds,
        "remaining_seconds": attempt.remaining_seconds,
        "elapsed_seconds": attempt.elapsed_seconds,
        "started_at": attempt.started_at,
        "last_saved_at": attempt.last_saved_at,
        "questions": [
            {
                **_question_payload(answer.question, shuffle_options),
                "selected_answer": answer.selected_answer,
                "visited": answer.visited,
                "is_marked_for_review": answer.is_marked_for_review,
                "is_bookmarked": answer.is_bookmarked,
                "hidden_options": answer.hidden_options or [],
                "eliminated_options": answer.eliminated_options or [],
                "time_spent_seconds": answer.time_spent_seconds,
            }
            for answer in attempt.answers
            if answer.question
        ],
    }


def save_attempt_answer(db: Session, user_id: int, attempt_id: int, payload):
    answer = (
        db.query(AttemptAnswer)
        .join(Attempt, Attempt.id == AttemptAnswer.attempt_id)
        .filter(AttemptAnswer.attempt_id == attempt_id, Attempt.user_id == user_id, AttemptAnswer.question_id == payload.question_id)
        .first()
    )
    if not answer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt answer row not found")

    if answer.selected_answer != payload.selected_answer:
        answer.answer_changes += 1

    answer.selected_answer = payload.selected_answer
    answer.visited = payload.visited
    answer.is_marked_for_review = payload.is_marked_for_review
    answer.is_bookmarked = payload.is_bookmarked
    answer.hidden_options = payload.hidden_options or []
    answer.eliminated_options = payload.eliminated_options or []
    answer.time_spent_seconds = payload.time_spent_seconds
    answer.skipped = payload.selected_answer in (None, "")
    answer.last_answered_at = datetime.utcnow()

    attempt = db.query(Attempt).filter(Attempt.id == attempt_id, Attempt.user_id == user_id).first()
    attempt.last_saved_at = datetime.utcnow()

    db.commit()
    return {"status": "saved", "attempt_id": attempt_id, "question_id": payload.question_id}


def submit_attempt(db: Session, user_id: int, attempt_id: int, payload):
    attempt = (
        db.query(Attempt)
        .options(joinedload(Attempt.answers).joinedload(AttemptAnswer.question))
        .filter(Attempt.id == attempt_id, Attempt.user_id == user_id)
        .first()
    )
    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")

    if attempt.status == "submitted":
        return attempt

    score = 0.0
    correct = 0
    wrong = 0
    skipped = 0

    for answer in attempt.answers:
        question = answer.question
        if not question:
            continue
        if answer.selected_answer in (None, ""):
            skipped += 1
            answer.skipped = True
            answer.is_correct = False
            continue

        is_correct = answer.selected_answer.strip().upper() == question.correct_answer.strip().upper()
        answer.is_correct = is_correct
        if is_correct:
            correct += 1
            score += question.marks or 4.0
        else:
            wrong += 1
            score += question.negative_marks or -1.0

    attempted = correct + wrong
    attempt.status = "submitted"
    attempt.elapsed_seconds = payload.elapsed_seconds
    attempt.remaining_seconds = payload.remaining_seconds
    attempt.submitted_at = datetime.utcnow()
    attempt.last_saved_at = datetime.utcnow()
    attempt.score = round(score, 2)
    attempt.correct_count = correct
    attempt.wrong_count = wrong
    attempt.skipped_count = skipped
    attempt.accuracy = round((correct / attempted) * 100, 2) if attempted else 0.0
    attempt.speed = round((attempted / max(payload.elapsed_seconds, 1)) * 60, 2)

    db.commit()
    db.refresh(attempt)
    return attempt
