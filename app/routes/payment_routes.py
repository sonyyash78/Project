from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.user_model import User
from app.schemas.payment_schema import CreateOrderRequest, VerifyPaymentRequest
from app.services import payment_service
from app.utils.jwt_handler import get_current_user

router = APIRouter(prefix="/api/payments", tags=["Payments"])


@router.post("/create-order")
def initialize_checkout(
    payload: CreateOrderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return payment_service.create_checkout_order(
            db,
            current_user.id,
            payload.plan_slug,
            payload.billing_cycle,
            payload.coupon_code,
            payload.use_wallet,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/verify")
def verify_payment(
    payload: VerifyPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return payment_service.verify_and_activate(
            db,
            current_user.id,
            payload.model_dump(),
            current_user.name,
            current_user.email,
        )
    except payment_service.PaymentSecurityError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhook")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    try:
        return payment_service.process_webhook(db, body, signature)
    except payment_service.PaymentSecurityError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.get("/history")
def payment_history(
    page: int = 1,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return payment_service.get_payment_history(db, current_user.id, page, limit)


@router.post("/retry/{payment_id}")
def retry_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return payment_service.retry_payment(db, payment_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
