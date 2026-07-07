import json
from datetime import datetime

from app.utils.db_cursor import db_commit, get_cursor


def get_all_plans(db):
    cursor = get_cursor(db)
    cursor.execute(
        "SELECT id, name, slug, monthly_price, yearly_price, features_json, is_active, sort_order "
        "FROM subscription_plans WHERE is_active = 1 ORDER BY sort_order ASC"
    )
    plans = cursor.fetchall()
    return [
        {
            "id": p[0],
            "name": p[1],
            "slug": p[2],
            "monthly_price": float(p[3]),
            "yearly_price": float(p[4]),
            "features_json": json.loads(p[5]) if p[5] else {},
            "is_active": p[6],
            "sort_order": p[7],
        }
        for p in plans
    ]


def get_plan_by_slug(db, slug: str):
    cursor = get_cursor(db)
    cursor.execute(
        "SELECT id, name, slug, monthly_price, yearly_price, features_json "
        "FROM subscription_plans WHERE slug = %s",
        (slug,),
    )
    p = cursor.fetchone()
    if not p:
        return None
    return {
        "id": p[0],
        "name": p[1],
        "slug": p[2],
        "monthly_price": float(p[3]),
        "yearly_price": float(p[4]),
        "features_json": json.loads(p[5]) if p[5] else {},
    }


def get_plan_by_id(db, plan_id: int):
    cursor = get_cursor(db)
    cursor.execute(
        "SELECT id, name, slug, monthly_price, yearly_price, features_json "
        "FROM subscription_plans WHERE id = %s",
        (plan_id,),
    )
    p = cursor.fetchone()
    if not p:
        return None
    return {
        "id": p[0],
        "name": p[1],
        "slug": p[2],
        "monthly_price": float(p[3]),
        "yearly_price": float(p[4]),
        "features_json": json.loads(p[5]) if p[5] else {},
    }


def create_subscription(db, data: dict):
    cursor = get_cursor(db)
    cursor.execute(
        """
        INSERT INTO subscriptions (user_id, plan_id, status, billing_cycle, amount_paid, start_date, end_date, auto_renew)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            data["user_id"],
            data["plan_id"],
            data["status"],
            data["billing_cycle"],
            data.get("amount_paid", 0.0),
            data["start_date"],
            data["end_date"],
            data.get("auto_renew", True),
        ),
    )
    db_commit(db)
    return cursor.lastrowid


def get_active_subscription(db, user_id: int):
    cursor = get_cursor(db)
    cursor.execute(
        """
        SELECT s.id, s.plan_id, s.status, s.billing_cycle, s.start_date, s.end_date, s.auto_renew, p.name, p.slug
        FROM subscriptions s
        JOIN subscription_plans p ON s.plan_id = p.id
        WHERE s.user_id = %s AND s.status = 'active' AND s.end_date > NOW()
        ORDER BY s.id DESC LIMIT 1
        """,
        (user_id,),
    )
    s = cursor.fetchone()
    if not s:
        return None
    end_date = s[5]
    days_remaining = max(0, (end_date - datetime.now()).days) if end_date else 0
    return {
        "id": s[0],
        "plan_id": s[1],
        "status": s[2],
        "billing_cycle": s[3],
        "start_date": s[4].isoformat() if s[4] else None,
        "end_date": end_date.isoformat() if end_date else None,
        "auto_renew": bool(s[6]),
        "plan_name": s[7],
        "plan_slug": s[8],
        "days_remaining": days_remaining,
    }


def update_subscription(db, sub_id: int, data: dict):
    cursor = get_cursor(db)
    fields = ", ".join([f"{k} = %s" for k in data.keys()])
    values = list(data.values())
    values.append(sub_id)
    cursor.execute(f"UPDATE subscriptions SET {fields} WHERE id = %s", tuple(values))
    db_commit(db)


def cancel_subscription(db, sub_id: int):
    update_subscription(
        db,
        sub_id,
        {"status": "cancelled", "auto_renew": False, "cancelled_at": datetime.now()},
    )


def get_subscription_history(db, user_id: int):
    cursor = get_cursor(db)
    cursor.execute(
        """
        SELECT s.id, p.name, s.status, s.billing_cycle, s.start_date, s.end_date
        FROM subscriptions s
        JOIN subscription_plans p ON s.plan_id = p.id
        WHERE s.user_id = %s ORDER BY s.id DESC
        """,
        (user_id,),
    )
    history = cursor.fetchall()
    return [
        {
            "id": h[0],
            "plan_name": h[1],
            "status": h[2],
            "billing_cycle": h[3],
            "start_date": h[4].isoformat() if h[4] else None,
            "end_date": h[5].isoformat() if h[5] else None,
        }
        for h in history
    ]


def get_plan_features(db, plan_id: int):
    cursor = get_cursor(db)
    cursor.execute(
        "SELECT feature_key, feature_name, is_enabled FROM premium_features WHERE plan_id = %s",
        (plan_id,),
    )
    rows = cursor.fetchall()
    return [{"feature_key": r[0], "feature_name": r[1], "is_enabled": bool(r[2])} for r in rows]


def check_feature_access(db, user_id: int, feature_key: str) -> bool:
    sub = get_active_subscription(db, user_id)
    if not sub:
        cursor = get_cursor(db)
        cursor.execute(
            """
            SELECT pf.is_enabled FROM premium_features pf
            JOIN subscription_plans p ON pf.plan_id = p.id
            WHERE p.slug = 'free' AND pf.feature_key = %s
            """,
            (feature_key,),
        )
        row = cursor.fetchone()
        return bool(row and row[0])
    cursor = get_cursor(db)
    cursor.execute(
        "SELECT is_enabled FROM premium_features WHERE plan_id = %s AND feature_key = %s",
        (sub["plan_id"], feature_key),
    )
    row = cursor.fetchone()
    return bool(row and row[0])


def update_user_plan(db, user_id: int, plan_slug: str, premium_until):
    cursor = get_cursor(db)
    cursor.execute(
        "UPDATE users SET subscription_plan = %s, premium_until = %s WHERE id = %s",
        (plan_slug, premium_until, user_id),
    )
    db_commit(db)


def expire_subscriptions(db):
    cursor = get_cursor(db)
    cursor.execute(
        """
        UPDATE subscriptions SET status = 'expired'
        WHERE status = 'active' AND end_date <= NOW()
        """
    )
    db_commit(db)
    return cursor.rowcount
