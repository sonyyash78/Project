"""ExamSIDE API — Production Entry Point.

Phase 2: Enhanced with global exception handling, security headers,
request tracing, and comprehensive health checks.
"""
from datetime import datetime

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text


from app.database.db import Base, engine, get_db
from app.routes.auth_routes import router as auth_router
from app.routes.exam_routes import router as exam_router
from app.routes.subject_routes import router as subject_router
from app.routes.chapter_routes import router as chapter_router
from app.routes.topic_routes import router as topic_router
from app.routes.question_routes import router as question_router
from app.routes.browse_routes import router as browse_router
from app.routes.progress_routes import router as progress_router
from app.routes.mock_test_routes import router as mock_test_router
from app.routes.exam_engine_routes import router as exam_engine_router
from app.routes.subscription_routes import router as subscription_router
from app.routes.payment_routes import router as payment_router
from app.routes.payments_mongo_routes import router as payments_mongo_router
from app.routes.coupon_routes import router as coupon_router
from app.routes.wallet_routes import router as wallet_router
from app.routes.referral_routes import router as referral_router
from app.routes.invoice_routes import router as invoice_router
from app.routes.admin_routes import router as admin_router
from app.ai_question_generator.routes import router as ai_generator_router
import app.models  # Ensures all models are registered with Base.metadata

from app.models.progress_model import Bookmark, TestAttempt, QuestionAttempt
from app.models.ai_model import AIGenerationLog
from app.models.exam_engine_model import (
    Achievement,
    Attempt,
    AttemptAnswer,
    Badge,
    DailyReward,
    ExamSetting,
    LeaderboardEntry,
    QuestionNote,
)
from app.models.token_model import RefreshToken
from app.models.activity_model import ActivityLog, UserSession, PasswordResetToken, EmailVerificationToken
from app.models.topic_model import Topic
from app.models.question_option_model import QuestionOption
from app.models.mock_test_model import MockTest, MockTestQuestion
from app.models.notification_model import Notification
from app.utils.config import ALLOW_ORIGINS, APP_NAME, APP_VERSION, APP_ENV
from app.utils.exceptions import register_exception_handlers, register_middleware
from app.utils.logger import logger


logger.info(f"Starting {APP_NAME} v{APP_VERSION} ({APP_ENV})")


# ── FastAPI App ───────────────────────────────────────────────

app = FastAPI(
    title=APP_NAME,
    description="""
## ExamSIDE — India's Premier Exam Preparation Platform

Production-grade API powering ExamSIDE's exam preparation ecosystem.

### Features
- 🔐 **JWT Authentication** — Access + Refresh tokens with rotation
- 📚 **Exam Management** — CRUD for exams, subjects, chapters, questions
- 📝 **Practice Tests** — Chapter-wise practice with instant feedback
- 🏆 **Mock Tests** — Full-length randomized mock exams
- 📊 **Analytics** — Progress tracking, streaks, weak/strong chapters
- 🔖 **Bookmarks** — Save and revisit questions
- 👑 **Leaderboard** — Competitive rankings
- 💳 **Subscriptions** — Razorpay payments, coupons, wallet, referrals

### Authentication
All protected endpoints require a `Bearer` token in the `Authorization` header.
Use `/api/auth/login` to obtain tokens.
    """,
    version=APP_VERSION,
    contact={
        "name": "ExamSIDE Team",
        "email": "support@examside.com",
    },
    license_info={
        "name": "Proprietary",
    },
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

# ── Exception Handlers & Middleware ───────────────────────────
register_exception_handlers(app)
register_middleware(app)

# ── Ensure tables are available ───────────────────────────────
Base.metadata.create_all(bind=engine)

# ── Routes ────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(exam_router)
app.include_router(subject_router)
app.include_router(chapter_router)
app.include_router(topic_router)
app.include_router(question_router)
app.include_router(browse_router)
app.include_router(progress_router)
app.include_router(mock_test_router)
app.include_router(exam_engine_router)
app.include_router(subscription_router)
app.include_router(payment_router)
app.include_router(payments_mongo_router)
app.include_router(coupon_router)
app.include_router(wallet_router)
app.include_router(referral_router)
app.include_router(invoice_router)
app.include_router(admin_router)
app.include_router(ai_generator_router)

# ── Root ──────────────────────────────────────────────────────

@app.get("/", tags=["System"])
def root():
    return {
        "message": f"{APP_NAME} is running",
        "version": APP_VERSION,
        "environment": APP_ENV,
        "docs": "/docs",
        "endpoints": {
            "auth": "/api/auth",
            "exams": "/api/exams",
            "subjects": "/api/subjects",
            "chapters": "/api/chapters",
            "questions": "/api/questions",
            "browse": "/api/browse",
            "progress": "/api/progress",
            "exam_engine": "/api/exam-engine",
            "subscriptions": "/api/subscriptions",
            "payments": "/api/payments",
            "wallet": "/api/wallet",
            "referrals": "/api/referrals",
            "invoices": "/api/invoices",
            "admin": "/api/admin",
        },
    }


# ── Health Check ──────────────────────────────────────────────

@app.get("/health", tags=["System"], summary="Health check with DB connectivity")
def health_check():
    db_status = "healthy"
    db_latency_ms = None

    try:
        from app.database.db import SessionLocal
        import time

        db = SessionLocal()
        start = time.time()
        db.execute(text("SELECT 1"))
        db_latency_ms = round((time.time() - start) * 1000, 2)
        db.close()
    except Exception as e:
        db_status = f"unhealthy: {str(e)[:100]}"

    return {
        "status": "ok" if db_status == "healthy" else "degraded",
        "version": APP_VERSION,
        "environment": APP_ENV,
        "timestamp": datetime.utcnow().isoformat(),
        "database": {
            "status": db_status,
            "latency_ms": db_latency_ms,
        },
    }


# ── API Version Metadata ─────────────────────────────────────

@app.get("/version", tags=["System"], summary="API version info")
def version_info():
    return {
        "api_version": APP_VERSION,
        "environment": APP_ENV,
        "auth_features": [
            "jwt_access_token",
            "jwt_refresh_token",
            "refresh_token_rotation",
            "secure_logout",
            "forgot_password",
            "reset_password",
            "change_password",
            "email_verification",
            "profile_update",
            "multi_device_sessions",
            "activity_logging",
            "rate_limiting",
            "account_lock",
            "password_strength_validation",
        ],
        "billing_features": [
            "razorpay_payments",
            "subscription_plans",
            "coupons",
            "wallet",
            "referrals",
            "invoices",
            "revenue_analytics",
        ],
    }
