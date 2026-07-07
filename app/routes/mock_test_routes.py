import random
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.exam_model import Exam
from app.models.question_model import Question

router = APIRouter(prefix="/api/exams", tags=["Mock Tests"])


@router.get("/{exam_id}/mock-test")
def generate_mock_test(exam_id: int, db: Session = Depends(get_db)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found"
        )

    # 1. Fetch all question IDs for this exam
    all_q_ids = [q.id for q in db.query(Question.id).filter(Question.exam_id == exam_id).all()]
    if not all_q_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No questions found for this exam to generate a mock test."
        )

    # 2. Sample up to 30 questions randomly
    sample_size = min(len(all_q_ids), 30)
    sampled_ids = random.sample(all_q_ids, sample_size)
    questions = db.query(Question).filter(Question.id.in_(sampled_ids)).all()

    # 3. Format response without exposing correct answers
    formatted_questions = []
    total_time_seconds = 0
    
    # Use exam-level marking defaults or question-level custom markings
    pos_marks = getattr(exam, 'positive_marks', 4.0)
    if pos_marks is None:
        pos_marks = 4.0
    neg_marks = getattr(exam, 'negative_marks', -1.0)
    if neg_marks is None:
        neg_marks = -1.0

    for q in questions:
        q_time = q.time if getattr(q, 'time', None) is not None else 60
        total_time_seconds += q_time
        
        formatted_questions.append({
            "id": q.id,
            "question": q.question,
            "question_type": q.question_type or "mcq",
            "option_a": q.option_a,
            "option_b": q.option_b,
            "option_c": q.option_c,
            "option_d": q.option_d,
            "difficulty": getattr(q, 'difficulty', 'Medium') or 'Medium',
            "marks": getattr(q, 'marks', pos_marks) or pos_marks,
            "negative_marks": getattr(q, 'negative_marks', neg_marks) or neg_marks,
            "topic": getattr(q, 'topic', None),
            "chapter_id": q.chapter_id,
        })

    # Return mock test configuration
    return {
        "exam_id": exam.id,
        "exam_name": exam.exam_name,
        "category": exam.category,
        "questions": formatted_questions,
        "total_questions": len(formatted_questions),
        "duration_minutes": max(5, round(total_time_seconds / 60)),  # dynamic duration based on questions
        "positive_marks_default": pos_marks,
        "negative_marks_default": neg_marks
    }
