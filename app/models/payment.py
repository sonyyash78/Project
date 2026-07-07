from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class PaymentModel(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    payment_id: Optional[str] = None
    order_id: str
    user_id: str
    amount: float  # Stored in actual currency unit (e.g., 499.00)
    currency: str = "INR"
    status: str  # created, captured, failed
    payment_method: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expiry_date: Optional[datetime] = None
    razorpay_signature: Optional[str] = None

class UserModel(BaseModel):
    id: str = Field(..., alias="_id")
    email: str
    is_premium: bool = False
    premium_expiry: Optional[datetime] = None