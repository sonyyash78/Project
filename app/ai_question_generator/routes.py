from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List
from sqlalchemy.orm import Session
import time
from app.database.db import get_db
from app.ai_question_generator.schemas import GenerateQuestionsRequest, GeneratedQuestion, SaveGeneratedQuestionsRequest
from app.ai_question_generator.service import generate_questions, save_ai_questions_to_db, get_generation_history, get_generation_stats, delete_generation_history
from app.models.user_model import User
from app.utils.jwt_handler import get_current_user

router = APIRouter(prefix="/api/admin/ai", tags=["AI Generation"])

# Simple rate limiter dictionary for the AI endpoint
_rate_limits = {}

def check_rate_limit(user_id: int):
    now = time.time()
    if user_id in _rate_limits:
        last_request, count = _rate_limits[user_id]
        if now - last_request < 60:
            if count >= 5:
                raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again in a minute.")
            _rate_limits[user_id] = (last_request, count + 1)
        else:
            _rate_limits[user_id] = (now, 1)
    else:
        _rate_limits[user_id] = (now, 1)

@router.post("/generate", response_model=List[GeneratedQuestion])
async def generate_ai_questions(
    request: GenerateQuestionsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
        
    check_rate_limit(current_user.id)
    
    try:
        questions = await generate_questions(request, db)
        return questions
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

@router.post("/save")
def save_ai_questions(
    request: SaveGeneratedQuestionsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        result = save_ai_questions_to_db(db, request)
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save questions: {str(e)}")

@router.get("/history")
def ai_generation_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    history = get_generation_history(db)
    return {"history": history}

@router.delete("/history/{log_id}")
def delete_ai_history(
    log_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    delete_generation_history(db, log_id)
    return {"status": "deleted"}

@router.get("/stats")
def ai_generation_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    stats = get_generation_stats(db)
    return {"stats": stats}


# ── Student Facing AI Features ────────────────────────────────
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.ai_question_generator.gemini import generate_text_explanation
from app.models.question_model import Question

student_ai_router = APIRouter(prefix="/api/ai", tags=["Student AI Tools"])

class ExplainQuestionRequest(BaseModel):
    question_id: Optional[int] = None
    question_text: Optional[str] = None
    options: Optional[Dict[str, str]] = None
    correct_answer: Optional[str] = None
    subject_name: Optional[str] = None

class DiagnoseResultRequest(BaseModel):
    exam_name: str
    score: float
    total_marks: float
    accuracy_percentage: float
    subject_breakdown: Optional[Dict[str, Any]] = None
    weak_chapters: Optional[List[str]] = []

@student_ai_router.post("/explain-question")
async def explain_question_with_ai(
    req: ExplainQuestionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q_text = req.question_text
    options_text = ""
    correct_ans = req.correct_answer or ""
    
    if req.question_id:
        q = db.query(Question).filter(Question.id == req.question_id).first()
        if q:
            q_text = q.question
            correct_ans = q.correct_option or ""
            options_text = f"A: {q.option_a}\nB: {q.option_b}\nC: {q.option_c}\nD: {q.option_d}"
    
    if not q_text:
        raise HTTPException(status_code=400, detail="Question text or ID is required")
        
    prompt = f"""
You are India's top competitive exam mentor & subject expert.
Explain the following question step-by-step with complete clarity:

Question: {q_text}
Options:
{options_text}
Correct Answer: {correct_ans}

Please format your response in clean, beautiful Markdown:
1. **Core Concept / Formula Used**: State the underlying scientific or mathematical principles.
2. **Step-by-Step Solution**: Provide clear, logical steps using LaTeX math where necessary ($...$).
3. **Common Trap / Pitfall**: Explain why students usually pick the wrong option.
4. **Quick Pro-Tip**: A shortcut or memory trick to solve this in under 45 seconds.
Keep the tone encouraging, concise, and pedagogical.
"""
    explanation = await generate_text_explanation(prompt)
    return {"status": "success", "explanation": explanation}

@student_ai_router.post("/diagnose-result")
async def diagnose_test_result(
    req: DiagnoseResultRequest,
    current_user: User = Depends(get_current_user)
):
    prompt = f"""
You are an expert AI Exam Strategy Coach.
Analyze the following test attempt performance for candidate {current_user.name}:

- Target Exam: {req.exam_name}
- Candidate Score: {req.score} / {req.total_marks} ({req.accuracy_percentage:.1f}% accuracy)
- Weak Chapters: {', '.join(req.weak_chapters) if req.weak_chapters else 'None specified'}
- Subject Breakdown: {req.subject_breakdown}

Provide a personalized, encouraging, and actionable **7-Day Score Booster Strategy**:
1. **Performance Verdict**: Quick assessment of current preparation readiness.
2. **Critical Weaknesses**: Pinpoint the high-weightage topics causing negative marks.
3. **7-Day Action Plan**: Day-by-day focused revision blueprint.
4. **Exam Day Mindset Tip**: One psychological trick to manage time and eliminate negative marking.

Format cleanly in Markdown with bold headers and bullet points.
"""
    diagnosis = await generate_text_explanation(prompt)
    return {"status": "success", "diagnosis": diagnosis}
