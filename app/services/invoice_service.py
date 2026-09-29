from app.models import payment_model
from app.utils.config import GST_RATE


def generate_invoice(db, payment_id: int, user_id: int, billing_name: str, billing_email: str, plan_name: str, billing_cycle: str):
    payment = payment_model.get_payment_by_id(db, payment_id)
    if not payment or payment["user_id"] != user_id:
        raise ValueError("Payment not found.")

    subtotal = payment["amount"] / (1 + (GST_RATE / 100.0)) if payment["amount"] > 0 else 0
    gst_amount = payment["amount"] - subtotal

    invoice_id, invoice_num = payment_model.create_invoice(
        db,
        {
            "user_id": user_id,
            "payment_id": payment_id,
            "subtotal": subtotal,
            "gst_rate": GST_RATE,
            "gst_amount": gst_amount,
            "total": payment["amount"],
            "billing_name": billing_name,
            "billing_email": billing_email,
            "plan_name": plan_name,
            "billing_cycle": billing_cycle,
        },
    )
    return {"invoice_id": invoice_id, "invoice_number": invoice_num}


def get_invoice(db, invoice_id: int, user_id: int):
    invoice = payment_model.get_invoice_by_id(db, invoice_id, user_id)
    if not invoice:
        raise ValueError("Invoice not found.")
    return invoice


def get_user_invoices(db, user_id: int, page: int = 1, limit: int = 20):
    return payment_model.get_user_invoices(db, user_id, page, limit)
