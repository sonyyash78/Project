from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.user_model import User
from app.services import referral_service
from app.utils.jwt_handler import get_current_user

router = APIRouter(prefix="/api/referrals", tags=["Referrals"])


class ApplyReferralRequest(BaseModel):
    code: str


@router.get("/my-code")
def get_referral_code(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    code = referral_service.generate_referral_code(db, current_user.id)
    return {"referral_code": code}


@router.get("/stats")
def referral_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return referral_service.get_referral_dashboard(db, current_user.id)


@router.post("/apply")
def apply_referral(
    payload: ApplyReferralRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return referral_service.apply_referral_code(db, current_user.id, payload.code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
