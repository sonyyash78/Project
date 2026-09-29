from pydantic import BaseModel

class CreateOrderRequest(BaseModel):
    amount: float  # Front-end passes main value (e.g. 499.00)

class CreateOrderResponse(BaseModel):
    order_id: str
    amount: int  # In paise for Razorpay
    currency: str
    key_id: str

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str