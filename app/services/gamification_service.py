from __future__ import annotations

from datetime import datetime, timedelta, date

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.user_model import User
from app.models.exam_engine_model import Achievement, Badge, DailyReward, Attempt


# ── XP / Coins constants ─────────────────────────────────────
XP_PER_TEST = 50
XP_PER_CORRECT = 10
XP_STREAK_BONUS = 25
XP_DAILY_LOGIN = 15
COINS_PER_TEST = 10
COINS_PER_CORRECT = 2
COINS_STREAK_BONUS = 5

LEVEL_THRESHOLDS = [
    0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500,
    7500, 10000, 13000, 17000, 22000, 28000, 35000, 43000, 52000, 62000,
]

TITLES = [
    "Beginner", "Learner", "Explorer", "Challenger", "Warrior",
    "Champion", "Master", "Legend", "Prodigy", "Genius",
    "Sage", "Oracle", "Titan", "Overlord", "Supreme",
    "Immortal", "Transcendent", "Celestial", "Cosmic", "Divine",
]


def calculate_level(xp: int) -> tuple[int, str]:
    """Returns (level, title) based on XP."""
    level = 1
    for i, threshold in enumerate(LEVEL_THRESHOLDS):
        if xp >= threshold:
            level = i + 1
        else:
            break
    title = TITLES[min(level - 1, len(TITLES) - 1)]
    return level, title


# ── Achievement definitions ───────────────────────────────────
ACHIEVEMENT_DEFINITIONS = [
    {"code": "first_test", "title": "First Step", "description": "Complete your first test", "check": lambda u: (u.total_tests_taken or 0) >= 1, "xp": 50, "coins": 10},
    {"code": "ten_tests", "title": "Consistent Learner", "description": "Complete 10 tests", "check": lambda u: (u.total_tests_taken or 0) >= 10, "xp": 200, "coins": 50},
    {"code": "fifty_tests", "title": "Test Warrior", "description": "Complete 50 tests", "check": lambda u: (u.total_tests_taken or 0) >= 50, "xp": 500, "coins": 100},
    {"code": "hundred_tests", "title": "Century Champion", "description": "Complete 100 tests", "check": lambda u: (u.total_tests_taken or 0) >= 100, "xp": 1000, "coins": 250},
    {"code": "streak_3", "title": "Three Day Fire", "description": "3 day streak", "check": lambda u: (u.streak_days or 0) >= 3, "xp": 75, "coins": 15},
    {"code": "streak_7", "title": "Weekly Warrior", "description": "7 day streak", "check": lambda u: (u.streak_days or 0) >= 7, "xp": 200, "coins": 50},
    {"code": "streak_30", "title": "Monthly Master", "description": "30 day streak", "check": lambda u: (u.streak_days or 0) >= 30, "xp": 1000, "coins": 250},
    {"code": "level_5", "title": "Rising Star", "description": "Reach Level 5", "check": lambda u: (u.level or 1) >= 5, "xp": 150, "coins": 30},
    {"code": "level_10", "title": "Elite Player", "description": "Reach Level 10", "check": lambda u: (u.level or 1) >= 10, "xp": 500, "coins": 100},
    {"code": "xp_1000", "title": "XP Hunter", "description": "Earn 1000 XP", "check": lambda u: (u.xp or 0) >= 1000, "xp": 100, "coins": 25},
    {"code": "xp_10000", "title": "XP Legend", "description": "Earn 10000 XP", "check": lambda u: (u.xp or 0) >= 10000, "xp": 500, "coins": 100},
    {"code": "coins_100", "title": "Coin Collector", "description": "Earn 100 coins", "check": lambda u: (u.coins or 0) >= 100, "xp": 50, "coins": 10},
    {"code": "time_1h", "title": "Hour of Power", "description": "Spend 1 hour practicing", "check": lambda u: (u.total_time_spent or 0) >= 3600, "xp": 100, "coins": 20},
    {"code": "time_10h", "title": "Dedicated Student", "description": "Spend 10 hours practicing", "check": lambda u: (u.total_time_spent or 0) >= 36000, "xp": 500, "coins": 100},
]

