from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv

# ── Load env ──────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(ENV_PATH)

# Also try project root .env
PROJECT_ROOT = BASE_DIR.parent
load_dotenv(PROJECT_ROOT / ".env", override=False)

# ── MySQL ─────────────────────────────────────────────────────
MYSQL_USER = os.getenv("MYSQLUSER", "root")
MYSQL_PASSWORD = os.getenv("MYSQLPASSWORD", "")
MYSQL_HOST = os.getenv("MYSQLHOST", "localhost")
MYSQL_PORT = os.getenv("MYSQLPORT", "3306")
MYSQL_DATABASE = os.getenv("MYSQLDATABASE", "railway")

DATABASE_URL = (
    f"mysql+pymysql://{MYSQL_USER}:{quote_plus(MYSQL_PASSWORD)}@{MYSQL_HOST}:"
    f"{MYSQL_PORT}/{MYSQL_DATABASE}"
)

# ── JWT ───────────────────────────────────────────────────────
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "replace-with-strong-secret")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
RESET_TOKEN_EXPIRE_MINUTES = int(os.getenv("RESET_TOKEN_EXPIRE_MINUTES", "15"))
VERIFICATION_TOKEN_EXPIRE_HOURS = int(os.getenv("VERIFICATION_TOKEN_EXPIRE_HOURS", "24"))

# ── CORS ──────────────────────────────────────────────────────
ALLOW_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOW_ORIGINS", "https://project-eight-hazel-68.vercel.app,http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:3000").split(",")
    if origin.strip()
]

# ── Email / SMTP ──────────────────────────────────────────────
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_EMAIL = os.getenv("SMTP_EMAIL", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "ExamSIDE")

# ── Frontend URL (for email links) ────────────────────────────
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://project-eight-hazel-68.vercel.app")

# ── Rate Limiting ─────────────────────────────────────────────
LOGIN_RATE_LIMIT = int(os.getenv("LOGIN_RATE_LIMIT", "5"))          # max attempts
LOGIN_RATE_WINDOW = int(os.getenv("LOGIN_RATE_WINDOW", "60"))       # seconds
API_RATE_LIMIT = int(os.getenv("API_RATE_LIMIT", "100"))            # max per window
API_RATE_WINDOW = int(os.getenv("API_RATE_WINDOW", "60"))           # seconds

# ── Security ──────────────────────────────────────────────────
ACCOUNT_LOCK_ATTEMPTS = int(os.getenv("ACCOUNT_LOCK_ATTEMPTS", "5"))
ACCOUNT_LOCK_MINUTES = int(os.getenv("ACCOUNT_LOCK_MINUTES", "15"))
MIN_PASSWORD_LENGTH = int(os.getenv("MIN_PASSWORD_LENGTH", "8"))

# ── Google OAuth (infrastructure — add credentials to enable) ─
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")

# ── App ───────────────────────────────────────────────────────
APP_NAME = os.getenv("APP_NAME", "ExamSIDE API")
APP_VERSION = os.getenv("APP_VERSION", "2.0.0")
APP_ENV = os.getenv("APP_ENV", "development")  # development, staging, production

# ── Razorpay ──────────────────────────────────────────────────
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")

# ── MongoDB ─────────────────────────────────────────────────
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/examdb")
# ── Billing ───────────────────────────────────────────────────
GST_RATE = float(os.getenv("GST_RATE", "18"))
CURRENCY = os.getenv("CURRENCY", "INR")
REFERRAL_REWARD_AMOUNT = int(os.getenv("REFERRAL_REWARD_AMOUNT", "50"))

# ── AI Generator (Multi-Key Architecture) ─────────────────────
GEMINI_API_KEY_1 = os.getenv("GEMINI_API_KEY_1", "")
GEMINI_API_KEY_2 = os.getenv("GEMINI_API_KEY_2", "")
GEMINI_API_KEY_3 = os.getenv("GEMINI_API_KEY_3", "")
GEMINI_API_KEY_4 = os.getenv("GEMINI_API_KEY_4", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

AI_BATCH_SIZE = int(os.getenv("AI_BATCH_SIZE", "25"))
MAX_PARALLEL_WORKERS = int(os.getenv("MAX_PARALLEL_WORKERS", "4"))
AI_RETRY_COUNT = int(os.getenv("AI_RETRY_COUNT", "5"))


