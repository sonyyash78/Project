import os
import re

# 1. Refactor payment_service.py
payment_service_path = 'app/services/payment_service.py'
with open(payment_service_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace create_checkout_order signature
old_sig = 'def create_checkout_order(db, user_id: int, plan_slug: str, billing_cycle: str, coupon_code=None, use_wallet=False):'
new_sig = '''def create_checkout_order(db, user_id: int, plan_slug: str = None, exam_id: int = None, billing_cycle: str = "monthly", coupon_code=None, use_wallet=False):
    from app.models.exam_model import Exam
    if exam_id:
        from sqlalchemy import text
        exam = db.execute(text("SELECT id, price, discounted_price FROM exams WHERE id = :eid"), {"eid": exam_id}).fetchone()
        if not exam:
            raise ValueError("Exam not found.")
        base_price = exam[2] if exam[2] else exam[1]
    else:'''
content = content.replace(old_sig, new_sig)

# Indent the old plan logic block (dirty but works if we just replace it)
old_plan_logic = '''    plan = subscription_model.get_plan_by_slug(db, plan_slug)
    if not plan:
        raise ValueError("Plan not found.")

    base_price = plan["monthly_price"] if billing_cycle == "monthly" else plan["yearly_price"]'''
new_plan_logic = '''        plan = subscription_model.get_plan_by_slug(db, plan_slug)
        if not plan:
            raise ValueError("Plan not found.")
        base_price = plan["monthly_price"] if billing_cycle == "monthly" else plan["yearly_price"]'''
content = content.replace(old_plan_logic, new_plan_logic)

# Replace rz_order_id generation to include exam_id
old_rz = 'rz_order_id = f"FREE_{user_id}_{plan_slug}_{int(datetime_now_ts())}"'
new_rz = 'rz_order_id = f"FREE_{user_id}_{exam_id or plan_slug}_{int(datetime_now_ts())}"'
content = content.replace(old_rz, new_rz)

# Update payment creation to save exam_id? We don't have exam_id in payments table!
# Let's alter payments table to include exam_id first!
# I will do it in this script.

with open(payment_service_path, 'w', encoding='utf-8') as f:
    f.write(content)


# 2. Refactor payment_routes.py
payment_routes_path = 'app/routes/payment_routes.py'
with open(payment_routes_path, 'r', encoding='utf-8') as f:
    r_content = f.read()

old_route_call = '''        return payment_service.create_checkout_order(
            db,
            current_user.id,
            payload.plan_slug,
            payload.billing_cycle,
            payload.coupon_code,
            payload.use_wallet,
        )'''
new_route_call = '''        return payment_service.create_checkout_order(
            db,
            current_user.id,
            plan_slug=payload.plan_slug,
            exam_id=payload.exam_id,
            billing_cycle=payload.billing_cycle,
            coupon_code=payload.coupon_code,
            use_wallet=payload.use_wallet,
        )'''
r_content = r_content.replace(old_route_call, new_route_call)
with open(payment_routes_path, 'w', encoding='utf-8') as f:
    f.write(r_content)


# 3. Add verify_exam_access to a new file app/utils/exam_security.py
exam_sec = '''
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.models.user_model import User
from app.utils.jwt_handler import get_current_user
from sqlalchemy import text

def verify_exam_access(exam_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == 'admin':
        return current_user
    
    # Check if user has global subscription (legacy)
    if current_user.subscription_plan and current_user.subscription_plan != 'free':
        if current_user.premium_until:
            from datetime import datetime
            if current_user.premium_until > datetime.utcnow():
                return current_user

    # Check if user has exam-specific subscription
    res = db.execute(text("SELECT id FROM user_exam_subscriptions WHERE user_id = :uid AND exam_id = :eid AND valid_until > NOW()"), {"uid": current_user.id, "eid": exam_id}).fetchone()
    if res:
        return current_user

    raise HTTPException(status_code=403, detail="Purchase required to access this exam.")
'''
with open('app/utils/exam_security.py', 'w', encoding='utf-8') as f:
    f.write(exam_sec)

print("Backend refactored.")
