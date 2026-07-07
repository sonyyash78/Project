import hashlib
import hmac

import razorpay

from app.models import coupon_model, payment_model, referral_model, subscription_model, wallet_model
from app.services import subscription_service
from app.utils.config import GST_RATE, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET

client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)) if RAZORPAY_KEY_ID else None


class PaymentSecurityError(Exception):
    pass


def create_checkout_order(db, user_id: int, plan_slug: str, billing_cycle: str, coupon_code=None, use_wallet=False):
    plan = subscription_model.get_plan_by_slug(db, plan_slug)
    if not plan:
        raise ValueError("Plan not found.")

    base_price = plan["monthly_price"] if billing_cycle == "monthly" else plan["yearly_price"]
    discount = 0.0
    coupon_id = None

    if coupon_code:
        coupon, err = coupon_model.validate_coupon(db, coupon_code, user_id, base_price)
        if err:
            raise ValueError(err)
        coupon_id = coupon["id"]
        if coupon["discount_type"] == "percentage":
            discount = base_price * (coupon["discount_value"] / 100.0)
        else:
            discount = coupon["discount_value"]
        if coupon["max_discount"]:
            discount = min(discount, coupon["max_discount"])

    payable_before_wallet = max(0.0, base_price - discount)
    wallet_applied = 0.0

    if use_wallet and payable_before_wallet > 0:
        wallet = wallet_model.get_or_create_wallet(db, user_id)
        wallet_applied = min(payable_before_wallet, wallet["balance"])

    final_subtotal = payable_before_wallet - wallet_applied
    gst_calculated = final_subtotal * (GST_RATE / 100.0)
    gross_total = final_subtotal + gst_calculated

    rz_order_id = f"FREE_{user_id}_{plan_slug}_{int(datetime_now_ts())}"
    if gross_total > 0.0 and client:
        order_payload = {
            "amount": int(round(gross_total * 100)),
            "currency": "INR",
            "receipt": f"rcpt_{user_id}_{int(datetime_now_ts())}",
        }
        razorpay_order = client.order.create(data=order_payload)
        rz_order_id = razorpay_order["id"]

    payment_model.create_payment(
        db,
        {
            "user_id": user_id,
            "razorpay_order_id": rz_order_id,
            "amount": gross_total,
            "coupon_id": coupon_id,
            "coupon_discount": discount,
            "wallet_amount_used": wallet_applied,
            "plan_slug": plan_slug,
            "billing_cycle": billing_cycle,
            "status": "created" if gross_total > 0.0 else "pending",
        },
    )

    return {
        "razorpay_order_id": rz_order_id,
        "razorpay_key_id": RAZORPAY_KEY_ID,
        "gross_total": gross_total,
        "subtotal": final_subtotal,
        "gst_amount": gst_calculated,
        "discount": discount,
        "wallet_subtracted": wallet_applied,
        "plan_slug": plan_slug,
        "billing_cycle": billing_cycle,
    }


def datetime_now_ts():
    from datetime import datetime
    return datetime.now().timestamp()


