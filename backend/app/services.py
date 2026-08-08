from datetime import date, timedelta

from sqlalchemy.orm import Session

from . import models
from .fuel_services import compute_fuel_momentum, day_meal_totals
from .vision_estimate import vision_configured


def compute_streak(completed_dates: set[date], today: date | None = None) -> int:
    today = today or date.today()
    streak = 0
    cursor = today
    # Allow streak to continue if yesterday was last complete (day not yet done)
    if cursor not in completed_dates:
        cursor = today - timedelta(days=1)
    while cursor in completed_dates:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


def compute_momentum(goal: models.Goal, today: date | None = None) -> tuple[int, str, int, int]:
    """
    Momentum score 0–100 based on recent consistency (window of min(duration, 28) days).
    Returns (momentum, status_label, completed_days, current_streak).
    """
    today = today or date.today()
    window = min(goal.duration_days, 28)
    start = today - timedelta(days=window - 1)

    completed_dates = {
        c.day for c in goal.checkins if c.completed and start <= c.day <= today
    }
    all_completed = {c.day for c in goal.checkins if c.completed}
    completed_count = len(completed_dates)
    ratio = completed_count / window if window else 0
    momentum = int(round(ratio * 100))

    streak = compute_streak(all_completed, today)

    if momentum >= 80:
        label = "ON FIRE"
    elif momentum >= 55:
        label = "COOLING"
    elif momentum >= 30:
        label = "WARMING"
    elif momentum > 0:
        label = "RISING"
    else:
        label = "IDLE"

    # Boost label slightly when streak is hot even if window is mixed
    if streak >= 7 and momentum < 80:
        label = "ON FIRE"
        momentum = min(100, momentum + 10)

    return momentum, label, len(all_completed), streak


def enrich_goal(goal: models.Goal) -> dict:
    kind = getattr(goal, "kind", None) or "habit"
    if kind == "fuel":
        momentum, label, completed_days, streak = compute_fuel_momentum(goal)
    else:
        momentum, label, completed_days, streak = compute_momentum(goal)

    today = date.today()
    today_totals = day_meal_totals(goal, today) if kind == "fuel" else None
    meals = list(goal.meals or []) if hasattr(goal, "meals") else []

    return {
        "id": goal.id,
        "title": goal.title,
        "description": goal.description,
        "icon": goal.icon,
        "duration_days": goal.duration_days,
        "start_date": goal.start_date,
        "accent_color": goal.accent_color,
        "completion_emoji": goal.completion_emoji,
        "is_active": goal.is_active,
        "sort_order": goal.sort_order,
        "created_at": goal.created_at,
        "kind": kind,
        "fuel_target_kcal": getattr(goal, "fuel_target_kcal", None),
        "sub_goals": goal.sub_goals,
        "checkins": goal.checkins,
        "meals": meals,
        "momentum": momentum,
        "status_label": label,
        "completed_days": completed_days,
        "current_streak": streak,
        "today_kcal_mid": today_totals["total_kcal_mid"] if today_totals else None,
        "today_kcal_low": today_totals["total_kcal_low"] if today_totals else None,
        "today_kcal_high": today_totals["total_kcal_high"] if today_totals else None,
        "today_remaining_mid": today_totals["remaining_mid"] if today_totals else None,
        "vision_configured": vision_configured(),
    }


