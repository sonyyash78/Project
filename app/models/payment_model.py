from datetime import datetime

from app.utils.db_cursor import db_commit, get_cursor


def create_payment(db, data: dict):
    cursor = get_cursor(db)
    cursor.execute(
        """
        INSERT INTO payments (
            user_id, subscription_id, razorpay_order_id, amount, currency, status,
            coupon_id, coupon_discount, wallet_amount_used, plan_slug, billing_cycle
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            data["user_id"],
            data.get("subscription_id"),
            data["razorpay_order_id"],
            data["amount"],
            data.get("currency", "INR"),
            data.get("status", "created"),
            data.get("coupon_id"),
            data.get("coupon_discount", 0.0),
            data.get("wallet_amount_used", 0.0),
            data.get("plan_slug"),
            data.get("billing_cycle"),
        ),
    )
    db_commit(db)
    return cursor.lastrowid


def update_payment(db, order_id: str, data: dict):
    cursor = get_cursor(db)
    fields = ", ".join([f"{k} = %s" for k in data.keys()])
    values = list(data.values())
    values.append(order_id)
    cursor.execute(f"UPDATE payments SET {fields} WHERE razorpay_order_id = %s", tuple(values))
    db_commit(db)


def update_payment_by_id(db, payment_id: int, data: dict):
    cursor = get_cursor(db)
    fields = ", ".join([f"{k} = %s" for k in data.keys()])
    values = list(data.values())
    values.append(payment_id)
    cursor.execute(f"UPDATE payments SET {fields} WHERE id = %s", tuple(values))
    db_commit(db)


def get_payment_by_order_id(db, order_id: str):
    cursor = get_cursor(db)
    cursor.execute(
        """
        SELECT id, user_id, subscription_id, razorpay_order_id, amount, currency, status,
               coupon_id, wallet_amount_used, plan_slug, billing_cycle, coupon_discount
        FROM payments WHERE razorpay_order_id = %s
        """,
        (order_id,),
    )
    p = cursor.fetchone()
    if not p:
        return None
    return {
        "id": p[0],
        "user_id": p[1],
        "subscription_id": p[2],
        "razorpay_order_id": p[3],
        "amount": float(p[4]),
        "currency": p[5],
        "status": p[6],
        "coupon_id": p[7],
        "wallet_amount_used": float(p[8] or 0),
        "plan_slug": p[9],
        "billing_cycle": p[10],
        "coupon_discount": float(p[11] or 0),
    }


def get_payment_by_id(db, payment_id: int):
    cursor = get_cursor(db)
    cursor.execute(
        """
        SELECT id, user_id, subscription_id, razorpay_order_id, razorpay_payment_id,
               amount, currency, status, plan_slug, billing_cycle, created_at
        FROM payments WHERE id = %s
        """,
        (payment_id,),
    )
    p = cursor.fetchone()
    if not p:
        return None
    return {
        "id": p[0],
        "user_id": p[1],
        "subscription_id": p[2],
        "razorpay_order_id": p[3],
        "razorpay_payment_id": p[4],
        "amount": float(p[5]),
        "currency": p[6],
        "status": p[7],
        "plan_slug": p[8],
        "billing_cycle": p[9],
        "created_at": p[10].isoformat() if p[10] else None,
    }


def get_user_payments(db, user_id: int, page: int = 1, limit: int = 20):
    offset = (page - 1) * limit
    cursor = get_cursor(db)
    cursor.execute(
        """
        SELECT id, razorpay_order_id, amount, currency, status, plan_slug, billing_cycle, created_at
        FROM payments WHERE user_id = %s ORDER BY id DESC LIMIT %s OFFSET %s
        """,
        (user_id, limit, offset),
    )
    rows = cursor.fetchall()
    cursor.execute("SELECT COUNT(id) FROM payments WHERE user_id = %s", (user_id,))
    total = cursor.fetchone()[0]
    return {
        "items": [
            {
                "id": r[0],
                "razorpay_order_id": r[1],
                "amount": float(r[2]),
                "currency": r[3],
                "status": r[4],
                "plan_slug": r[5],
                "billing_cycle": r[6],
                "created_at": r[7].isoformat() if r[7] else None,
            }
            for r in rows
        ],
        "total": total,
        "page": page,
        "limit": limit,
    }


def get_all_payments(db, page: int = 1, limit: int = 50):
    offset = (page - 1) * limit
    cursor = get_cursor(db)
    cursor.execute(
        """
        SELECT p.id, p.user_id, u.name, u.email, p.amount, p.status, p.plan_slug, p.created_at, p.razorpay_order_id
        FROM payments p JOIN users u ON p.user_id = u.id
        ORDER BY p.id DESC LIMIT %s OFFSET %s
        """,
        (limit, offset),
    )
    rows = cursor.fetchall()
    return [
        {
            "id": r[0],
            "user_id": r[1],
            "user_name": r[2],
            "user_email": r[3],
            "amount": float(r[4]),
            "status": r[5],
            "plan_slug": r[6],
            "created_at": r[7].isoformat() if r[7] else None,
            "razorpay_order_id": r[8],
        }
        for r in rows
    ]


def generate_invoice_number(db):
    cursor = get_cursor(db)
    cursor.execute("SELECT COUNT(id) FROM invoices")
    count = cursor.fetchone()[0]
    current_year = datetime.now().year
    return f"EXSD-{current_year}-{(count + 1):06d}"


def create_invoice(db, data: dict):
    cursor = get_cursor(db)
    invoice_num = generate_invoice_number(db)
    cursor.execute(
        """
        INSERT INTO invoices (
            invoice_number, user_id, payment_id, subtotal, discount, gst_rate,
            gst_amount, total, status, billing_name, billing_email, plan_name, billing_cycle
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            invoice_num,
            data["user_id"],
            data["payment_id"],
            data["subtotal"],
            data.get("discount", 0.0),
            data.get("gst_rate", 18.0),
            data["gst_amount"],
            data["total"],
            data.get("status", "paid"),
            data.get("billing_name"),
            data.get("billing_email"),
            data.get("plan_name"),
            data.get("billing_cycle"),
        ),
    )
    db_commit(db)
    return cursor.lastrowid, invoice_num