BADGE_DEFINITIONS = [
    {"name": "Speed Demon", "check": lambda u: (u.total_tests_taken or 0) >= 5, "level": "bronze"},
    {"name": "Speed Demon", "check": lambda u: (u.total_tests_taken or 0) >= 25, "level": "silver"},
    {"name": "Speed Demon", "check": lambda u: (u.total_tests_taken or 0) >= 100, "level": "gold"},
    {"name": "Knowledge Seeker", "check": lambda u: (u.xp or 0) >= 500, "level": "bronze"},
    {"name": "Knowledge Seeker", "check": lambda u: (u.xp or 0) >= 5000, "level": "silver"},
    {"name": "Knowledge Seeker", "check": lambda u: (u.xp or 0) >= 25000, "level": "gold"},
    {"name": "Streak Master", "check": lambda u: (u.longest_streak or 0) >= 7, "level": "bronze"},
    {"name": "Streak Master", "check": lambda u: (u.longest_streak or 0) >= 30, "level": "silver"},
    {"name": "Streak Master", "check": lambda u: (u.longest_streak or 0) >= 90, "level": "gold"},
]


def check_achievements(db: Session, user: User) -> list[Achievement]:
    """Check all achievement definitions and award any newly unlocked ones."""
    existing_codes = set(
        row[0] for row in db.query(Achievement.code).filter(Achievement.user_id == user.id).all()
    )
    new_achievements = []
    for defn in ACHIEVEMENT_DEFINITIONS:
        if defn["code"] not in existing_codes and defn["check"](user):
            achievement = Achievement(
                user_id=user.id,
                code=defn["code"],
                title=defn["title"],
                description=defn["description"],
                xp_reward=defn["xp"],
                coins_reward=defn["coins"],
            )
            db.add(achievement)
            user.xp = (user.xp or 0) + defn["xp"]
            user.coins = (user.coins or 0) + defn["coins"]
            new_achievements.append(achievement)
    return new_achievements


def check_badges(db: Session, user: User) -> list[Badge]:
    """Check all badge definitions and award any newly unlocked ones."""
    existing = set(
        (row[0], row[1]) for row in db.query(Badge.badge_name, Badge.badge_level).filter(Badge.user_id == user.id).all()
    )
    new_badges = []
    for defn in BADGE_DEFINITIONS:
        key = (defn["name"], defn["level"])
        if key not in existing and defn["check"](user):
            badge = Badge(user_id=user.id, badge_name=defn["name"], badge_level=defn["level"])
            db.add(badge)
            new_badges.append(badge)
    return new_badges


