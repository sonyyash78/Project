import secrets
import string

from app.utils.config import REFERRAL_REWARD_AMOUNT
from app.utils.db_cursor import db_commit, get_cursor


def _generate_code():
    chars = string.ascii_uppercase + string.digits
    return "EXSD" + "".join(secrets.choice(chars) for _ in range(6))


def get_user_referral_code(db, user_id: int):
    cursor = get_cursor(db)
    cursor.execute("SELECT referral_code FROM users WHERE id = %s", (user_id,))
    row = cursor.fetchone()
    return row[0] if row else None


def set_user_referral_code(db, user_id: int, code: str):
    cursor = get_cursor(db)
    cursor.execute("UPDATE users SET referral_code = %s WHERE id = %s", (code, user_id))
    db_commit(db)


def generate_unique_referral_code(db):
    for _ in range(10):
        code = _generate_code()
        cursor = get_cursor(db)
        cursor.execute("SELECT id FROM users WHERE referral_code = %s", (code,))
        if not cursor.fetchone():
            return code
    raise ValueError("Could not generate unique referral code.")


def create_referral(db, data: dict):
    cursor = get_cursor(db)
    cursor.execute(
        """
        INSERT INTO referrals (referrer_id, referred_id, referral_code, status, reward_amount)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (
            data["referrer_id"],
            data.get("referred_id"),
            data["referral_code"],
            data.get("status", "pending"),
            data.get("reward_amount", REFERRAL_REWARD_AMOUNT),
        ),
    )
    db_commit(db)
    return cursor.lastrowid


def get_referral_by_code(db, code: str):
    cursor = get_cursor(db)
    cursor.execute(
        "SELECT id, referrer_id, referred_id, referral_code, status, reward_amount FROM referrals WHERE referral_code = %s",
        (code,),
    )
    r = cursor.fetchone()
    if not r:
        return None
    return {
        "id": r[0],
        "referrer_id": r[1],
        "referred_id": r[2],
        "referral_code": r[3],
        "status": r[4],
        "reward_amount": float(r[5]),
    }


def get_referral_by_referred(db, referred_id: int):
    cursor = get_cursor(db)
    cursor.execute(
        "SELECT id, referrer_id, referral_code, status, reward_amount FROM referrals WHERE referred_id = %s",
        (referred_id,),
    )
    r = cursor.fetchone()
    if not r:
        return None
    return {
        "id": r[0],
        "referrer_id": r[1],
        "referral_code": r[2],
        "status": r[3],
        "reward_amount": float(r[4]),
    }


def update_referral_status(db, ref_id: int, status: str):
    cursor = get_cursor(db)
    cursor.execute(
        "UPDATE referrals SET status = %s, rewarded_at = NOW() WHERE id = %s",
        (status, ref_id),
    )
    db_commit(db)


def complete_referral(db, ref_id: int):
    update_referral_status(db, ref_id, "completed")


def get_user_referrals(db, user_id: int):
    cursor = get_cursor(db)
    cursor.execute(
        """
        SELECT r.id, r.referred_id, u.name, u.email, r.status, r.reward_amount, r.created_at
        FROM referrals r
        LEFT JOIN users u ON r.referred_id = u.id
        WHERE r.referrer_id = %s
        ORDER BY r.id DESC
        """,
        (user_id,),
    )
    rows = cursor.fetchall()
    return [
        {
            "id": r[0],
            "referred_id": r[1],
            "referred_name": r[2],
            "referred_email": r[3],
            "status": r[4],
            "reward_amount": float(r[5]),
            "created_at": r[6].isoformat() if r[6] else None,
        }
        for r in rows
    ]


def get_referral_stats(db, user_id: int):
    cursor = get_cursor(db)
    cursor.execute("SELECT COUNT(id) FROM referrals WHERE referrer_id = %s", (user_id,))
    total = cursor.fetchone()[0] or 0
    cursor.execute(
        "SELECT COUNT(id) FROM referrals WHERE referrer_id = %s AND status IN ('completed', 'rewarded')",
        (user_id,),
    )
    successful = cursor.fetchone()[0] or 0
    cursor.execute(
        "SELECT COALESCE(SUM(reward_amount), 0) FROM referrals WHERE referrer_id = %s AND status = 'rewarded'",
        (user_id,),
    )
    earnings = float(cursor.fetchone()[0] or 0)
    return {"total_referred": total, "successful": successful, "earnings": earnings}


def get_all_referrals(db, page: int = 1, limit: int = 50):
    offset = (page - 1) * limit
    cursor = get_cursor(db)
    cursor.execute(
        """
        SELECT r.id, r.referrer_id, u1.name, r.referred_id, u2.name, r.status, r.reward_amount, r.created_at
        FROM referrals r
        JOIN users u1 ON r.referrer_id = u1.id
        LEFT JOIN users u2 ON r.referred_id = u2.id
        ORDER BY r.id DESC LIMIT %s OFFSET %s
        """,
        (limit, offset),
    )
    rows = cursor.fetchall()
    return [
        {
            "id": r[0],
            "referrer_id": r[1],
            "referrer_name": r[2],
            "referred_id": r[3],
            "referred_name": r[4],
            "status": r[5],
            "reward_amount": float(r[6]),
            "created_at": r[7].isoformat() if r[7] else None,
        }
        for r in rows
    ]
