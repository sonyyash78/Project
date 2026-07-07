"""Database configuration with automatic schema migration.

IMPORTANT: This file runs migrations at import time to safely
add new columns/tables without losing any existing data.
"""

from urllib.parse import quote_plus

from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import declarative_base, sessionmaker

from app.utils.config import (
    DATABASE_URL,
    MYSQL_DATABASE,
    MYSQL_HOST,
    MYSQL_PASSWORD,
    MYSQL_PORT,
    MYSQL_USER,
)
from app.utils.logger import logger


def ensure_database_exists() -> None:
    admin_url = (
        f"mysql+pymysql://{MYSQL_USER}:{quote_plus(MYSQL_PASSWORD)}@{MYSQL_HOST}:"
        f"{MYSQL_PORT}/"
    )
    admin_engine = create_engine(
        admin_url,
        pool_pre_ping=True,
        pool_recycle=3600,
        echo=False,
    )
    try:
        with admin_engine.connect() as connection:
            connection.execute(
                text(
                    f"CREATE DATABASE IF NOT EXISTS `{MYSQL_DATABASE}` "
                    f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                )
            )
            connection.commit()
    except Exception as e:
        print("\n" + "="*70)
        print("🚨 CRITICAL ERROR: MYSQL IS NOT RUNNING! 🚨")
        print("="*70)
        print("The backend cannot start because it cannot connect to MySQL.")
        print("Please start XAMPP or your MySQL server and try again.")
        print("="*70 + "\n")
        raise e
    finally:
        admin_engine.dispose()


def _safe_add_column(conn, table: str, column: str, col_type: str, inspector) -> None:
    """Add a column to a table if it doesn't exist. Never fails on existing columns."""
    columns = [c["name"] for c in inspector.get_columns(table)]
    if column not in columns:
        try:
            conn.execute(text(f"ALTER TABLE `{table}` ADD COLUMN `{column}` {col_type};"))
            logger.info(f"Migration: Added column {table}.{column}")
        except Exception as e:
            logger.warning(f"Migration skip {table}.{column}: {e}")


def _safe_create_index(conn, table: str, index_name: str, columns: list[str], inspector) -> None:
    """Create an index on a table if it doesn't exist."""
    try:
        indexes = [idx["name"] for idx in inspector.get_indexes(table)]
        if index_name not in indexes:
            cols_str = ", ".join([f"`{c}`" for c in columns])
            conn.execute(text(f"CREATE INDEX `{index_name}` ON `{table}` ({cols_str});"))
            logger.info(f"Migration: Created index {index_name} on {table}")
    except Exception as e:
        logger.warning(f"Migration skip index {index_name} on {table}: {e}")


