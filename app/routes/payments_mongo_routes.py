from fastapi import APIRouter, Depends, Request, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.utils.jwt_handler import get_current_user
from app.services import payments_mongo_service

router = APIRouter()


class CreateOrderPayload(BaseModel):
    amount: float
    currency: Optional[str] = None
    metadata: Optional[dict] = None


class VerifyPayload(BaseModel):
    order_id: str
    payment_id: str
    signature: str


@router.post("/payments/create-order")
def create_order(payload: CreateOrderPayload, current_user=Depends(get_current_user)):
    try:
        res = payments_mongo_service.create_order(str(current_user.id), payload.amount, payload.currency, payload.metadata)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/payments/verify-payment")
def verify_payment(payload: VerifyPayload, current_user=Depends(get_current_user)):
    try:
        return payments_mongo_service.verify_payment(payload.order_id, payload.payment_id, payload.signature, str(current_user.id))
    except payments_mongo_service.PaymentError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/payments/webhook")
async def webhook(request: Request):
    signature = request.headers.get("X-Razorpay-Signature", "")
    raw = await request.body()
    try:
        return payments_mongo_service.handle_webhook(raw, signature)
    except payments_mongo_service.PaymentError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.get("/payments/history")
def history(page: int = 1, limit: int = 20, current_user=Depends(get_current_user)):
    return payments_mongo_service.get_history(str(current_user.id), page, limit)