def award_test_completion(db: Session, user_id: int, correct_count: int, elapsed_seconds: int) -> dict:
    """Called after a test is submitted. Awards XP, coins, updates streak."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {}

    xp_earned = XP_PER_TEST + (XP_PER_CORRECT * correct_count)
    coins_earned = COINS_PER_TEST + (COINS_PER_CORRECT * correct_count)

    # Streak logic
    today = date.today()
    streak_bonus = False
    if user.last_streak_date:
        last_date = user.last_streak_date.date() if isinstance(user.last_streak_date, datetime) else user.last_streak_date
        if last_date == today - timedelta(days=1):
            user.streak_days = (user.streak_days or 0) + 1
            streak_bonus = True
        elif last_date != today:
            user.streak_days = 1
    else:
        user.streak_days = 1

    if streak_bonus:
        xp_earned += XP_STREAK_BONUS
        coins_earned += COINS_STREAK_BONUS

    user.last_streak_date = datetime.utcnow()
    if (user.streak_days or 0) > (user.longest_streak or 0):
        user.longest_streak = user.streak_days

    user.xp = (user.xp or 0) + xp_earned
    user.coins = (user.coins or 0) + coins_earned
    user.total_tests_taken = (user.total_tests_taken or 0) + 1
    user.total_time_spent = (user.total_time_spent or 0) + elapsed_seconds

    new_level, new_title = calculate_level(user.xp)
    old_level = user.level or 1
    user.level = new_level
    user.title = new_title

    # Check and award achievements + badges
    new_achievements = check_achievements(db, user)
    new_badges = check_badges(db, user)

    db.commit()

    return {
        "xp_earned": xp_earned,
        "coins_earned": coins_earned,
        "total_xp": user.xp,
        "total_coins": user.coins,
        "level": new_level,
        "title": new_title,
        "level_up": new_level > old_level,
        "streak_days": user.streak_days,
        "streak_bonus": streak_bonus,
        "new_achievements": [{"code": a.code, "title": a.title, "xp_reward": a.xp_reward} for a in new_achievements],
        "new_badges": [{"badge_name": b.badge_name, "badge_level": b.badge_level} for b in new_badges],
    }


def claim_daily_reward(db: Session, user_id: int) -> dict:
    """Claim daily login reward with progressive streak multiplier."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"error": "User not found"}

    today = date.today()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())

    existing = db.query(DailyReward).filter(
        DailyReward.user_id == user_id,
        DailyReward.reward_date >= today_start,
        DailyReward.reward_date <= today_end,
    ).first()

    if existing:
        return {
            "already_claimed": True,
            "streak_day": existing.streak_day,
            "xp_awarded": existing.xp_awarded,
            "coins_awarded": existing.coins_awarded,
        }

    # Calculate streak
    yesterday = today - timedelta(days=1)
    yesterday_start = datetime.combine(yesterday, datetime.min.time())
    yesterday_end = datetime.combine(yesterday, datetime.max.time())
    had_yesterday = db.query(DailyReward).filter(
        DailyReward.user_id == user_id,
        DailyReward.reward_date >= yesterday_start,
        DailyReward.reward_date <= yesterday_end,
    ).first()

    streak_day = (had_yesterday.streak_day + 1) if had_yesterday else 1

    # Progressive rewards (capped at 7x)
    bonus_multiplier = min(streak_day, 7)
    xp_awarded = XP_DAILY_LOGIN * bonus_multiplier
    coins_awarded = 5 * bonus_multiplier

    reward = DailyReward(
        user_id=user_id,
        xp_awarded=xp_awarded,
        coins_awarded=coins_awarded,
        streak_day=streak_day,
    )
    db.add(reward)

    user.xp = (user.xp or 0) + xp_awarded
    user.coins = (user.coins or 0) + coins_awarded
    user.streak_days = streak_day
    if streak_day > (user.longest_streak or 0):
        user.longest_streak = streak_day
    user.last_streak_date = datetime.utcnow()

    new_level, new_title = calculate_level(user.xp)
    user.level = new_level
    user.title = new_title

    db.commit()

    return {
        "already_claimed": False,
        "streak_day": streak_day,
        "xp_awarded": xp_awarded,
        "coins_awarded": coins_awarded,
        "total_xp": user.xp,
        "total_coins": user.coins,
        "level": new_level,
        "title": new_title,
    }


def get_user_gamification(db: Session, user_id: int) -> dict:
    """Get complete gamification profile for a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {}

    achievements = db.query(Achievement).filter(Achievement.user_id == user_id).order_by(Achievement.unlocked_at.desc()).all()
    badges = db.query(Badge).filter(Badge.user_id == user_id).order_by(Badge.awarded_at.desc()).all()

    current_level = user.level or 1
    current_xp = user.xp or 0
    next_threshold = LEVEL_THRESHOLDS[min(current_level, len(LEVEL_THRESHOLDS) - 1)] if current_level < len(LEVEL_THRESHOLDS) else LEVEL_THRESHOLDS[-1]
    prev_threshold = LEVEL_THRESHOLDS[current_level - 1] if current_level > 0 else 0
    level_progress = ((current_xp - prev_threshold) / max(1, next_threshold - prev_threshold)) * 100 if next_threshold > prev_threshold else 100

    return {
        "xp": current_xp,
        "coins": user.coins or 0,
        "level": current_level,
        "title": user.title or "Beginner",
        "streak_days": user.streak_days or 0,
        "longest_streak": user.longest_streak or 0,
        "total_tests_taken": user.total_tests_taken or 0,
        "total_time_spent": user.total_time_spent or 0,
        "level_progress": round(level_progress, 1),
        "next_level_xp": next_threshold,
        "achievements": [
            {
                "id": a.id, "code": a.code, "title": a.title, "description": a.description,
                "xp_reward": a.xp_reward, "coins_reward": a.coins_reward, "unlocked_at": a.unlocked_at,
            }
            for a in achievements
        ],
        "badges": [
            {"id": b.id, "badge_name": b.badge_name, "badge_level": b.badge_level, "awarded_at": b.awarded_at}
            for b in badges
        ],
        "total_achievements": len(achievements),
        "total_badges": len(badges),
        "available_achievements": len(ACHIEVEMENT_DEFINITIONS),
        "available_badges": len(set(d["name"] for d in BADGE_DEFINITIONS)),
    }