def _seed_subscription_plans(db_engine) -> None:
    """Seed subscription plans and premium features. Idempotent — skips if data exists."""
    import json

    plans = [
        {"name": "FREE", "slug": "free", "desc": "Get started with basic features", "monthly": 0, "yearly": 0, "order": 0},
        {"name": "PRO", "slug": "pro", "desc": "For serious exam aspirants", "monthly": 149, "yearly": 1499, "order": 1},
        {"name": "PREMIUM", "slug": "premium", "desc": "Advanced analytics and reports", "monthly": 299, "yearly": 2999, "order": 2},
        {"name": "ULTIMATE", "slug": "ultimate", "desc": "Everything unlimited with AI", "monthly": 499, "yearly": 4999, "order": 3},
    ]

    features = {
        "premium_tests": "Premium Tests",
        "mock_tests": "Mock Tests",
        "analytics": "Analytics",
        "bookmarks": "Bookmarks",
        "advanced_reports": "Advanced Reports",
        "premium_dashboard": "Premium Dashboard",
        "ai_features": "AI Features",
        "premium_badge": "Premium Badge",
        "premium_themes": "Premium Themes",
    }

    plan_features = {
        "free": [],
        "pro": ["premium_tests", "mock_tests", "analytics", "bookmarks"],
        "premium": ["premium_tests", "mock_tests", "analytics", "bookmarks", "advanced_reports", "premium_dashboard", "premium_badge"],
        "ultimate": list(features.keys()),
    }

    try:
        with db_engine.connect() as conn:
            existing = conn.execute(text("SELECT COUNT(*) as cnt FROM subscription_plans")).fetchone()
            if existing and existing[0] > 0:
                return

            for plan in plans:
                enabled = plan_features.get(plan["slug"], [])
                features_json = json.dumps({k: k in enabled for k in features})
                conn.execute(
                    text("""INSERT INTO subscription_plans (name, slug, description, monthly_price, yearly_price, features_json, sort_order)
                            VALUES (:name, :slug, :desc, :monthly, :yearly, :features, :sort_order)"""),
                    {"name": plan["name"], "slug": plan["slug"], "desc": plan["desc"],
                     "monthly": plan["monthly"], "yearly": plan["yearly"],
                     "features": features_json, "sort_order": plan["order"]}
                )

            plan_rows = conn.execute(text("SELECT id, slug FROM subscription_plans")).fetchall()
            plan_id_map = {row[1]: row[0] for row in plan_rows}

            for slug, enabled_keys in plan_features.items():
                plan_id = plan_id_map.get(slug)
                if not plan_id:
                    continue
                for key, name in features.items():
                    conn.execute(
                        text("""INSERT INTO premium_features (plan_id, feature_key, feature_name, is_enabled)
                                VALUES (:plan_id, :key, :name, :enabled)"""),
                        {"plan_id": plan_id, "key": key, "name": name, "enabled": key in enabled_keys}
                    )

            conn.commit()
            logger.info("Migration: Seeded subscription plans and premium features")
    except Exception as e:
        logger.warning(f"Plan seed skip: {e}")


