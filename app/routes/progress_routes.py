from datetime import datetime, date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, Integer
from sqlalchemy.orm import Session, joinedload

from app.database.db import get_db
from app.models.user_model import User
from app.models.question_model import Question
from app.models.chapter_model import Chapter
from app.models.subject_model import Subject
from app.models.exam_model import Exam
from app.models.progress_model import Bookmark, TestAttempt, QuestionAttempt
from app.utils.jwt_handler import get_current_user

router = APIRouter(prefix="/api/progress", tags=["User Progress & Analytics"])


# --- Request/Response Schemas ---
class QAttemptSubmit(BaseModel):
    question_id: int
    selected_answer: Optional[str] = None  # None if skipped
    time_spent: int = 0                    # in seconds


class TestAttemptSubmit(BaseModel):
    test_type: str                         # "practice" or "mock"
    target_id: int                         # chapter_id if practice, exam_id if mock
    time_taken: int                        # in seconds
    question_attempts: List[QAttemptSubmit]


# --- Helper to compute streaks ---
def calculate_streak(user_id: int, db: Session) -> int:
    # Get all distinct submit dates for this user, sorted descending
    attempts = (
        db.query(func.date(TestAttempt.submitted_at))
        .filter(TestAttempt.user_id == user_id)
        .distinct()
        .order_by(func.date(TestAttempt.submitted_at).desc())
        .all()
    )
    if not attempts:
        return 0

    dates = [a[0] for a in attempts]
    
    # Standardize dates to datetime.date objects
    # Note: SQLite returns strings or date objects depending on dialect. Let's convert to date objects.
    parsed_dates = []
    for d in dates:
        if isinstance(d, str):
            parsed_dates.append(datetime.strptime(d, "%Y-%m-%d").date())
        else:
            parsed_dates.append(d)

    today = date.today()
    yesterday = today - timedelta(days=1)

    # If the user hasn't active today or yesterday, streak is broken
    if parsed_dates[0] not in (today, yesterday):
        return 0

    streak = 1
    for i in range(len(parsed_dates) - 1):
        diff = parsed_dates[i] - parsed_dates[i+1]
        if diff.days == 1:
            streak += 1
        elif diff.days > 1:
            break  # Gap in streak

    return streak


# --- Endpoints ---

@router.get("/dashboard")
def get_progress_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id
    
    # 1. Compute streak
    streak = calculate_streak(user_id, db)
    
    # 2. Aggregates
    attempts = db.query(TestAttempt).filter(TestAttempt.user_id == user_id).all()
    total_attempts = len(attempts)
    
    overall_accuracy = 0.0
    avg_score = 0.0
    total_correct = 0
    total_incorrect = 0
    total_skipped = 0
    
    if total_attempts > 0:
        overall_accuracy = sum(a.accuracy for a in attempts) / total_attempts
        avg_score = sum(a.score for a in attempts) / total_attempts
        total_correct = sum(a.correct_count for a in attempts)
        total_incorrect = sum(a.incorrect_count for a in attempts)
        total_skipped = sum(a.skipped_count for a in attempts)

    total_bookmarks = db.query(Bookmark).filter(Bookmark.user_id == user_id).count()

    # 3. Weak & Strong Chapters
    # We look at all question attempts by user, group by chapter_id
    chapter_stats = (
        db.query(
            Question.chapter_id,
            func.count(QuestionAttempt.id).label("total"),
            func.sum(func.cast(QuestionAttempt.is_correct, Integer)).label("correct")
        )
        .join(QuestionAttempt, QuestionAttempt.question_id == Question.id)
        .join(TestAttempt, TestAttempt.id == QuestionAttempt.attempt_id)
        .filter(TestAttempt.user_id == user_id)
        .filter(Question.chapter_id.isnot(None))
        .group_by(Question.chapter_id)
        .all()
    )

    weak_chapters = []
    strong_chapters = []
    
    for row in chapter_stats:
        chap_id, total, correct = row
        if total > 0:
            acc = (correct / total) * 100
            chapter = db.query(Chapter).filter(Chapter.id == chap_id).first()
            if chapter:
                chap_data = {
                    "chapter_id": chap_id,
                    "name": chapter.name,
                    "accuracy": acc,
                    "total_answered": total
                }
                if acc < 50:
                    weak_chapters.append(chap_data)
                elif acc >= 80:
                    strong_chapters.append(chap_data)

    # 4. Recent Activity
    recent_activity = []
    recent_attempts = (
        db.query(TestAttempt)
        .filter(TestAttempt.user_id == user_id)
        .order_by(TestAttempt.submitted_at.desc())
        .limit(5)
        .all()
    )
    for a in recent_attempts:
        target_name = "Practice Set"
        if a.test_type == "practice":
            chapter = db.query(Chapter).filter(Chapter.id == a.target_id).first()
            if chapter:
                target_name = f"Practice: {chapter.name}"
        else:
            exam = db.query(Exam).filter(Exam.id == a.target_id).first()
            if exam:
                target_name = f"Mock: {exam.exam_name}"

        recent_activity.append({
            "attempt_id": a.id,
            "title": target_name,
            "score": a.score,
            "total": a.total_marks,
            "accuracy": a.accuracy,
            "test_type": a.test_type,
            "submitted_at": a.submitted_at
        })

    return {
        "streak": streak,
        "total_tests_attempted": total_attempts,
        "overall_accuracy": overall_accuracy,
        "average_score": avg_score,
        "total_bookmarks": total_bookmarks,
        "totals": {
            "correct": total_correct,
            "incorrect": total_incorrect,
            "skipped": total_skipped
        },
        "weak_chapters": weak_chapters[:5],
        "strong_chapters": strong_chapters[:5],
        "recent_activity": recent_activity
    }


