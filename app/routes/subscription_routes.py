from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.user_model import User
from app.schemas.subscription_schema import CancelRequest, RenewRequest, SubscribeRequest
from app.services import subscription_service
from app.utils.jwt_handler import get_current_user

router = APIRouter(prefix="/api/subscriptions", tags=["Subscriptions"])


@router.get("/plans")
def list_available_plans(db: Session = Depends(get_db)):
    return {"plans": subscription_service.get_pricing(db)}


@router.get("/my-subscription")
def active_user_plan(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return subscription_service.get_user_subscription_details(db, current_user.id)


@router.post("/subscribe")
def subscribe_to_plan(
    payload: SubscribeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return subscription_service.subscribe(db, current_user.id, payload.plan_slug, payload.billing_cycle)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cancel")
def cancel_user_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return subscription_service.cancel_subscription(db, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/renew")
def renew_user_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return subscription_service.renew_subscription(db, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/check-access/{feature_key}")
def check_feature_access(
    feature_key: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    has_access = subscription_service.check_premium_access(db, current_user.id, feature_key)
    return {"feature_key": feature_key, "has_access": has_access}


@router.get("/history")
def subscription_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.models import subscription_model
    return {"history": subscription_model.get_subscription_history(db, current_user.id)}