def run_schema_migrations(db_engine) -> None:
    """Run safe, idempotent schema migrations.

    This function ONLY adds columns/tables. It NEVER removes or modifies
    existing columns. Safe to run multiple times.
    """
    try:
        inspector = inspect(db_engine)
        existing_tables = inspector.get_table_names()

        with db_engine.begin() as conn:

            # ── Migrate exams table ───────────────────────────
            if "exams" in existing_tables:
                _safe_add_column(conn, "exams", "positive_marks", "FLOAT DEFAULT 4.0", inspector)
                _safe_add_column(conn, "exams", "negative_marks", "FLOAT DEFAULT -1.0", inspector)

            # ── Migrate questions table ───────────────────────
            if "questions" in existing_tables:
                _safe_add_column(conn, "questions", "difficulty", "VARCHAR(50) DEFAULT 'Medium'", inspector)
                _safe_add_column(conn, "questions", "marks", "FLOAT DEFAULT 4.0", inspector)
                _safe_add_column(conn, "questions", "negative_marks", "FLOAT DEFAULT -1.0", inspector)
                _safe_add_column(conn, "questions", "time", "INTEGER DEFAULT 60", inspector)
                _safe_add_column(conn, "questions", "topic", "VARCHAR(200)", inspector)
                _safe_add_column(conn, "questions", "language", "VARCHAR(50) DEFAULT 'en'", inspector)
                _safe_add_column(conn, "questions", "source", "VARCHAR(200)", inspector)
                _safe_add_column(conn, "questions", "tags", "VARCHAR(500)", inspector)
                _safe_add_column(conn, "questions", "status", "VARCHAR(50) DEFAULT 'active'", inspector)
                _safe_add_column(conn, "questions", "created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP", inspector)
                _safe_add_column(conn, "questions", "updated_at", "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP", inspector)
                _safe_create_index(conn, "questions", "ix_questions_exam_id", ["exam_id"], inspector)
                _safe_create_index(conn, "questions", "ix_questions_chapter_id", ["chapter_id"], inspector)
                _safe_create_index(conn, "questions", "ix_questions_difficulty", ["difficulty"], inspector)
                _safe_create_index(conn, "questions", "ix_questions_topic", ["topic"], inspector)

            # ── Phase 2: Migrate users table ──────────────────
            if "users" in existing_tables:
                _safe_add_column(conn, "users", "avatar_url", "VARCHAR(500) DEFAULT NULL", inspector)
                _safe_add_column(conn, "users", "is_verified", "BOOLEAN DEFAULT FALSE", inspector)
                _safe_add_column(conn, "users", "created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP", inspector)
                _safe_add_column(conn, "users", "updated_at", "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP", inspector)
                _safe_add_column(conn, "users", "last_login", "DATETIME DEFAULT NULL", inspector)
                _safe_add_column(conn, "users", "last_active", "DATETIME DEFAULT NULL", inspector)
                _safe_add_column(conn, "users", "last_login_ip", "VARCHAR(50) DEFAULT NULL", inspector)
                _safe_add_column(conn, "users", "timezone", "VARCHAR(50) DEFAULT 'Asia/Kolkata'", inspector)
                _safe_add_column(conn, "users", "language", "VARCHAR(10) DEFAULT 'en'", inspector)
                _safe_add_column(conn, "users", "theme", "VARCHAR(20) DEFAULT 'dark'", inspector)
                _safe_add_column(conn, "users", "notification_enabled", "BOOLEAN DEFAULT TRUE", inspector)
                _safe_add_column(conn, "users", "premium_until", "DATETIME DEFAULT NULL", inspector)
                _safe_add_column(conn, "users", "subscription_plan", "VARCHAR(50) DEFAULT 'free'", inspector)
                _safe_add_column(conn, "users", "failed_login_attempts", "INTEGER DEFAULT 0", inspector)
                _safe_add_column(conn, "users", "locked_until", "DATETIME DEFAULT NULL", inspector)

                # ── Phase 3: Gamification columns ──────────────────
                _safe_add_column(conn, "users", "xp", "INTEGER NOT NULL DEFAULT 0", inspector)
                _safe_add_column(conn, "users", "coins", "INTEGER NOT NULL DEFAULT 0", inspector)
                _safe_add_column(conn, "users", "level", "INTEGER NOT NULL DEFAULT 1", inspector)
                _safe_add_column(conn, "users", "streak_days", "INTEGER NOT NULL DEFAULT 0", inspector)
                _safe_add_column(conn, "users", "longest_streak", "INTEGER NOT NULL DEFAULT 0", inspector)
                _safe_add_column(conn, "users", "last_streak_date", "DATETIME DEFAULT NULL", inspector)
                _safe_add_column(conn, "users", "total_tests_taken", "INTEGER NOT NULL DEFAULT 0", inspector)
                _safe_add_column(conn, "users", "total_time_spent", "INTEGER NOT NULL DEFAULT 0", inspector)
                _safe_add_column(conn, "users", "title", "VARCHAR(100) NOT NULL DEFAULT 'Beginner'", inspector)

            # ── Phase 2: Create refresh_tokens table ──────────
            if "refresh_tokens" not in existing_tables:
                conn.execute(text("""
                    CREATE TABLE refresh_tokens (
                        id INTEGER PRIMARY KEY AUTO_INCREMENT,
                        user_id INTEGER NOT NULL,
                        token_hash VARCHAR(500) NOT NULL,
                        device_name VARCHAR(200) DEFAULT NULL,
                        device_ip VARCHAR(50) DEFAULT NULL,
                        user_agent VARCHAR(500) DEFAULT NULL,
                        expires_at DATETIME NOT NULL,
                        is_revoked BOOLEAN DEFAULT FALSE,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE KEY uq_token_hash (token_hash),
                        INDEX ix_rt_user_id (user_id),
                        INDEX ix_rt_token_hash (token_hash),
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """))
                logger.info("Migration: Created table refresh_tokens")

            # ── Phase 2: Create activity_logs table ───────────
            if "activity_logs" not in existing_tables:
                conn.execute(text("""
                    CREATE TABLE activity_logs (
                        id INTEGER PRIMARY KEY AUTO_INCREMENT,
                        user_id INTEGER DEFAULT NULL,
                        action VARCHAR(100) NOT NULL,
                        ip_address VARCHAR(50) DEFAULT NULL,
                        user_agent VARCHAR(500) DEFAULT NULL,
                        device VARCHAR(200) DEFAULT NULL,
                        browser VARCHAR(100) DEFAULT NULL,
                        os VARCHAR(100) DEFAULT NULL,
                        details TEXT DEFAULT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        INDEX ix_al_user_id (user_id),
                        INDEX ix_al_action (action),
                        INDEX ix_al_created_at (created_at),
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """))
                logger.info("Migration: Created table activity_logs")

            # ── Phase 2: Create user_sessions table ───────────
            if "user_sessions" not in existing_tables:
                conn.execute(text("""
                    CREATE TABLE user_sessions (
                        id INTEGER PRIMARY KEY AUTO_INCREMENT,
                        user_id INTEGER NOT NULL,
                        session_token VARCHAR(500) NOT NULL,
                        device_name VARCHAR(200) DEFAULT NULL,
                        device_type VARCHAR(50) DEFAULT NULL,
                        browser VARCHAR(100) DEFAULT NULL,
                        os VARCHAR(100) DEFAULT NULL,
                        ip_address VARCHAR(50) DEFAULT NULL,
                        location VARCHAR(200) DEFAULT NULL,
                        is_active VARCHAR(10) DEFAULT 'true',
                        last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        expires_at DATETIME NOT NULL,
                        UNIQUE KEY uq_session_token (session_token),
                        INDEX ix_us_user_id (user_id),
                        INDEX ix_us_session_token (session_token),
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """))
                logger.info("Migration: Created table user_sessions")

            # ── Phase 2: Create password_reset_tokens table ───
            if "password_reset_tokens" not in existing_tables:
                conn.execute(text("""
                    CREATE TABLE password_reset_tokens (
                        id INTEGER PRIMARY KEY AUTO_INCREMENT,
                        user_id INTEGER NOT NULL,
                        token_hash VARCHAR(500) NOT NULL,
                        expires_at DATETIME NOT NULL,
                        is_used VARCHAR(10) DEFAULT 'false',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE KEY uq_prt_token_hash (token_hash),
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """))
                logger.info("Migration: Created table password_reset_tokens")

            # ── Phase 2: Create email_verification_tokens table
            if "email_verification_tokens" not in existing_tables:
                conn.execute(text("""
                    CREATE TABLE email_verification_tokens (
                        id INTEGER PRIMARY KEY AUTO_INCREMENT,
                        user_id INTEGER NOT NULL,
                        token_hash VARCHAR(500) NOT NULL,
                        expires_at DATETIME NOT NULL,
                        is_used VARCHAR(10) DEFAULT 'false',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE KEY uq_evt_token_hash (token_hash),
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """))
                logger.info("Migration: Created table email_verification_tokens")

            # ── Phase 3: Enterprise exam engine tables ────────
            if "exam_settings" not in existing_tables:
                conn.execute(text("""
                    CREATE TABLE exam_settings (
                        id INTEGER PRIMARY KEY AUTO_INCREMENT,
                        exam_id INTEGER NOT NULL,
                        duration_minutes INTEGER NOT NULL DEFAULT 60,
                        positive_marks FLOAT NOT NULL DEFAULT 4.0,
                        negative_marks FLOAT NOT NULL DEFAULT -1.0,
                        passing_marks FLOAT NOT NULL DEFAULT 0.0,
                        difficulty VARCHAR(50) NOT NULL DEFAULT 'mixed',
                        language VARCHAR(20) NOT NULL DEFAULT 'en',
                        calculator_allowed BOOLEAN NOT NULL DEFAULT FALSE,
                        fullscreen_required BOOLEAN NOT NULL DEFAULT FALSE,
                        shuffle_questions BOOLEAN NOT NULL DEFAULT TRUE,
                        shuffle_options BOOLEAN NOT NULL DEFAULT FALSE,
                        question_limit INTEGER NOT NULL DEFAULT 30,
                        scheduled_start_at DATETIME DEFAULT NULL,
                        scheduled_end_at DATETIME DEFAULT NULL,
                        live_mode_enabled BOOLEAN NOT NULL DEFAULT FALSE,
                        instructions TEXT DEFAULT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        UNIQUE KEY uq_exam_settings_exam_id (exam_id),
                        INDEX ix_exam_settings_exam_id (exam_id),
                        FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """))
                logger.info("Migration: Created table exam_settings")

            if "attempts" not in existing_tables:
                conn.execute(text("""
                    CREATE TABLE attempts (
                        id INTEGER PRIMARY KEY AUTO_INCREMENT,
                        user_id INTEGER NOT NULL,
                        exam_id INTEGER DEFAULT NULL,
                        subject_id INTEGER DEFAULT NULL,
                        chapter_id INTEGER DEFAULT NULL,
                        exam_setting_id INTEGER DEFAULT NULL,
                        mode VARCHAR(50) NOT NULL,
                        status VARCHAR(30) NOT NULL DEFAULT 'in_progress',
                        total_questions INTEGER NOT NULL DEFAULT 0,
                        duration_seconds INTEGER NOT NULL DEFAULT 0,
                        remaining_seconds INTEGER NOT NULL DEFAULT 0,
                        elapsed_seconds INTEGER NOT NULL DEFAULT 0,
                        score FLOAT NOT NULL DEFAULT 0.0,
                        total_marks FLOAT NOT NULL DEFAULT 0.0,
                        correct_count INTEGER NOT NULL DEFAULT 0,
                        wrong_count INTEGER NOT NULL DEFAULT 0,
                        skipped_count INTEGER NOT NULL DEFAULT 0,
                        accuracy FLOAT NOT NULL DEFAULT 0.0,
                        speed FLOAT NOT NULL DEFAULT 0.0,
                        percentile FLOAT NOT NULL DEFAULT 0.0,
                        rank INTEGER DEFAULT NULL,
                        config_snapshot JSON DEFAULT NULL,
                        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        last_saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        submitted_at DATETIME DEFAULT NULL,
                        expires_at DATETIME DEFAULT NULL,
                        INDEX ix_attempts_user_id (user_id),
                        INDEX ix_attempts_exam_id (exam_id),
                        INDEX ix_attempts_status (status),
                        INDEX ix_attempts_mode (mode),
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE SET NULL,
                        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
                        FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE SET NULL,
                        FOREIGN KEY (exam_setting_id) REFERENCES exam_settings(id) ON DELETE SET NULL
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """))
                logger.info("Migration: Created table attempts")

            if "attempt_answers" not in existing_tables:
                conn.execute(text("""
                    CREATE TABLE attempt_answers (
                        id INTEGER PRIMARY KEY AUTO_INCREMENT,
                        attempt_id INTEGER NOT NULL,
                        question_id INTEGER NOT NULL,
                        selected_answer VARCHAR(255) DEFAULT NULL,
                        is_correct BOOLEAN NOT NULL DEFAULT FALSE,
                        is_bookmarked BOOLEAN NOT NULL DEFAULT FALSE,
                        is_marked_for_review BOOLEAN NOT NULL DEFAULT FALSE,
                        visited BOOLEAN NOT NULL DEFAULT FALSE,
                        skipped BOOLEAN NOT NULL DEFAULT TRUE,
                        hidden_options JSON DEFAULT NULL,
                        eliminated_options JSON DEFAULT NULL,
                        answer_changes INTEGER NOT NULL DEFAULT 0,
                        time_spent_seconds INTEGER NOT NULL DEFAULT 0,
                        last_answered_at DATETIME DEFAULT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX ix_attempt_answers_attempt_id (attempt_id),
                        INDEX ix_attempt_answers_question_id (question_id),
                        FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE,
                        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """))
                logger.info("Migration: Created table attempt_answers")

            if "question_notes" not in existing_tables:
                conn.execute(text("""
                    CREATE TABLE question_notes (
                        id INTEGER PRIMARY KEY AUTO_INCREMENT,
                        user_id INTEGER NOT NULL,
                        question_id INTEGER NOT NULL,
                        attempt_id INTEGER DEFAULT NULL,
                        note TEXT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX ix_question_notes_user_id (user_id),
                        INDEX ix_question_notes_question_id (question_id),
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
                        FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE SET NULL
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """))
                logger.info("Migration: Created table question_notes")

            if "leaderboards" not in existing_tables:
                conn.execute(text("""
                    CREATE TABLE leaderboards (
                        id INTEGER PRIMARY KEY AUTO_INCREMENT,
                        user_id INTEGER NOT NULL,
                        exam_id INTEGER DEFAULT NULL,
                        scope VARCHAR(30) NOT NULL DEFAULT 'global',
                        period VARCHAR(30) NOT NULL DEFAULT 'all_time',
                        score FLOAT NOT NULL DEFAULT 0.0,
                        accuracy FLOAT NOT NULL DEFAULT 0.0,
                        speed FLOAT NOT NULL DEFAULT 0.0,
                        xp INTEGER NOT NULL DEFAULT 0,
                        coins INTEGER NOT NULL DEFAULT 0,
                        tests_taken INTEGER NOT NULL DEFAULT 0,
                        rank INTEGER DEFAULT NULL,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX ix_leaderboards_scope (scope),
                        INDEX ix_leaderboards_exam_id (exam_id),
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE SET NULL
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """))
                logger.info("Migration: Created table leaderboards")

            if "achievements" not in existing_tables:
                conn.execute(text("""
                    CREATE TABLE achievements (
                        id INTEGER PRIMARY KEY AUTO_INCREMENT,
                        user_id INTEGER NOT NULL,
                        code VARCHAR(100) NOT NULL,
                        title VARCHAR(200) NOT NULL,
                        description TEXT DEFAULT NULL,
                        xp_reward INTEGER NOT NULL DEFAULT 0,
                        coins_reward INTEGER NOT NULL DEFAULT 0,
                        unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        INDEX ix_achievements_user_id (user_id),
                        INDEX ix_achievements_code (code),
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """))
                logger.info("Migration: Created table achievements")

            if "badges" not in existing_tables:
                conn.execute(text("""
                    CREATE TABLE badges (
                        id INTEGER PRIMARY KEY AUTO_INCREMENT,
                        user_id INTEGER NOT NULL,
                        badge_name VARCHAR(200) NOT NULL,
                        badge_level VARCHAR(50) NOT NULL DEFAULT 'bronze',
                        awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        INDEX ix_badges_user_id (user_id),
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """))
                logger.info("Migration: Created table badges")

            if "daily_rewards" not in existing_tables:
                conn.execute(text("""
                    CREATE TABLE daily_rewards (
                        id INTEGER PRIMARY KEY AUTO_INCREMENT,
                        user_id INTEGER NOT NULL,
                        reward_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                        xp_awarded INTEGER NOT NULL DEFAULT 0,
                        coins_awarded INTEGER NOT NULL DEFAULT 0,
                        streak_day INTEGER NOT NULL DEFAULT 1,
                        INDEX ix_daily_rewards_user_id (user_id),
                        INDEX ix_daily_rewards_reward_date (reward_date),
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """))
                logger.info("Migration: Created table daily_rewards")

            # ── Phase 5: Subscription & Payment tables ────────
            if "subscription_plans" not in existing_tables:
                conn.execute(text("""
                    CREATE TABLE subscription_plans (
                        id INTEGER PRIMARY KEY AUTO_INCREMENT,
                        name VARCHAR(50) NOT NULL,
                        slug VARCHAR(30) NOT NULL UNIQUE,
                        description TEXT DEFAULT NULL,
                        monthly_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                        yearly_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                        features_json JSON DEFAULT NULL,
                        is_active BOOLEAN NOT NULL DEFAULT TRUE,
                        sort_order INTEGER NOT NULL DEFAULT 0,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX ix_sp_slug (slug),
                        INDEX ix_sp_active (is_active)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """))
                logger.info("Migration: Created table subscription_plans")

            if "subscriptions" not in existing_tables:
                conn.execute(text("""
                    CREATE TABLE subscriptions (
                        id INTEGER PRIMARY KEY AUTO_INCREMENT,
                        user_id INTEGER NOT NULL,
                        plan_id INTEGER NOT NULL,
                        status VARCHAR(20) NOT NULL DEFAULT 'active',
                        billing_cycle VARCHAR(10) NOT NULL DEFAULT 'monthly',
                        amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                        start_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        end_date DATETIME NOT NULL,
                        auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
                        cancelled_at DATETIME DEFAULT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX ix_sub_user_id (user_id),
                        INDEX ix_sub_status (status),
                        INDEX ix_sub_end_date (end_date),
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE RESTRICT
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """))
                logger.info("Migration: Created table subscriptions")

            if "payments" not in existing_tables:
                conn.execute(text("""
                    CREATE TABLE payments (
                        id INTEGER PRIMARY KEY AUTO_INCREMENT,
                        user_id INTEGER NOT NULL,
                        subscription_id INTEGER DEFAULT NULL,
                        razorpay_order_id VARCHAR(100) DEFAULT NULL,
                        razorpay_payment_id VARCHAR(100) DEFAULT NULL,
                        razorpay_signature VARCHAR(255) DEFAULT NULL,
                        amount DECIMAL(10,2) NOT NULL,
                        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
                        status VARCHAR(20) NOT NULL DEFAULT 'created',
                        method VARCHAR(50) DEFAULT NULL,
                        description VARCHAR(500) DEFAULT NULL,
                        coupon_id INTEGER DEFAULT NULL,
                        coupon_discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                        wallet_amount_used DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                        plan_slug VARCHAR(30) DEFAULT NULL,
                        billing_cycle VARCHAR(10) DEFAULT NULL,
                        failure_reason TEXT DEFAULT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX ix_pay_user_id (user_id),
                        INDEX ix_pay_status (status),
                        INDEX ix_pay_order_id (razorpay_order_id),
                        INDEX ix_pay_created (created_at),
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """))
                logger.info("Migration: Created table payments")

            if "invoices" not in existing_tables:
                conn.execute(text("""
                    CREATE TABLE invoices (
                        id INTEGER PRIMARY KEY AUTO_INCREMENT,
                        invoice_number VARCHAR(30) NOT NULL UNIQUE,
                        user_id INTEGER NOT NULL,
                        payment_id INTEGER DEFAULT NULL,
                        subtotal DECIMAL(10,2) NOT NULL,
                        discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                        gst_rate DECIMAL(5,2) NOT NULL DEFAULT 18.00,
                        gst_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                        total DECIMAL(10,2) NOT NULL,
                        status VARCHAR(20) NOT NULL DEFAULT 'paid',
                        billing_name VARCHAR(200) DEFAULT NULL,
                        billing_email VARCHAR(255) DEFAULT NULL,
                        plan_name VARCHAR(50) DEFAULT NULL,
                        billing_cycle VARCHAR(10) DEFAULT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        INDEX ix_inv_user_id (user_id),
                        INDEX ix_inv_number (invoice_number),
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """))
                logger.info("Migration: Created table invoices")

            if "coupon_codes" not in existing_tables:
                conn.execute(text("""
                    CREATE TABLE coupon_codes (
                        id INTEGER PRIMARY KEY AUTO_INCREMENT,
                        code VARCHAR(50) NOT NULL UNIQUE,
                        description VARCHAR(255) DEFAULT NULL,
                        discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage',
                        discount_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                        min_order DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                        max_discount DECIMAL(10,2) DEFAULT NULL,
                        max_uses INTEGER DEFAULT NULL,
                        used_count INTEGER NOT NULL DEFAULT 0,
                        expiry_date DATETIME DEFAULT NULL,
                        is_active BOOLEAN NOT NULL DEFAULT TRUE,
                        is_user_specific BOOLEAN NOT NULL DEFAULT FALSE,
                        specific_user_id INTEGER DEFAULT NULL,
                        applicable_plans JSON DEFAULT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        UNIQUE KEY uq_coupon_code (code),
                        INDEX ix_coupon_active (is_active),
                        INDEX ix_coupon_expiry (expiry_date)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """))
                logger.info("Migration: Created table coupon_codes")

            if "referrals" not in existing_tables:
                conn.execute(text("""
                    CREATE TABLE referrals (
                        id INTEGER PRIMARY KEY AUTO_INCREMENT,
                        referrer_id INTEGER NOT NULL,
                        referred_id INTEGER DEFAULT NULL,
                        referral_code VARCHAR(20) NOT NULL,
                        status VARCHAR(20) NOT NULL DEFAULT 'pending',
                        reward_amount DECIMAL(10,2) NOT NULL DEFAULT 50.00,
                        rewarded_at DATETIME DEFAULT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        INDEX ix_ref_referrer (referrer_id),
                        INDEX ix_ref_referred (referred_id),
                        INDEX ix_ref_code (referral_code),
                        INDEX ix_ref_status (status),
                        FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """))
                logger.info("Migration: Created table referrals")

            if "wallet" not in existing_tables:
                conn.execute(text("""
                    CREATE TABLE wallet (
                        id INTEGER PRIMARY KEY AUTO_INCREMENT,
                        user_id INTEGER NOT NULL UNIQUE,
                        balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                        total_credited DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                        total_debited DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        UNIQUE KEY uq_wallet_user (user_id),
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """))
                logger.info("Migration: Created table wallet")

            if "wallet_transactions" not in existing_tables:
                conn.execute(text("""
                    CREATE TABLE wallet_transactions (
                        id INTEGER PRIMARY KEY AUTO_INCREMENT,
                        wallet_id INTEGER NOT NULL,
                        user_id INTEGER NOT NULL,
                        type VARCHAR(10) NOT NULL,
                        amount DECIMAL(10,2) NOT NULL,
                        description VARCHAR(255) DEFAULT NULL,
                        reference_type VARCHAR(50) DEFAULT NULL,
                        reference_id INTEGER DEFAULT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        INDEX ix_wt_wallet_id (wallet_id),
                        INDEX ix_wt_user_id (user_id),
                        INDEX ix_wt_type (type),
                        INDEX ix_wt_created (created_at),
                        FOREIGN KEY (wallet_id) REFERENCES wallet(id) ON DELETE CASCADE,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """))
                logger.info("Migration: Created table wallet_transactions")

            if "premium_features" not in existing_tables:
                conn.execute(text("""
                    CREATE TABLE premium_features (
                        id INTEGER PRIMARY KEY AUTO_INCREMENT,
                        plan_id INTEGER NOT NULL,
                        feature_key VARCHAR(50) NOT NULL,
                        feature_name VARCHAR(100) NOT NULL,
                        is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        INDEX ix_pf_plan_id (plan_id),
                        INDEX ix_pf_feature_key (feature_key),
                        FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """))
                logger.info("Migration: Created table premium_features")

            # ── Phase 5: Add referral columns to users ────────
            if "users" in existing_tables:
                _safe_add_column(conn, "users", "referral_code", "VARCHAR(20) DEFAULT NULL", inspector)
                _safe_add_column(conn, "users", "referred_by", "INTEGER DEFAULT NULL", inspector)

        # ── Seed default admin user ───────────────────────────
        if "users" in existing_tables:
            from app.utils.password_hash import hash_password
            hashed = hash_password("yash1234")
            with db_engine.connect() as conn:
                res = conn.execute(text("SELECT id FROM users WHERE email='yash12@gmail.com'")).fetchone()
                if not res:
                    conn.execute(
                        text("INSERT INTO users (name, email, password, role, is_verified, xp, coins, level, streak_days, longest_streak, total_tests_taken, total_time_spent, title) VALUES ('Yash', 'yash12@gmail.com', :pwd, 'admin', TRUE, 0, 0, 1, 0, 0, 0, 0, 'Beginner')"),
                        {"pwd": hashed}
                    )
                    conn.commit()
                    logger.info("Migration: Seeded admin user yash12@gmail.com")

        # ── Seed subscription plans ───────────────────────────
        if "subscription_plans" in inspector.get_table_names():
            _seed_subscription_plans(db_engine)

        logger.info("Schema migrations completed successfully.")

    except Exception as e:
        logger.error(f"Schema migration error: {e}")
        print(f"Schema migration error: {e}")


# ── Database initialization ───────────────────────────────────

if MYSQL_HOST in ("localhost", "127.0.0.1"):
    ensure_database_exists()

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_size=10,
    max_overflow=20,
    echo=False,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