def get_user_invoices(db, user_id: int, page: int = 1, limit: int = 20):
    offset = (page - 1) * limit
    cursor = get_cursor(db)
    cursor.execute(
        """
        SELECT id, invoice_number, payment_id, subtotal, discount, gst_rate, gst_amount,
               total, status, plan_name, billing_cycle, created_at
        FROM invoices WHERE user_id = %s ORDER BY id DESC LIMIT %s OFFSET %s
        """,
        (user_id, limit, offset),
    )
    res = cursor.fetchall()
    return [
        {
            "id": r[0],
            "invoice_number": r[1],
            "payment_id": r[2],
            "subtotal": float(r[3]),
            "discount": float(r[4]),
            "gst_rate": float(r[5]),
            "gst_amount": float(r[6]),
            "total": float(r[7]),
            "status": r[8],
            "plan_name": r[9],
            "billing_cycle": r[10],
            "created_at": r[11].isoformat() if r[11] else None,
        }
        for r in res
    ]


def get_invoice_by_id(db, invoice_id: int, user_id: int = None):
    cursor = get_cursor(db)
    if user_id:
        cursor.execute(
            """
            SELECT id, invoice_number, payment_id, subtotal, discount, gst_rate, gst_amount,
                   total, status, billing_name, billing_email, plan_name, billing_cycle, created_at
            FROM invoices WHERE id = %s AND user_id = %s
            """,
            (invoice_id, user_id),
        )
    else:
        cursor.execute(
            """
            SELECT id, invoice_number, payment_id, subtotal, discount, gst_rate, gst_amount,
                   total, status, billing_name, billing_email, plan_name, billing_cycle, created_at, user_id
            FROM invoices WHERE id = %s
            """,
            (invoice_id,),
        )
    r = cursor.fetchone()
    if not r:
        return None
    result = {
        "id": r[0],
        "invoice_number": r[1],
        "payment_id": r[2],
        "subtotal": float(r[3]),
        "discount": float(r[4]),
        "gst_rate": float(r[5]),
        "gst_amount": float(r[6]),
        "total": float(r[7]),
        "status": r[8],
        "billing_name": r[9],
        "billing_email": r[10],
        "plan_name": r[11],
        "billing_cycle": r[12],
        "created_at": r[13].isoformat() if r[13] else None,
    }
    if not user_id and len(r) > 14:
        result["user_id"] = r[14]
    return result
