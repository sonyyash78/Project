
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.models.user_model import User
from app.utils.jwt_handler import get_current_user
from sqlalchemy import text

def verify_exam_access(exam_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == 'admin':
        return current_user
    
    # Check if user has global subscription (legacy)
    if current_user.subscription_plan and current_user.subscription_plan != 'free':
        if current_user.premium_until:
            from datetime import datetime
            if current_user.premium_until > datetime.utcnow():
                return current_user

    # Check if user has exam-specific subscription
    res = db.execute(text("SELECT id FROM user_exam_subscriptions WHERE user_id = :uid AND exam_id = :eid AND valid_until > NOW()"), {"uid": current_user.id, "eid": exam_id}).fetchone()
    if res:
        return current_user

    raise HTTPException(status_code=403, detail="Purchase required to access this exam.")
