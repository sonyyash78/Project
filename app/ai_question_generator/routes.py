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
