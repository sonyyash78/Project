import razorpay
import hmac
import hashlib
from fastapi import HTTPException, status
from app.utils.config import RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET

client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

def create_razorpay_order(amount_in_paise: int, currency: str = "INR") -> dict:
    try:
        data = {
            "amount": amount_in_paise,
            "currency": currency,
            "payment_capture": 1  # Auto capture payment
        }
        order = client.order.create(data=data)
        return order
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Razorpay Order Creation Failed: {str(e)}"
        )

def verify_payment_signature(order_id: str, payment_id: str, signature: str) -> bool:
    try:
        params_dict = {
            'razorpay_order_id': order_id,
            'razorpay_payment_id': payment_id,
            'razorpay_signature': signature
        }
        client.utility.verify_payment_signature(params_dict)
        return True
    except razorpay.errors.SignatureVerificationError:
        return False

def verify_webhook_signature(payload: bytes, signature: str) -> bool:
    try:
        expected_signature = hmac.new(
            key=RAZORPAY_WEBHOOK_SECRET.encode('utf-8'),
            msg=payload,
            digestmod=hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected_signature, signature)
    except Exception:
        return False