def seed_if_empty(db: Session) -> None:
    if db.query(models.Goal).count() > 0:
        return

    today = date.today()
    seeds = [
        {
            "title": "Study 6h everyday",
            "description": "Deep work blocks totaling 6 hours every day. Stay locked in.",
            "icon": "lofi-desk",
            "duration_days": 100,
            "start_date": today - timedelta(days=21),
            "accent_color": "#2563EB",
            "completion_emoji": "stamp-desk",
            "sort_order": 0,
            "sub_goals": [
                {"title": "Morning focus block", "icon": "sub-sun", "sort_order": 0},
                {"title": "Afternoon deep work", "icon": "sub-brain", "sort_order": 1},
                {"title": "Evening review", "icon": "sub-moon", "sort_order": 2},
            ],
            "checks": [0, 1, 2, 3, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 18, 19, 20],
        },
        {
            "title": "Ironman 70.3",
            "description": "Nine-month build to race day. Track swim, bike, and run training with progressive load.",
            "icon": "orbit-bolt",
            "duration_days": 270,
            "start_date": today - timedelta(days=14),
            "accent_color": "#DC2626",
            "completion_emoji": "stamp-zap",
            "sort_order": 1,
            "sub_goals": [
                {"title": "Swim", "icon": "sub-wave", "sort_order": 0},
                {"title": "Bike", "icon": "sub-bike", "sort_order": 1},
                {"title": "Run", "icon": "sub-run", "sort_order": 2},
            ],
            "checks": [0, 1, 3, 4, 6, 7, 8, 10, 11, 13],
        },
        {
            "title": "No Sugar Challenge",
            "description": "Cut out all added sugar for 30 days. Reset your palate, reduce cravings, and feel sharper.",
            "icon": "neon-cat",
            "duration_days": 30,
            "start_date": today - timedelta(days=7),
            "accent_color": "#EA580C",
            "completion_emoji": "stamp-cat",
            "sort_order": 2,
            "sub_goals": [],
            "checks": [0, 1, 2, 3, 4, 5, 6],
        },
        {
            "title": "Move Every Day",
            "description": "Move your body every single day for 7 days. Walk, run, dance, stretch — just move.",
            "icon": "dash-runner",
            "duration_days": 7,
            "start_date": today - timedelta(days=3),
            "accent_color": "#16A34A",
            "completion_emoji": "stamp-flame",
            "sort_order": 3,
            "sub_goals": [
                {"title": "Walk 5k steps", "icon": "sub-walk", "sort_order": 0},
            ],
            "checks": [0, 1, 2],
        },
        {
            "title": "100 Days of LeetCode",
            "description": "Solve one LeetCode problem every day for 100 days. Sharpen your problem-solving edge.",
            "icon": "code-cube",
            "duration_days": 100,
            "start_date": today - timedelta(days=10),
            "accent_color": "#CA8A04",
            "completion_emoji": "stamp-pixel",
            "sort_order": 4,
            "sub_goals": [
                {"title": "Easy or Medium", "icon": "sub-zap", "sort_order": 0},
                {"title": "Write solution notes", "icon": "sub-note", "sort_order": 1},
            ],
            "checks": [0, 1, 2, 4, 5, 6, 7, 8, 9],
        },
        {
            "title": "Get your sh*t together",
            "description": "Four daily basics for 14 days: sleep on time, move your body, keep your space clean, no doomscroll.",
            "icon": "chaos-spark",
            "duration_days": 14,
            "start_date": today - timedelta(days=5),
            "accent_color": "#7C3AED",
            "completion_emoji": "stamp-star",
            "sort_order": 5,
            "sub_goals": [
                {"title": "Sleep by 11", "icon": "sub-sleep", "sort_order": 0},
                {"title": "Move body", "icon": "sub-run", "sort_order": 1},
                {"title": "Clean space", "icon": "sub-clean", "sort_order": 2},
                {"title": "No doomscroll", "icon": "sub-phone", "sort_order": 3},
            ],
            "checks": [0, 1, 2, 3, 4],
            "kind": "habit",
        },
        {
            "title": "Daily Fuel 2200",
            "description": "Photo-log meals. Estimates show a range—correct portions, then confirm.",
            "icon": "coffee-ripple",
            "duration_days": 90,
            "start_date": today - timedelta(days=3),
            "accent_color": "#059669",
            "completion_emoji": "stamp-bloom",
            "sort_order": 6,
            "sub_goals": [],
            "checks": [],
            "kind": "fuel",
            "fuel_target_kcal": 2200,
        },
    ]

    for seed in seeds:
        goal = models.Goal(
            title=seed["title"],
            description=seed["description"],
            icon=seed["icon"],
            duration_days=seed["duration_days"],
            start_date=seed["start_date"],
            accent_color=seed["accent_color"],
            completion_emoji=seed["completion_emoji"],
            is_active=True,
            sort_order=seed["sort_order"],
            kind=seed.get("kind", "habit"),
            fuel_target_kcal=seed.get("fuel_target_kcal"),
        )
        db.add(goal)
        db.flush()

        for sg in seed["sub_goals"]:
            db.add(
                models.SubGoal(
                    goal_id=goal.id,
                    title=sg["title"],
                    icon=sg["icon"],
                    sort_order=sg["sort_order"],
                )
            )

        for offset in seed["checks"]:
            day = seed["start_date"] + timedelta(days=offset)
            if day <= today:
                db.add(
                    models.DayCheckin(
                        goal_id=goal.id,
                        day=day,
                        completed=True,
                    )
                )

    db.commit()


