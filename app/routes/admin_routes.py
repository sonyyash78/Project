from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models import payment_model, referral_model, wallet_model
from app.models.user_model import User
from app.services import coupon_service, revenue_service
from app.utils.dependencies import get_admin_user

router = APIRouter(prefix="/api/admin", tags=["Admin Revenue"])


@router.get("/revenue/dashboard")
def revenue_dashboard(db: Session = Depends(get_db), _admin: User = Depends(get_admin_user)):
    return revenue_service.get_revenue_dashboard(db)


@router.get("/revenue/mrr")
def revenue_mrr(db: Session = Depends(get_db), _admin: User = Depends(get_admin_user)):
    return {"mrr": revenue_service.get_mrr(db)}


@router.get("/revenue/arr")
def revenue_arr(db: Session = Depends(get_db), _admin: User = Depends(get_admin_user)):
    return {"arr": revenue_service.get_arr(db)}


@router.get("/revenue/trend")
def revenue_trend(days: int = 30, db: Session = Depends(get_db), _admin: User = Depends(get_admin_user)):
    return {"trend": revenue_service.get_revenue_trend(db, days)}


@router.get("/subscribers")
def active_subscribers(
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    return {"subscribers": revenue_service.get_active_subscribers(db, page, limit)}


@router.get("/subscribers/expired")
def expired_subscribers(
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    return {"subscribers": revenue_service.get_expired_subscribers(db, page, limit)}


@router.get("/analytics/conversion")
def conversion_rate(db: Session = Depends(get_db), _admin: User = Depends(get_admin_user)):
    return {"conversion_rate": revenue_service.get_conversion_rate(db)}


@router.get("/analytics/growth")
def subscriber_growth(
    period: str = "monthly",
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    return {"growth": revenue_service.get_subscriber_growth(db, period)}


@router.get("/analytics/plan-popularity")
def plan_popularity(db: Session = Depends(get_db), _admin: User = Depends(get_admin_user)):
    return {"plans": revenue_service.get_plan_popularity(db)}


@router.get("/payments")
def all_payments(
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    return {"payments": payment_model.get_all_payments(db, page, limit)}


@router.get("/transactions")
def all_wallet_transactions(
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    return {"transactions": wallet_model.get_all_wallet_transactions(db, page, limit)}


@router.get("/referrals")
def referral_analytics(
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    return {"referrals": referral_model.get_all_referrals(db, page, limit)}


@router.get("/wallet-analytics")
def wallet_analytics(db: Session = Depends(get_db), _admin: User = Depends(get_admin_user)):
    return wallet_model.get_wallet_analytics(db)


@router.get("/coupons/analytics")
def coupon_analytics(db: Session = Depends(get_db), _admin: User = Depends(get_admin_user)):
    return coupon_service.get_coupon_analytics(db)


@router.get("/top-users")
def top_paying_users(
    limit: int = 10,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    return {"users": revenue_service.get_top_paying_users(db, limit)}


@router.get("/users")
def list_users(
    page: int = 1,
    limit: int = 50,
    search: str = None,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    query = db.query(User)
    if search:
        query = query.filter(User.name.like(f"%{search}%") | User.email.like(f"%{search}%"))
    
    total = query.count()
    users = query.offset((page - 1) * limit).limit(limit).all()
    
    return {
        "total": total,
        "users": [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "role": u.role,
                "is_verified": getattr(u, 'is_verified', False),
                "subscription_plan": getattr(u, 'subscription_plan', 'free'),
                "premium_until": getattr(u, 'premium_until', None),
                "created_at": u.created_at
            }
            for u in users
        ]
    }


@router.put("/users/{user_id}")
def update_user_by_admin(
    user_id: int,
    role: str = None,
    subscription_plan: str = None,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if role is not None:
        user.role = role
    if subscription_plan is not None:
        user.subscription_plan = subscription_plan
        
    db.commit()
    db.refresh(user)
    return {
        "status": "success",
        "user": {
            "id": user.id,
            "name": user.name,
            "role": user.role,
            "subscription_plan": user.subscription_plan
        }
    }