def verify_and_activate(db, user_id: int, payload: dict, billing_name: str, billing_email: str):
    rz_order_id = payload["razorpay_order_id"]
    rz_payment_id = payload.get("razorpay_payment_id", "")
    rz_sig = payload.get("razorpay_signature", "")

    payment = payment_model.get_payment_by_order_id(db, rz_order_id)
    if not payment:
        raise ValueError("Payment not found.")
    if payment["user_id"] != user_id:
        raise ValueError("Payment does not belong to this user.")
    if payment["status"] == "completed":
        return {"status": "already_completed", "payment_id": payment["id"]}

    is_free = payment["amount"] == 0.0 or rz_order_id.startswith("FREE_")

    if not is_free and client and rz_sig:
        generated_signature = hmac.new(
            str(RAZORPAY_KEY_SECRET).encode("utf-8"),
            f"{rz_order_id}|{rz_payment_id}".encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(generated_signature, rz_sig):
            raise PaymentSecurityError("Invalid payment signature.")

    if payment["wallet_amount_used"] > 0:
        wallet_model.debit_wallet(
            db,
            user_id,
            payment["wallet_amount_used"],
            f"Payment for order {rz_order_id}",
            "payment",
            payment["id"],
        )

    sub_id = subscription_service.activate_paid_subscription(
        db,
        user_id,
        payment["plan_slug"],
        payment["billing_cycle"] or "monthly",
        payment["amount"],
    )

    payment_model.update_payment(
        db,
        rz_order_id,
        {
            "razorpay_payment_id": rz_payment_id or "FREE",
            "razorpay_signature": rz_sig or "FREE",
            "status": "completed",
            "subscription_id": sub_id,
        },
    )

    if payment["coupon_id"]:
        coupon_model.increment_coupon_usage(db, payment["coupon_id"])

    referral = referral_model.get_referral_by_referred(db, user_id)
    if referral and referral["status"] == "pending":
        wallet_model.credit_wallet(
            db,
            referral["referrer_id"],
            referral["reward_amount"],
            f"Referral reward for user {user_id}",
            "referral",
            referral["id"],
        )
        referral_model.update_referral_status(db, referral["id"], "rewarded")

    plan = subscription_model.get_plan_by_slug(db, payment["plan_slug"])
    subtotal = payment["amount"] / (1 + (GST_RATE / 100.0)) if payment["amount"] > 0 else 0
    gst_amount = payment["amount"] - subtotal if payment["amount"] > 0 else 0

    invoice_id, invoice_num = payment_model.create_invoice(
        db,
        {
            "user_id": user_id,
            "payment_id": payment["id"],
            "subtotal": subtotal,
            "discount": payment.get("coupon_discount", 0),
            "gst_rate": GST_RATE,
            "gst_amount": gst_amount,
            "total": payment["amount"],
            "billing_name": billing_name,
            "billing_email": billing_email,
            "plan_name": plan["name"] if plan else payment["plan_slug"],
            "billing_cycle": payment["billing_cycle"],
        },
    )

    return {
        "status": "success",
        "payment_id": payment["id"],
        "subscription_id": sub_id,
        "invoice_id": invoice_id,
        "invoice_number": invoice_num,
        "plan_slug": payment["plan_slug"],
    }


def handle_payment_failure(db, payment_id: int, reason: str = None):
    payment = payment_model.get_payment_by_id(db, payment_id)
    if payment:
        payment_model.update_payment_by_id(db, payment_id, {"status": "failed", "failure_reason": reason})
    return {"status": "failed"}


def process_webhook(db, raw_body: bytes, signature: str):
    from app.utils.razorpay_utils import verify_webhook_signature
    if RAZORPAY_WEBHOOK_SECRET:
        if not verify_webhook_signature(RAZORPAY_WEBHOOK_SECRET, raw_body, signature):
            raise PaymentSecurityError("Invalid webhook signature.")

    import json
    payload = json.loads(raw_body.decode("utf-8")) if isinstance(raw_body, bytes) else raw_body
    event = payload.get("event", "")
    entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    if event == "payment.captured":
        order_id = entity.get("order_id")
        payment = payment_model.get_payment_by_order_id(db, order_id)
        if payment and payment["status"] != "completed":
            from app.models.user_model import User
            cursor_user_id = payment["user_id"]
            verify_and_activate(
                db,
                cursor_user_id,
                {
                    "razorpay_order_id": order_id,
                    "razorpay_payment_id": entity.get("id"),
                    "razorpay_signature": "",
                },
                "Webhook User",
                "",
            )
    return {"status": "ok"}


def retry_payment(db, payment_id: int, user_id: int):
    payment = payment_model.get_payment_by_id(db, payment_id)
    if not payment or payment["user_id"] != user_id:
        raise ValueError("Payment not found.")
    if payment["status"] not in ("failed", "created"):
        raise ValueError("Payment cannot be retried.")
    return create_checkout_order(
        db,
        user_id,
        payment["plan_slug"],
        payment["billing_cycle"] or "monthly",
    )


def get_payment_history(db, user_id: int, page: int = 1, limit: int = 20):
    return payment_model.get_user_payments(db, user_id, page, limit)
