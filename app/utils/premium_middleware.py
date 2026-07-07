from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.user_model import User
from app.services import subscription_service
from app.utils.dependencies import get_admin_user
from app.utils.jwt_handler import get_current_user

PLAN_LEVELS = {"free": 0, "pro": 1, "premium": 2, "ultimate": 3}


def require_premium(feature_key: str):
    def checker(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        if not subscription_service.check_premium_access(db, current_user.id, feature_key):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Premium feature '{feature_key}' requires an upgraded plan.",
            )
        return current_user

    return checker


def require_plan(min_plan: str):
    def checker(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        if not subscription_service.check_plan_level(db, current_user.id, min_plan):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This feature requires at least the {min_plan.upper()} plan.",
            )
        return current_user

    return checker


require_admin = get_admin_user
get_current_admin_user = get_admin_user
