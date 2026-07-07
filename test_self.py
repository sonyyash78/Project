import requests
import json
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
    email = f"admin_selftest_{ts}@examside.com"
    password = "SecureAdminPassword123"
    
    signup_payload = {"name": "Admin SelfTest", "email": email, "password": password}
    requests.post(f"{BASE_URL}/api/auth/signup", json=signup_payload)
    elevate_user_to_admin(email)
    
    login_data = {"username": email, "password": password}
    resp = requests.post(f"{BASE_URL}/api/auth/login", data=login_data)
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n==========================================================")
    print("STEP 9 - SELF TEST")
    print("==========================================================")
    
    payload = {
      "exam":"JEE Main",
      "subject":"Physics",
      "chapter":"Units & Dimensions",
      "question_count":5,
      "difficulty_distribution":{
          "easy":2,
          "medium":2,
          "hard":1
      },
      "language":"English"
    }
    
    print(f"Sending payload:\n{json.dumps(payload, indent=2)}")
    
    resp = requests.post(f"{BASE_URL}/api/admin/ai/generate", json=payload, headers=headers)
    
    print(f"\nResponse Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"Generated exactly {len(data)} questions.")
        for idx, q in enumerate(data):
            print(f"\n[Q{idx+1}] Difficulty: {q.get('difficulty')}")
            print(f"Question: {q.get('question')[:60]}...")
    else:
        print(f"Failed: {resp.text}")

if __name__ == "__main__":
    run_tests()
