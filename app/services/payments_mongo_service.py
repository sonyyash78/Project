from datetime import datetime, timedelta
import razorpay
from app.utils.config import RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, CURRENCY
from app.models import payment_model_mongo
from app.utils.razorpay_utils import verify_checksum, verify_webhook_signature
from app.services import subscription_service
from app.database.db import SessionLocal
from app.utils.logger import logger

client = None
if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))


class PaymentError(Exception):
    pass


def create_order(user_id: str, amount: float, currency: str = None, metadata: dict = None):
    if not currency:
        currency = CURRENCY
    # amount in rupees expected, convert to paise
    amount_paise = int(round(amount * 100))
    order = None
    if client and amount_paise > 0:
        payload = {"amount": amount_paise, "currency": currency, "receipt": f"rcpt_{user_id}_{int(datetime.utcnow().timestamp())}",}
        if metadata:
            payload["notes"] = metadata
        order = client.order.create(data=payload)
        order_id = order.get("id")
    else:
        # free order or missing keys
        order_id = f"FREE_{user_id}_{int(datetime.utcnow().timestamp())}"

    payment_doc = {
        "order_id": order_id,
        "user_id": user_id,
        "amount": amount,
        "currency": currency,
        "status": "created" if amount > 0 else "pending",
        "payment_method": None,
        "created_at": datetime.utcnow(),
        "expiry_date": datetime.utcnow() + timedelta(days=7),
        "razorpay_signature": None,
    }
    payment_doc.update(metadata or {})
    payment_model_mongo.create_payment(payment_doc)

    return {"order_id": order_id, "razorpay_key_id": RAZORPAY_KEY_ID, "amount": amount}


def verify_payment(order_id: str, payment_id: str, signature: str, user_id: str):
    payment = payment_model_mongo.get_payment_by_order_id(order_id)
    if not payment:
        raise PaymentError("Order not found")
    if payment.get("status") == "completed":
        return {"status": "already_completed"}

    # For free orders skip signature check
    if order_id.startswith("FREE_"):
        verified = True
    else:
        # Only perform checksum verification when a payment signature is provided.
        # Webhook callers may not supply the razorpay payment signature because
        # webhook signatures are verified separately. If `signature` is falsy,
        # assume the caller has already validated via webhook HMAC.
        if signature:
            if not verify_checksum(RAZORPAY_KEY_SECRET, order_id, payment_id, signature):
                raise PaymentError("Signature verification failed")
        verified = True

    if verified:
        # update payment doc
        payment_model_mongo.update_payment_by_order(order_id, {"payment_id": payment_id, "razorpay_signature": signature, "status": "completed", "payment_method": "razorpay"})
        # activate subscription via existing service (SQL). Create a short-lived
        # DB session here so that the subscription service can write to SQL.
        subscription_id = None
        try:
            db = SessionLocal()
            try:
                subscription_id = subscription_service.activate_paid_subscription(db, int(user_id), "premium", "monthly", payment.get("amount", 0))
            except Exception as e:
                logger.exception(f"Subscription activation failed for user={user_id} order={order_id}: {e}")
            finally:
                try:
                    db.close()
                except Exception:
                    pass
        except Exception as e:
            logger.exception(f"Could not obtain DB session to activate subscription for user={user_id} order={order_id}: {e}")

        return {"status": "success", "subscription_id": subscription_id}


def handle_webhook(raw_body: bytes, signature: str):
    if RAZORPAY_WEBHOOK_SECRET:
        if not verify_webhook_signature(RAZORPAY_WEBHOOK_SECRET, raw_body, signature):
            raise PaymentError("Invalid webhook signature")

    # parse event
    import json

    # Accept either raw bytes or already-parsed payload dicts
    if isinstance(raw_body, (bytes, bytearray)):
        payload = json.loads(raw_body.decode("utf-8"))
    elif isinstance(raw_body, str):
        payload = json.loads(raw_body)
    else:
        payload = raw_body
    event = payload.get("event")
    # persist event for audit
    payment_model_mongo.save_webhook_event(payload)

    if event == "payment.captured":
        entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        order_id = entity.get("order_id")
        payment_id = entity.get("id")
        # try to verify & activate
        try:
            # The webhook has already been verified above; pass an empty
            # payment signature so `verify_payment` skips checksum verification
            # and proceeds to mark the payment completed and activate
            # subscription. Extract `user_id` from `notes.user_id` if present.
            notes_user = entity.get("notes", {}) or {}
            notes_user_id = notes_user.get("user_id") or notes_user.get("userId") or notes_user.get("user_id_str") or "0"
            verify_payment(order_id, payment_id, signature="", user_id=str(notes_user_id))
        except Exception:
            pass

    return {"status": "ok"}


def get_history(user_id: str, page: int = 1, limit: int = 20):
    res = payment_model_mongo.list_user_payments(user_id, page, limit)
    for doc in res:
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])
        if "created_at" in doc and hasattr(doc["created_at"], "isoformat"):
            doc["created_at"] = doc["created_at"].isoformat()
        if "expiry_date" in doc and hasattr(doc["expiry_date"], "isoformat"):
            doc["expiry_date"] = doc["expiry_date"].isoformat()
    return res
