from app.models import coupon_model


def validate_and_calculate(db, code: str, user_id: int, original_amount: float):
    coupon, err = coupon_model.validate_coupon(db, code, user_id, original_amount)
    if err:
        return {"valid": False, "message": err}

    if coupon["discount_type"] == "percentage":
        discount = original_amount * (coupon["discount_value"] / 100.0)
    else:
        discount = coupon["discount_value"]
    if coupon["max_discount"]:
        discount = min(discount, coupon["max_discount"])

    final_amount = max(0.0, original_amount - discount)
    return {
        "valid": True,
        "coupon": {"code": coupon["code"], "description": coupon["description"]},
        "discount": discount,
        "final_amount": final_amount,
    }


def create_coupon(db, data: dict):
    return coupon_model.create_coupon(db, data)


def get_coupon_analytics(db):
    from app.utils.db_cursor import get_cursor

    cursor = get_cursor(db)
    cursor.execute("SELECT COUNT(id) FROM coupon_codes WHERE is_active = 1")
    active = cursor.fetchone()[0] or 0
    cursor.execute("SELECT COUNT(id) FROM coupon_codes")
    total = cursor.fetchone()[0] or 0
    cursor.execute("SELECT COALESCE(SUM(used_count), 0) FROM coupon_codes")
    total_uses = cursor.fetchone()[0] or 0
    cursor.execute(
        """
        SELECT code, used_count, discount_type, discount_value
        FROM coupon_codes ORDER BY used_count DESC LIMIT 10
        """
    )
    top = [
        {"code": r[0], "used_count": r[1], "discount_type": r[2], "discount_value": float(r[3])}
        for r in cursor.fetchall()
    ]
    return {"active_coupons": active, "total_coupons": total, "total_uses": total_uses, "top_coupons": top}
