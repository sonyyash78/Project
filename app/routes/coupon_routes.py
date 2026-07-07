from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.user_model import User
from app.schemas.payment_schema import CouponCreateRequest, CouponValidateRequest
from app.services import coupon_service
from app.utils.dependencies import get_admin_user
from app.utils.jwt_handler import get_current_user

router = APIRouter(prefix="/api/coupons", tags=["Coupons"])


@router.post("/validate")
def validate_coupon(
    payload: CouponValidateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return coupon_service.validate_and_calculate(db, payload.code, current_user.id, payload.amount)


@router.post("/create")
def create_coupon(
    payload: CouponCreateRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    coupon_id = coupon_service.create_coupon(db, payload.model_dump())
    return {"id": coupon_id, "message": "Coupon created."}


@router.get("/")
def list_coupons(
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    from app.models import coupon_model
    return {"coupons": coupon_model.get_all_coupons(db, page, limit)}


@router.put("/{coupon_id}")
def update_coupon(
    coupon_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    from app.models import coupon_model
    coupon_model.update_coupon(db, coupon_id, payload)
    return {"message": "Coupon updated."}


@router.delete("/{coupon_id}")
def deactivate_coupon(
    coupon_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    from app.models import coupon_model
    coupon_model.deactivate_coupon(db, coupon_id)
    return {"message": "Coupon deactivated."}
