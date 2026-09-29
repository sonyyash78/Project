import pymysql
import os
from dotenv import load_dotenv

load_dotenv('.env')

conn = pymysql.connect(
    host=os.getenv('MYSQLHOST', 'localhost'),
    user=os.getenv('MYSQLUSER', 'root'),
    password=os.getenv('MYSQLPASSWORD', 'root1234@'),
    database=os.getenv('MYSQLDATABASE', 'railway')
)
cursor = conn.cursor()
try:
    cursor.execute('ALTER TABLE payments ADD COLUMN exam_id INT NULL')
except Exception as e:
    print("Column might exist:", e)
conn.commit()
conn.close()

# Update payment_model.py
payment_model_path = 'app/models/payment_model.py'
with open(payment_model_path, 'r', encoding='utf-8') as f:
    pm = f.read()

pm = pm.replace(
    '''            coupon_id, coupon_discount, wallet_amount_used, plan_slug, billing_cycle''',
    '''            coupon_id, coupon_discount, wallet_amount_used, plan_slug, billing_cycle, exam_id'''
)
pm = pm.replace(
    '''            data.get("billing_cycle"),''',
    '''            data.get("billing_cycle"),
            data.get("exam_id"),'''
)
pm = pm.replace(
    '''%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)''',
    '''%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)'''
)
pm = pm.replace(
    '''               coupon_id, wallet_amount_used, plan_slug, billing_cycle, coupon_discount''',
    '''               coupon_id, wallet_amount_used, plan_slug, billing_cycle, coupon_discount, exam_id'''
)
pm = pm.replace(
    '''        "coupon_discount": float(p[11] or 0),''',
    '''        "coupon_discount": float(p[11] or 0),
        "exam_id": p[12],'''
)

with open(payment_model_path, 'w', encoding='utf-8') as f:
    f.write(pm)


# Update payment_service.py to pass exam_id and insert into user_exam_subscriptions
payment_service_path = 'app/services/payment_service.py'
with open(payment_service_path, 'r', encoding='utf-8') as f:
    ps = f.read()

ps = ps.replace(
    '''            "plan_slug": plan_slug,
            "billing_cycle": billing_cycle,''',
    '''            "plan_slug": plan_slug,
            "exam_id": exam_id,
            "billing_cycle": billing_cycle,'''
)

hook_injection = '''
    if payment.get("exam_id"):
        from sqlalchemy import text
        # Insert or update user_exam_subscriptions
        db.execute(text("""
            INSERT INTO user_exam_subscriptions (user_id, exam_id, purchased_at, valid_until, payment_order_id)
            VALUES (:uid, :eid, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), :order)
            ON DUPLICATE KEY UPDATE valid_until = DATE_ADD(NOW(), INTERVAL 1 YEAR)
        """), {"uid": user_id, "eid": payment["exam_id"], "order": rz_order_id})
        db.commit()
    else:
        sub_id = subscription_service.activate_paid_subscription(
            db,
            user_id,
            payment["plan_slug"],
            payment["billing_cycle"] or "monthly",
            payment["amount"],
        )
'''

ps = ps.replace(
    '''    sub_id = subscription_service.activate_paid_subscription(
        db,
        user_id,
        payment["plan_slug"],
        payment["billing_cycle"] or "monthly",
        payment["amount"],
    )''',
    hook_injection
)

ps = ps.replace(
    '''            "subscription_id": sub_id,''',
    '''            "subscription_id": locals().get("sub_id"),'''
)

with open(payment_service_path, 'w', encoding='utf-8') as f:
    f.write(ps)

print("Payment flow completed.")
