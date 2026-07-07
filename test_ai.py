import requests
import time
from app.database.db import SessionLocal
from app.models.user_model import User

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

def run_tests():
    ts = int(time.time())
    email = f"admin_ai_{ts}@examside.com"
    password = "SecureAdminPassword123"
    
    signup_payload = {"name": "Admin AI", "email": email, "password": password}
    requests.post(f"{BASE_URL}/api/auth/signup", json=signup_payload)
    elevate_user_to_admin(email)
    
    login_data = {"username": email, "password": password}
    resp = requests.post(f"{BASE_URL}/api/auth/login", data=login_data)
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n--- Testing LOWERCASE difficulty payload (should be 0 questions returned) ---")
    payload1 = {
        "exam": "Jee Main",
        "subject": "physics",
        "chapter": "Units & Dimensions",
        "question_count": 2,
        "difficulty_distribution": {
            "easy": 1,
            "medium": 1,
            "hard": 0
        },
        "language": "english"
    }
    resp1 = requests.post(f"{BASE_URL}/api/admin/ai/generate", json=payload1, headers=headers)
    print("Status:", resp1.status_code)
    print("Response Length:", len(resp1.json()) if resp1.status_code == 200 else resp1.text)
    print("Response JSON:", resp1.json() if resp1.status_code == 200 else resp1.text)

    print("\n--- Testing UPPERCASE difficulty payload (should return actual questions) ---")
    payload2 = {
        "exam": "Jee Main",
        "subject": "physics",
        "chapter": "Units & Dimensions",
        "question_count": 2,
        "difficulty_distribution": {
            "Easy": 1,
            "Medium": 1,
            "Hard": 0
        },
        "language": "english"
    }
    resp2 = requests.post(f"{BASE_URL}/api/admin/ai/generate", json=payload2, headers=headers)
    print("Status:", resp2.status_code)
    if resp2.status_code == 200:
        print(f"Generated {len(resp2.json())} questions!")
        for i, q in enumerate(resp2.json()):
            print(f"\nQ{i+1}: {q['question'][:50]}...")
            print(f"Difficulty: {q.get('difficulty', 'Unknown')}")
    else:
        print("Failed:", resp2.text)

if __name__ == "__main__":
    run_tests()