# Map legacy emoji icons → funky icon ids (run once on existing DBs)
_GOAL_ICON_MIGRATION = {
    "📚": "lofi-desk",
    "🏊": "orbit-bolt",
    "🐱": "neon-cat",
    "🏃": "dash-runner",
    "💻": "code-cube",
    "🧹": "chaos-spark",
    "🎯": "target-wobble",
    "🧠": "brain-pulse",
    "🌱": "seed-pop",
    "🎮": "game-joy",
    "☕": "coffee-ripple",
    "🚀": "rocket-zip",
    "❤️": "pixel-heart",
    "🔥": "flame-dance",
}

_STAMP_ICON_MIGRATION = {
    "🧑‍💻": "stamp-desk",
    "💪": "stamp-zap",
    "🚫": "stamp-cat",
    "🔥": "stamp-flame",
    "🧩": "stamp-pixel",
    "✨": "stamp-star",
    "⭐": "stamp-star",
    "🏆": "stamp-star",
    "✅": "stamp-orbit",
    "🚀": "stamp-orbit",
    "❤️": "stamp-bloom",
}

_SUB_ICON_MIGRATION = {
    "☀️": "sub-sun",
    "🧠": "sub-brain",
    "🌙": "sub-moon",
    "🌊": "sub-wave",
    "🚴": "sub-bike",
    "🏃": "sub-run",
    "🚶": "sub-walk",
    "⚡": "sub-zap",
    "📝": "sub-note",
    "😴": "sub-sleep",
    "🧹": "sub-clean",
    "📵": "sub-phone",
    "•": "sub-dot",
    "🔥": "sub-zap",
}


def migrate_icon_ids(db: Session) -> None:
    changed = False
    for goal in db.query(models.Goal).all():
        if goal.icon in _GOAL_ICON_MIGRATION:
            goal.icon = _GOAL_ICON_MIGRATION[goal.icon]
            changed = True
        if goal.completion_emoji in _STAMP_ICON_MIGRATION:
            goal.completion_emoji = _STAMP_ICON_MIGRATION[goal.completion_emoji]
            changed = True
        for sg in goal.sub_goals:
            if sg.icon in _SUB_ICON_MIGRATION:
                sg.icon = _SUB_ICON_MIGRATION[sg.icon]
                changed = True
    if changed:
        db.commit()


def ensure_fuel_seed(db: Session) -> None:
    """Add calorie goal if DB already existed without it."""
    exists = (
        db.query(models.Goal)
        .filter(models.Goal.kind == "fuel")
        .first()
    )
    if exists:
        # Keep fuel tab easy to find (near front of list)
        if (exists.sort_order or 0) > 1:
            exists.sort_order = 0
            db.commit()
        return
    today = date.today()
    db.add(
        models.Goal(
            title="Daily Fuel 2200",
            description="Photo-log meals. Estimates show a range—correct portions, then confirm.",
            icon="coffee-ripple",
            duration_days=90,
            start_date=today - timedelta(days=3),
            accent_color="#059669",
            completion_emoji="stamp-bloom",
            is_active=True,
            sort_order=0,
            kind="fuel",
            fuel_target_kcal=2200,
        )
    )
    db.commit()
