from app.models import referral_model
from app.utils.db_cursor import get_cursor


def generate_referral_code(db, user_id: int):
    existing = referral_model.get_user_referral_code(db, user_id)
    if existing:
        return existing
    code = referral_model.generate_unique_referral_code(db)
    referral_model.set_user_referral_code(db, user_id, code)
    return code


def apply_referral_code(db, user_id: int, code: str):
    code = code.upper().strip()
    cursor = get_cursor(db)
    cursor.execute("SELECT id, referral_code FROM users WHERE referral_code = %s", (code,))
    referrer = cursor.fetchone()
    if not referrer:
        raise ValueError("Invalid referral code.")
    referrer_id = referrer[0]
    if referrer_id == user_id:
        raise ValueError("You cannot use your own referral code.")

    cursor.execute("SELECT referred_by FROM users WHERE id = %s", (user_id,))
    row = cursor.fetchone()
    if row and row[0]:
        raise ValueError("Referral code already applied.")

    cursor.execute("UPDATE users SET referred_by = %s WHERE id = %s", (referrer_id, user_id))
    from app.utils.db_cursor import db_commit
    db_commit(db)

    referral_model.create_referral(
        db,
        {"referrer_id": referrer_id, "referred_id": user_id, "referral_code": code, "status": "pending"},
    )
    return {"message": "Referral code applied successfully.", "referrer_id": referrer_id}


def process_referral_reward(db, referred_user_id: int):
    referral = referral_model.get_referral_by_referred(db, referred_user_id)
    if referral and referral["status"] == "pending":
        from app.models import wallet_model
        wallet_model.credit_wallet(
            db,
            referral["referrer_id"],
            referral["reward_amount"],
            f"Referral reward for user {referred_user_id}",
            "referral",
            referral["id"],
        )
        referral_model.update_referral_status(db, referral["id"], "rewarded")
    return referral


def get_referral_dashboard(db, user_id: int):
    code = generate_referral_code(db, user_id)
    stats = referral_model.get_referral_stats(db, user_id)
    referrals = referral_model.get_user_referrals(db, user_id)
    return {"referral_code": code, **stats, "referrals": referrals}
