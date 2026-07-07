from datetime import datetime, timedelta

from app.utils.db_cursor import get_cursor


def get_revenue_dashboard(db):
    cursor = get_cursor(db)

    cursor.execute("SELECT COALESCE(SUM(total), 0) FROM invoices WHERE status = 'paid'")
    gross_rev = float(cursor.fetchone()[0] or 0)

    cursor.execute(
        """
        SELECT COALESCE(SUM(total), 0) FROM invoices
        WHERE status = 'paid' AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')
        """
    )
    monthly_rev = float(cursor.fetchone()[0] or 0)

    cursor.execute(
        """
        SELECT COALESCE(SUM(total), 0) FROM invoices
        WHERE status = 'paid' AND DATE(created_at) = CURDATE()
        """
    )
    daily_rev = float(cursor.fetchone()[0] or 0)

    cursor.execute(
        """
        SELECT COALESCE(SUM(total), 0) FROM invoices
        WHERE status = 'paid' AND created_at >= DATE_FORMAT(NOW(), '%Y-01-01')
        """
    )
    annual_rev = float(cursor.fetchone()[0] or 0)

    mrr = get_mrr(db)
    arr = mrr * 12

    cursor.execute("SELECT COUNT(id) FROM subscriptions WHERE status = 'active' AND end_date > NOW()")
    subscribers = cursor.fetchone()[0] or 0

    cursor.execute("SELECT COUNT(id) FROM users")
    total_users = cursor.fetchone()[0] or 1

    return {
        "gross_revenue": gross_rev,
        "daily_revenue": daily_rev,
        "monthly_revenue": monthly_rev,
        "annual_revenue": annual_rev,
        "mrr": mrr,
        "arr": arr,
        "active_subscribers": subscribers,
        "conversion_rate": round((subscribers / total_users) * 100, 2),
    }


def get_mrr(db):
    cursor = get_cursor(db)
    cursor.execute(
        """
        SELECT COALESCE(SUM(
            CASE WHEN s.billing_cycle = 'yearly' THEN p.yearly_price / 12 ELSE p.monthly_price END
        ), 0)
        FROM subscriptions s
        JOIN subscription_plans p ON s.plan_id = p.id
        WHERE s.status = 'active' AND s.end_date > NOW()
        """
    )
    return float(cursor.fetchone()[0] or 0)


def get_arr(db):
    return get_mrr(db) * 12


def get_conversion_rate(db):
    cursor = get_cursor(db)
    cursor.execute("SELECT COUNT(id) FROM subscriptions WHERE status = 'active' AND end_date > NOW()")
    subs = cursor.fetchone()[0] or 0
    cursor.execute("SELECT COUNT(id) FROM users")
    users = cursor.fetchone()[0] or 1
    return round((subs / users) * 100, 2)


def get_plan_popularity(db):
    cursor = get_cursor(db)
    cursor.execute(
        """
        SELECT p.name, p.slug, COUNT(s.id) as count
        FROM subscription_plans p
        LEFT JOIN subscriptions s ON p.id = s.plan_id AND s.status = 'active' AND s.end_date > NOW()
        GROUP BY p.id, p.name, p.slug
        ORDER BY count DESC
        """
    )
    return [{"plan_name": r[0], "plan_slug": r[1], "count": r[2]} for r in cursor.fetchall()]


def get_subscriber_growth(db, period: str = "monthly"):
    cursor = get_cursor(db)
    if period == "daily":
        cursor.execute(
            """
            SELECT DATE(created_at) as d, COUNT(id) as cnt
            FROM subscriptions WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(created_at) ORDER BY d
            """
        )
    else:
        cursor.execute(
            """
            SELECT DATE_FORMAT(created_at, '%Y-%m') as m, COUNT(id) as cnt
            FROM subscriptions WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY m
            """
        )
    return [{"period": str(r[0]), "count": r[1]} for r in cursor.fetchall()]


def get_renewal_rate(db):
    cursor = get_cursor(db)
    cursor.execute("SELECT COUNT(id) FROM subscriptions WHERE status = 'active' AND auto_renew = 1")
    renewing = cursor.fetchone()[0] or 0
    cursor.execute("SELECT COUNT(id) FROM subscriptions WHERE status IN ('active', 'expired', 'cancelled')")
    total = cursor.fetchone()[0] or 1
    return round((renewing / total) * 100, 2)


def get_cancellation_rate(db):
    cursor = get_cursor(db)
    cursor.execute("SELECT COUNT(id) FROM subscriptions WHERE status = 'cancelled'")
    cancelled = cursor.fetchone()[0] or 0
    cursor.execute("SELECT COUNT(id) FROM subscriptions")
    total = cursor.fetchone()[0] or 1
    return round((cancelled / total) * 100, 2)


def get_top_paying_users(db, limit: int = 10):
    cursor = get_cursor(db)
    cursor.execute(
        """
        SELECT u.id, u.name, u.email, COALESCE(SUM(i.total), 0) as total_spent
        FROM users u
        LEFT JOIN invoices i ON u.id = i.user_id AND i.status = 'paid'
        GROUP BY u.id, u.name, u.email
        ORDER BY total_spent DESC
        LIMIT %s
        """,
        (limit,),
    )
    return [
        {"user_id": r[0], "name": r[1], "email": r[2], "total_spent": float(r[3])}
        for r in cursor.fetchall()
    ]


def get_revenue_trend(db, days: int = 30):
    cursor = get_cursor(db)
    cursor.execute(
        """
        SELECT DATE(created_at) as d, COALESCE(SUM(total), 0) as revenue
        FROM invoices
        WHERE status = 'paid' AND created_at >= DATE_SUB(NOW(), INTERVAL %s DAY)
        GROUP BY DATE(created_at) ORDER BY d
        """,
        (days,),
    )
    return [{"date": str(r[0]), "revenue": float(r[1])} for r in cursor.fetchall()]


def get_active_subscribers(db, page: int = 1, limit: int = 50):
    offset = (page - 1) * limit
    cursor = get_cursor(db)
    cursor.execute(
        """
        SELECT s.id, u.name, u.email, p.name, s.billing_cycle, s.end_date, s.status
        FROM subscriptions s
        JOIN users u ON s.user_id = u.id
        JOIN subscription_plans p ON s.plan_id = p.id
        WHERE s.status = 'active' AND s.end_date > NOW()
        ORDER BY s.id DESC LIMIT %s OFFSET %s
        """,
        (limit, offset),
    )
    return [
        {
            "id": r[0],
            "user_name": r[1],
            "user_email": r[2],
            "plan_name": r[3],
            "billing_cycle": r[4],
            "end_date": r[5].isoformat() if r[5] else None,
            "status": r[6],
        }
        for r in cursor.fetchall()
    ]


def get_expired_subscribers(db, page: int = 1, limit: int = 50):
    offset = (page - 1) * limit
    cursor = get_cursor(db)
    cursor.execute(
        """
        SELECT s.id, u.name, u.email, p.name, s.end_date
        FROM subscriptions s
        JOIN users u ON s.user_id = u.id
        JOIN subscription_plans p ON s.plan_id = p.id
        WHERE s.status IN ('expired', 'cancelled') OR s.end_date <= NOW()
        ORDER BY s.end_date DESC LIMIT %s OFFSET %s
        """,
        (limit, offset),
    )
    return [
        {
            "id": r[0],
            "user_name": r[1],
            "user_email": r[2],
            "plan_name": r[3],
            "end_date": r[4].isoformat() if r[4] else None,
        }
        for r in cursor.fetchall()
    ]
