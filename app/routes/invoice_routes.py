from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.user_model import User
from app.services import invoice_service
from app.utils.jwt_handler import get_current_user

router = APIRouter(prefix="/api/invoices", tags=["Invoices"])


@router.get("/")
def list_invoices(
    page: int = 1,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return {"invoices": invoice_service.get_user_invoices(db, current_user.id, page, limit)}


@router.get("/{invoice_id}")
def get_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return invoice_service.get_invoice(db, invoice_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
