from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.user_model import User
from app.services import wallet_service
from app.utils.jwt_handler import get_current_user

router = APIRouter(prefix="/api/wallet", tags=["Wallet"])


@router.get("/")
def get_wallet(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return wallet_service.get_wallet_details(db, current_user.id)


@router.get("/transactions")
def wallet_transactions(
    page: int = 1,
    limit: int = 20,
    type: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return wallet_service.get_transactions(db, current_user.id, page, limit, type)