@router.post("/test-attempts")
def save_test_attempt(
    payload: TestAttemptSubmit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id
    
    # 1. Fetch target marking scheme
    pos_marks = 4.0
    neg_marks = -1.0
    
    if payload.test_type == "mock":
        exam = db.query(Exam).filter(Exam.id == payload.target_id).first()
        if exam:
            pos_marks = getattr(exam, 'positive_marks', 4.0) or 4.0
            neg_marks = getattr(exam, 'negative_marks', -1.0) or -1.0
            
    # 2. Evaluate question attempts
    score = 0.0
    total_marks = 0.0
    correct_count = 0
    incorrect_count = 0
    skipped_count = 0
    
    attempts_to_save = []
    
    for qa in payload.question_attempts:
        question = db.query(Question).filter(Question.id == qa.question_id).first()
        if not question:
            continue
            
        q_pos = getattr(question, 'marks', pos_marks) or pos_marks
        q_neg = getattr(question, 'negative_marks', neg_marks) or neg_marks
        
        total_marks += q_pos
        
        is_skipped = qa.selected_answer is None or qa.selected_answer == ""
        
        if is_skipped:
            skipped_count += 1
            attempts_to_save.append(QuestionAttempt(
                question_id=qa.question_id,
                selected_answer=None,
                is_correct=False,
                time_spent=qa.time_spent
            ))
        else:
            is_correct = qa.selected_answer.strip().upper() == question.correct_answer.strip().upper()
            if is_correct:
                score += q_pos
                correct_count += 1
            else:
                score += q_neg
                incorrect_count += 1
                
            attempts_to_save.append(QuestionAttempt(
                question_id=qa.question_id,
                selected_answer=qa.selected_answer,
                is_correct=is_correct,
                time_spent=qa.time_spent
            ))

    # Calculate overall accuracy
    attempted_count = correct_count + incorrect_count
    accuracy = (correct_count / attempted_count) * 100 if attempted_count > 0 else 0.0

    # 3. Save TestAttempt record
    test_attempt = TestAttempt(
        user_id=user_id,
        test_type=payload.test_type,
        target_id=payload.target_id,
        score=max(0.0, score), # Avoid negative final scores on display
        total_marks=total_marks,
        correct_count=correct_count,
        incorrect_count=incorrect_count,
        skipped_count=skipped_count,
        accuracy=accuracy,
        time_taken=payload.time_taken,
        submitted_at=datetime.utcnow()
    )
    
    db.add(test_attempt)
    db.flush()  # Generate attempt_id
    
    # 4. Attach and save question attempts
    for qa_obj in attempts_to_save:
        qa_obj.attempt_id = test_attempt.id
        db.add(qa_obj)
        
    db.commit()
    db.refresh(test_attempt)
    
    return test_attempt


@router.get("/test-attempts/{attempt_id}")
def get_attempt_details(
    attempt_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    attempt = (
        db.query(TestAttempt)
        .filter(TestAttempt.id == attempt_id)
        .filter(TestAttempt.user_id == current_user.id)
        .first()
    )
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test attempt record not found."
        )

    # Fetch question attempts with eager-loaded questions (eliminates N+1)
    q_attempts = (
        db.query(QuestionAttempt)
        .options(joinedload(QuestionAttempt.question))
        .filter(QuestionAttempt.attempt_id == attempt_id)
        .all()
    )
    
    # Batch-fetch all chapter IDs and their subjects in one query
    chapter_ids = set()
    for qa in q_attempts:
        if qa.question and qa.question.chapter_id:
            chapter_ids.add(qa.question.chapter_id)
    
    # Build chapter_id -> subject_name map in one query
    chapter_subject_map = {}
    if chapter_ids:
        rows = (
            db.query(Chapter.id, Subject.name)
            .join(Subject, Subject.id == Chapter.subject_id)
            .filter(Chapter.id.in_(chapter_ids))
            .all()
        )
        chapter_subject_map = {r[0]: r[1] for r in rows}
    
    question_breakdowns = []
    subject_accuracy = {}
    
    for qa in q_attempts:
        q = qa.question
        if not q:
            continue
            
        question_breakdowns.append({
            "question_id": q.id,
            "question_text": q.question,
            "option_a": q.option_a,
            "option_b": q.option_b,
            "option_c": q.option_c,
            "option_d": q.option_d,
            "correct_answer": q.correct_answer,
            "solution": q.solution,
            "selected_answer": qa.selected_answer,
            "is_correct": qa.is_correct,
            "time_spent": qa.time_spent
        })
        
        # Subject accuracy using pre-fetched map
        subject_name = chapter_subject_map.get(q.chapter_id, "General")
        if subject_name not in subject_accuracy:
            subject_accuracy[subject_name] = {"correct": 0, "total": 0}
        subject_accuracy[subject_name]["total"] += 1
        if qa.is_correct:
            subject_accuracy[subject_name]["correct"] += 1
            
    subject_stats = [
        {
            "subject_name": s_name,
            "correct": data["correct"],
            "total": data["total"],
            "accuracy": (data["correct"] / data["total"]) * 100 if data["total"] > 0 else 0
        }
        for s_name, data in subject_accuracy.items()
    ]

    return {
        "attempt_info": {
            "id": attempt.id,
            "test_type": attempt.test_type,
            "score": attempt.score,
            "total_marks": attempt.total_marks,
            "correct_count": attempt.correct_count,
            "incorrect_count": attempt.incorrect_count,
            "skipped_count": attempt.skipped_count,
            "accuracy": attempt.accuracy,
            "time_taken": attempt.time_taken,
            "submitted_at": attempt.submitted_at
        },
        "questions": question_breakdowns,
        "subject_breakdown": subject_stats
    }


@router.post("/bookmark/{question_id}")
def toggle_bookmark(
    question_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify question exists
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
        
    existing = (
        db.query(Bookmark)
        .filter(Bookmark.user_id == current_user.id)
        .filter(Bookmark.question_id == question_id)
        .first()
    )
    
    if existing:
        db.delete(existing)
        db.commit()
        return {"status": "unbookmarked", "question_id": question_id}
    else:
        new_bookmark = Bookmark(user_id=current_user.id, question_id=question_id)
        db.add(new_bookmark)
        db.commit()
        return {"status": "bookmarked", "question_id": question_id}


@router.get("/bookmarks")
def get_user_bookmarks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Eager-load questions to avoid N+1
    bookmarks = (
        db.query(Bookmark)
        .options(joinedload(Bookmark.question))
        .filter(Bookmark.user_id == current_user.id)
        .all()
    )
    
    results = []
    for b in bookmarks:
        q = b.question
        if not q:
            continue
        results.append({
            "bookmark_id": b.id,
            "question_id": q.id,
            "question": q.question,
            "option_a": q.option_a,
            "option_b": q.option_b,
            "option_c": q.option_c,
            "option_d": q.option_d,
            "correct_answer": q.correct_answer,
            "solution": q.solution,
            "created_at": b.created_at
        })
        
    return results


@router.get("/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    # Group test attempts by user_id, sum scores
    ranks = (
        db.query(
            TestAttempt.user_id,
            func.sum(TestAttempt.score).label("total_score"),
            func.avg(TestAttempt.accuracy).label("avg_accuracy"),
            func.count(TestAttempt.id).label("tests_taken")
        )
        .group_by(TestAttempt.user_id)
        .order_by(func.sum(TestAttempt.score).desc())
        .limit(10)
        .all()
    )
    
    results = []
    for index, row in enumerate(ranks):
        u_id, score_sum, avg_acc, count = row
        user = db.query(User).filter(User.id == u_id).first()
        if user:
            results.append({
                "rank": index + 1,
                "name": user.name,
                "email": user.email,
                "total_score": score_sum,
                "avg_accuracy": avg_acc,
                "tests_taken": count
            })
            
    return results
