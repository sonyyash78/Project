import requests
import time
from app.database.db import SessionLocal, engine
from app.models.user_model import User
from sqlalchemy import text

BASE_URL = "http://localhost:8000"

def elevate_user_to_admin(email):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.role = "admin"
            db.commit()
    finally:
        db.close()

def get_question_count():
    with engine.connect() as conn:
        return conn.execute(text("SELECT COUNT(*) FROM questions")).scalar()

def run_tests():
    ts = int(time.time())
    email = f"admin_save_{ts}@examside.com"
    password = "SecureAdminPassword123"
    
    requests.post(f"{BASE_URL}/api/auth/signup", json={"name": "Admin Save", "email": email, "password": password})
    elevate_user_to_admin(email)
    
    resp = requests.post(f"{BASE_URL}/api/auth/login", data={"username": email, "password": password})
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
def run_tests():
    ts = int(time.time())
    email = f"admin_save_{ts}@examside.com"
    password = "SecureAdminPassword123"
    requests.post(f"{BASE_URL}/api/auth/signup", json={"name": "Admin Save", "email": email, "password": password})
    
    # We must use raw sql to elevate this user
    from app.database.db import engine
    from sqlalchemy import text
    with engine.connect() as conn:
        conn.execute(text(f"UPDATE users SET role = 'admin' WHERE email = '{email}'"))
        conn.commit()
    
    resp = requests.post(f"{BASE_URL}/api/auth/login", data={"username": email, "password": password})
    token = resp.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Generate 5 questions (Run 1)
    print("\n--- RUN 1 ---")
    print("Generating 5 questions...")
    gen_payload = {
        "exam": "JEE Main",
        "subject": "Physics",
        "chapter": "Units & Dimensions",
        "question_count": 5,
        "difficulty_distribution": {"easy": 2, "medium": 2, "hard": 1},
        "language": "English"
    }
    resp_gen = requests.post(f"{BASE_URL}/api/admin/ai/generate", json=gen_payload, headers=headers)
    questions1 = resp_gen.json()
    print(f"Generated {len(questions1)} questions")
    
    initial_count = get_question_count()
    
    print("Saving questions...")
    save_payload = {
        "exam": "JEE Main",
        "subject": "Physics",
        "chapter": "Units & Dimensions",
        "topic": "General",
        "language": "English",
        "generation_time": 5.0,
        "duplicates_removed": 0,
        "questions": questions1
    }
    resp_save = requests.post(f"{BASE_URL}/api/admin/ai/save", json=save_payload, headers=headers)
    
    count_after_run1 = get_question_count()
    print(f"DB Increase Run 1: {count_after_run1 - initial_count}")
    
    # 2. Run 2 (Same payload)
    print("\n--- RUN 2 (Saving same questions again) ---")
    resp_save2 = requests.post(f"{BASE_URL}/api/admin/ai/save", json=save_payload, headers=headers)
    count_after_run2 = get_question_count()
    print(f"DB Increase Run 2: {count_after_run2 - count_after_run1}")
    print(f"Duplicates Skipped Run 2: {resp_save2.json()['data']['duplicates_skipped']}")

if __name__ == "__main__":
    run_tests()
