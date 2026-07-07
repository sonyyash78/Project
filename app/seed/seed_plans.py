import json

def seed_subscription_plans(db):
    cursor = db.cursor()
    
    plans = [
        (1, "FREE", "free", 0.00, 0.00, json.dumps(["basic_tests"]), 1, 0),
        (2, "PRO", "pro", 149.00, 1499.00, json.dumps(["basic_tests", "premium_tests", "mock_tests", "analytics"]), 1, 1),
        (3, "PREMIUM", "premium", 299.00, 2999.00, json.dumps(["basic_tests", "premium_tests", "mock_tests", "analytics", "advanced_reports"]), 1, 2),
        (4, "ULTIMATE", "ultimate", 499.00, 4999.00, json.dumps(["basic_tests", "premium_tests", "mock_tests", "analytics", "advanced_reports", "ai_features"]), 1, 3)
    ]
    
    cursor.executemany("""
        INSERT IGNORE INTO subscription_plans (id, name, slug, monthly_price, yearly_price, features_json, is_active, sort_order)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, plans)
    db.commit()