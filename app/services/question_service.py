from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.chapter_model import Chapter
from app.models.exam_model import Exam
from app.models.question_model import Question
from app.schemas.question_schema import (
    AnswerResult,
    AnswerSubmit,
    QuestionCreate,
    QuestionPracticeResponse,
    QuestionUpdate,
)


def add_question(db: Session, question_data: QuestionCreate):
    exam = db.query(Exam).filter(Exam.id == question_data.exam_id).first()
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found",
        )

    if question_data.chapter_id is not None:
        chapter = (
            db.query(Chapter).filter(Chapter.id == question_data.chapter_id).first()
        )
        if not chapter:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chapter not found",
            )

    from app.utils.normalization import normalize_entity_name
    
    # Duplicate check
    norm_q = normalize_entity_name(question_data.question)
    existing_questions = db.query(Question.id, Question.question).filter(
        Question.chapter_id == question_data.chapter_id
    ).all()
    
    for q_id, q_text in existing_questions:
        if normalize_entity_name(q_text) == norm_q:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duplicate question exists in this chapter",
            )

    question = Question(
        exam_id=question_data.exam_id,
        chapter_id=question_data.chapter_id,
        question=question_data.question,
        question_type=question_data.question_type,
        option_a=question_data.option_a,
        option_b=question_data.option_b,
        option_c=question_data.option_c,
        option_d=question_data.option_d,
        correct_answer=question_data.correct_answer,
        solution=question_data.solution,
        year=question_data.year,
        exam_session=question_data.exam_session,
        difficulty=question_data.difficulty,
        marks=question_data.marks,
        negative_marks=question_data.negative_marks,
        time=question_data.time,
        topic=question_data.topic,
        language=question_data.language,
        source=question_data.source,
        tags=question_data.tags,
        status=question_data.status,
    )

    db.add(question)
    db.commit()
    db.refresh(question)
    return question


def get_question_by_id(db: Session, question_id: int):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )
    return question


def update_question(db: Session, question_id: int, question_update: QuestionUpdate):
    question = get_question_by_id(db, question_id)

    if question_update.chapter_id is not None:
        chapter = db.query(Chapter).filter(Chapter.id == question_update.chapter_id).first()
        if not chapter and question_update.chapter_id is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chapter not found",
            )
        question.chapter_id = question_update.chapter_id

    if question_update.question is not None:
        question.question = question_update.question
    if question_update.question_type is not None:
        question.question_type = question_update.question_type
    if question_update.option_a is not None:
        question.option_a = question_update.option_a
    if question_update.option_b is not None:
        question.option_b = question_update.option_b
    if question_update.option_c is not None:
        question.option_c = question_update.option_c
    if question_update.option_d is not None:
        question.option_d = question_update.option_d
    if question_update.correct_answer is not None:
        question.correct_answer = question_update.correct_answer
    if question_update.solution is not None:
        question.solution = question_update.solution
    if question_update.year is not None:
        question.year = question_update.year
    if question_update.exam_session is not None:
        question.exam_session = question_update.exam_session
    if question_update.difficulty is not None:
        question.difficulty = question_update.difficulty
    if question_update.marks is not None:
        question.marks = question_update.marks
    if question_update.negative_marks is not None:
        question.negative_marks = question_update.negative_marks
    if question_update.time is not None:
        question.time = question_update.time
    if question_update.topic is not None:
        question.topic = question_update.topic
    if question_update.language is not None:
        question.language = question_update.language
    if question_update.source is not None:
        question.source = question_update.source
    if question_update.tags is not None:
        question.tags = question_update.tags
    if question_update.status is not None:
        question.status = question_update.status

    db.commit()
    db.refresh(question)
    return question


def delete_question(db: Session, question_id: int):
    question = get_question_by_id(db, question_id)
    db.delete(question)
    db.commit()


def get_questions_by_exam(db: Session, exam_id: int, skip: int = 0, limit: int = 50):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found",
        )

    return (
        db.query(Question)
        .filter(Question.exam_id == exam_id)
        .order_by(Question.year.desc(), Question.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_questions_by_chapter(
    db: Session, chapter_id: int, skip: int = 0, limit: int = 50
):
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chapter not found",
        )

    return (
        db.query(Question)
        .filter(Question.chapter_id == chapter_id)
        .order_by(Question.year.desc(), Question.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_practice_questions(
    db: Session, chapter_id: int, limit: int = 10
):
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chapter not found",
        )

    questions = (
        db.query(Question)
        .filter(Question.chapter_id == chapter_id)
        .order_by(Question.id.desc())
        .limit(limit)
        .all()
    )

    return [
        QuestionPracticeResponse.model_validate(question) for question in questions
    ]


def submit_answer(db: Session, payload: AnswerSubmit) -> AnswerResult:
    question = db.query(Question).filter(Question.id == payload.question_id).first()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )

    selected = payload.selected_answer.strip().upper()
    correct = question.correct_answer.strip().upper()

    return AnswerResult(
        question_id=question.id,
        is_correct=selected == correct,
        correct_answer=question.correct_answer,
        solution=question.solution,
    )
