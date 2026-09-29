from datetime import datetime

from app.utils.db_cursor import db_commit, get_cursor


def get_coupon_by_code(db, code: str):
    cursor = get_cursor(db)
    cursor.execute(
        """
        SELECT id, code, description, discount_type, discount_value, min_order, max_discount,
               max_uses, used_count, expiry_date, is_active, is_user_specific, specific_user_id
        FROM coupon_codes WHERE code = %s AND is_active = 1
        """,
        (code.upper(),),
    )
    c = cursor.fetchone()
    if not c:
        return None
    return {
        "id": c[0],
        "code": c[1],
        "description": c[2],
        "discount_type": c[3],
        "discount_value": float(c[4]),
        "min_order": float(c[5]),
        "max_discount": float(c[6]) if c[6] is not None else None,
        "max_uses": c[7],
        "used_count": c[8],
        "expiry_date": c[9],
        "is_active": c[10],
        "is_user_specific": c[11],
        "user_id": c[12],
    }


def validate_coupon(db, code: str, user_id: int, original_amount: float):
    coupon = get_coupon_by_code(db, code)
    if not coupon:
        return None, "Invalid coupon code."
    if coupon["expiry_date"] and coupon["expiry_date"] < datetime.now():
        return None, "Coupon has expired."
    if coupon["max_uses"] and coupon["used_count"] >= coupon["max_uses"]:
        return None, "Coupon usage limit reached."
    if original_amount < coupon["min_order"]:
        return None, f"Minimum order amount is ₹{coupon['min_order']}."
    if coupon["is_user_specific"] and coupon["user_id"] != user_id:
        return None, "This coupon is not valid for your account."
    return coupon, None


def increment_coupon_usage(db, coupon_id: int):
    cursor = get_cursor(db)
    cursor.execute("UPDATE coupon_codes SET used_count = used_count + 1 WHERE id = %s", (coupon_id,))
    db_commit(db)


def create_coupon(db, data: dict):
    cursor = get_cursor(db)
    cursor.execute(
        """
        INSERT INTO coupon_codes (
            code, description, discount_type, discount_value, min_order, max_discount,
            max_uses, expiry_date, is_active, is_user_specific, specific_user_id
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            data["code"].upper(),
            data.get("description"),
            data.get("discount_type", "percentage"),
            data["discount_value"],
            data.get("min_order", 0),
            data.get("max_discount"),
            data.get("max_uses"),
            data.get("expiry_date"),
            data.get("is_active", True),
            data.get("is_user_specific", False),
            data.get("user_id"),
        ),
    )
    db_commit(db)
    return cursor.lastrowid


def get_all_coupons(db, page: int = 1, limit: int = 50):
    offset = (page - 1) * limit
    cursor = get_cursor(db)
    cursor.execute(
        """
        SELECT id, code, description, discount_type, discount_value, used_count, max_uses, is_active, expiry_date
        FROM coupon_codes ORDER BY id DESC LIMIT %s OFFSET %s
        """,
        (limit, offset),
    )
    rows = cursor.fetchall()
    return [
        {
            "id": r[0],
            "code": r[1],
            "description": r[2],
            "discount_type": r[3],
            "discount_value": float(r[4]),
            "used_count": r[5],
            "max_uses": r[6],
            "is_active": bool(r[7]),
            "expiry_date": r[8].isoformat() if r[8] else None,
        }
        for r in rows
    ]


def update_coupon(db, coupon_id: int, data: dict):
    cursor = get_cursor(db)
    fields = ", ".join([f"{k} = %s" for k in data.keys()])
    values = list(data.values())
    values.append(coupon_id)
    cursor.execute(f"UPDATE coupon_codes SET {fields} WHERE id = %s", tuple(values))
    db_commit(db)


def deactivate_coupon(db, coupon_id: int):
    update_coupon(db, coupon_id, {"is_active": False})
