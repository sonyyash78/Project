from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class CreateOrderRequest(BaseModel):
    plan_slug: str
    billing_cycle: str = "monthly"
    coupon_code: Optional[str] = None
    use_wallet: bool = False


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None


class CouponValidateRequest(BaseModel):
    code: str
    amount: float = Field(gt=0)


class CouponCreateRequest(BaseModel):
    code: str
    description: Optional[str] = None
    discount_type: str = "percentage"
    discount_value: float
    min_order: float = 0
    max_discount: Optional[float] = None
    max_uses: Optional[int] = None
    expiry_date: Optional[datetime] = None
    is_user_specific: bool = False
    user_id: Optional[int] = None
