import json
from app.database.db import get_db
from sqlalchemy import text

def seed():
    db = next(get_db())
    combos = [
        ('Engineering Super Combo', 'combo_engineering', '1-Year Pass for JEE Main, JEE Adv, BITSAT, VITEEE, GATE, MHT CET & more', 249.0, 249.0, json.dumps({'all_engineering': True, 'mock_tests': True, 'analytics': True, 'ai_features': True}), 10),
        ('Medical Mega Combo', 'combo_medical', '1-Year Pass for NEET, AIIMS, JIPMER', 219.0, 219.0, json.dumps({'all_medical': True, 'mock_tests': True, 'analytics': True, 'ai_features': True}), 11),
        ('Govt & Banking Combo', 'combo_banking', '1-Year Pass for SBI PO, IBPS Clerk, RBI Assistant, SSC CGL, RRB NTPC, UPSC', 249.0, 249.0, json.dumps({'all_govt_banking': True, 'mock_tests': True, 'analytics': True, 'ai_features': True}), 12),
        ('All-Exam All-Access Pass', 'combo_all_access', '1-Year Unlimited Pass for ALL 28+ Exams on ExamSIDE', 349.0, 349.0, json.dumps({'all_exams': True, 'mock_tests': True, 'analytics': True, 'ai_features': True}), 13)
    ]

    for name, slug, desc, mp, yp, feat, sorder in combos:
        db.execute(text('''
            INSERT INTO subscription_plans (name, slug, description, monthly_price, yearly_price, features_json, is_active, sort_order)
            VALUES (:name, :slug, :desc, :mp, :yp, :feat, 1, :sorder)
            ON DUPLICATE KEY UPDATE name = :name, description = :desc, monthly_price = :mp, yearly_price = :yp, features_json = :feat, is_active = 1, sort_order = :sorder
        '''), {'name': name, 'slug': slug, 'desc': desc, 'mp': mp, 'yp': yp, 'feat': feat, 'sorder': sorder})

    db.commit()
    print("Combo plans seeded successfully!")

if __name__ == '__main__':
    seed()
