from datetime import datetime, timedelta

from app.models import subscription_model


PLAN_LEVELS = {"free": 0, "pro": 1, "premium": 2, "ultimate": 3}


def get_pricing(db):
    plans = subscription_model.get_all_plans(db)
    for plan in plans:
        plan["features"] = subscription_model.get_plan_features(db, plan["id"])
    return plans


def get_user_subscription_details(db, user_id: int):
    sub = subscription_model.get_active_subscription(db, user_id)
    if not sub:
        return {
            "plan_name": "FREE",
            "plan_slug": "free",
            "status": "active",
            "billing_cycle": None,
            "start_date": None,
            "end_date": None,
            "days_remaining": None,
            "auto_renew": False,
        }
    return sub


def subscribe(db, user_id: int, plan_slug: str, billing_cycle: str = "monthly"):
    plan = subscription_model.get_plan_by_slug(db, plan_slug)
    if not plan:
        raise ValueError("Plan not found.")
    if plan_slug == "free":
        return _activate_free_plan(db, user_id, plan)
    raise ValueError("Paid plans require payment. Use /api/payments/create-order.")


def _activate_free_plan(db, user_id, plan):
    existing = subscription_model.get_active_subscription(db, user_id)
    if existing:
        subscription_model.cancel_subscription(db, existing["id"])
    end_date = datetime.now() + timedelta(days=365 * 10)
    sub_id = subscription_model.create_subscription(
        db,
        {
            "user_id": user_id,
            "plan_id": plan["id"],
            "status": "active",
            "billing_cycle": "monthly",
            "amount_paid": 0,
            "start_date": datetime.now(),
            "end_date": end_date,
            "auto_renew": False,
        },
    )
    subscription_model.update_user_plan(db, user_id, "free", end_date)
    return {"subscription_id": sub_id, "plan_slug": "free"}


def activate_paid_subscription(db, user_id: int, plan_slug: str, billing_cycle: str, amount_paid: float):
    plan = subscription_model.get_plan_by_slug(db, plan_slug)
    if not plan:
        raise ValueError("Plan not found.")

    existing = subscription_model.get_active_subscription(db, user_id)
    if existing:
        subscription_model.cancel_subscription(db, existing["id"])

    days = 30 if billing_cycle == "monthly" else 365
    end_date = datetime.now() + timedelta(days=days)
    sub_id = subscription_model.create_subscription(
        db,
        {
            "user_id": user_id,
            "plan_id": plan["id"],
            "status": "active",
            "billing_cycle": billing_cycle,
            "amount_paid": amount_paid,
            "start_date": datetime.now(),
            "end_date": end_date,
            "auto_renew": True,
        },
    )
    subscription_model.update_user_plan(db, user_id, plan_slug, end_date)
    return sub_id


def cancel_subscription(db, user_id: int):
    sub = subscription_model.get_active_subscription(db, user_id)
    if not sub:
        raise ValueError("No active subscription found.")
    subscription_model.update_subscription(
        db,
        sub["id"],
        {"auto_renew": False, "cancelled_at": datetime.now()},
    )
    return {"message": "Subscription will remain active until end date.", "end_date": sub["end_date"]}


def renew_subscription(db, user_id: int):
    sub = subscription_model.get_active_subscription(db, user_id)
    if not sub:
        raise ValueError("No active subscription to renew.")
    return {
        "plan_slug": sub["plan_slug"],
        "billing_cycle": sub["billing_cycle"],
        "message": "Use payment flow to renew.",
    }


def check_premium_access(db, user_id: int, feature_key: str) -> bool:
    return subscription_model.check_feature_access(db, user_id, feature_key)


def check_plan_level(db, user_id: int, min_plan: str) -> bool:
    sub = subscription_model.get_active_subscription(db, user_id)
    current = sub["plan_slug"] if sub else "free"
    return PLAN_LEVELS.get(current, 0) >= PLAN_LEVELS.get(min_plan.lower(), 0)


def handle_subscription_expiry(db):
    count = subscription_model.expire_subscriptions(db)
    return {"expired_count": count}
