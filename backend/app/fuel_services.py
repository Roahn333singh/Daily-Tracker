"""Fuel / calorie meal helpers."""

from __future__ import annotations

from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session, joinedload

from . import models
from .food_pack import normalize_name


def day_meal_totals(goal: models.Goal, day: date) -> dict:
    meals = [m for m in (goal.meals or []) if m.day == day]
    low = sum(m.total_kcal_low for m in meals)
    mid = sum(m.total_kcal_mid for m in meals)
    high = sum(m.total_kcal_high for m in meals)
    return {
        "day": day,
        "meals_count": len(meals),
        "total_kcal_low": low,
        "total_kcal_mid": mid,
        "total_kcal_high": high,
        "target_kcal": goal.fuel_target_kcal,
        "remaining_mid": (goal.fuel_target_kcal - mid) if goal.fuel_target_kcal else None,
    }


def logged_days(goal: models.Goal) -> set[date]:
    return {m.day for m in (goal.meals or [])}


def compute_fuel_momentum(goal: models.Goal, today: date | None = None) -> tuple[int, str, int, int]:
    """Momentum from logging consistency + soft target adherence."""
    today = today or date.today()
    window = min(goal.duration_days or 30, 28)
    start = today - timedelta(days=window - 1)
    target = goal.fuel_target_kcal or 0

    days_logged = {m.day for m in (goal.meals or []) if start <= m.day <= today}
    totals_by_day: dict[date, int] = {}
    for m in goal.meals or []:
        if start <= m.day <= today:
            totals_by_day[m.day] = totals_by_day.get(m.day, 0) + m.total_kcal_mid

    log_ratio = len(days_logged) / window if window else 0
    adherence_scores: list[float] = []
    if target > 0:
        for d, mid in totals_by_day.items():
            # 1.0 if within 15% of target
            err = abs(mid - target) / target
            adherence_scores.append(max(0.0, 1.0 - err / 0.5))  # 0 at 50%+ miss
    adhere = sum(adherence_scores) / len(adherence_scores) if adherence_scores else 0.0

    momentum = int(round((0.65 * log_ratio + 0.35 * adhere) * 100))
    momentum = max(0, min(100, momentum))

    # streak of consecutive logged days
    streak = 0
    cursor = today
    if cursor not in days_logged:
        cursor = today - timedelta(days=1)
    while cursor in days_logged:
        streak += 1
        cursor -= timedelta(days=1)

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

    if streak >= 7 and momentum < 80:
        label = "ON FIRE"
        momentum = min(100, momentum + 8)

    return momentum, label, len(logged_days(goal)), streak


def upsert_food_memory(db: Session, items: list[dict]) -> None:
    for it in items:
        name = (it.get("name") or "").strip()
        if not name:
            continue
        key = normalize_name(name)
        if not key:
            continue
        row = (
            db.query(models.UserFoodMemory)
            .filter(models.UserFoodMemory.normalized_name == key)
            .first()
        )
        mid = int(it.get("kcal_mid") or 0)
        low = int(it.get("kcal_low") or max(0, int(mid * 0.82)))
        high = int(it.get("kcal_high") or int(mid * 1.18))
        portion = str(it.get("portion_desc") or "")
        grams = it.get("grams_est")
        if row:
            # exponential moving average toward corrected mid
            row.kcal_mid = int(round(0.4 * row.kcal_mid + 0.6 * mid)) if mid else row.kcal_mid
            row.kcal_low = int(round(0.4 * row.kcal_low + 0.6 * low)) if low else row.kcal_low
            row.kcal_high = int(round(0.4 * row.kcal_high + 0.6 * high)) if high else row.kcal_high
            if portion:
                row.portion_desc = portion
            if grams is not None:
                row.grams_est = float(grams)
            row.display_name = name
            row.use_count += 1
            row.last_used = datetime.utcnow()
        else:
            db.add(
                models.UserFoodMemory(
                    normalized_name=key,
                    display_name=name,
                    portion_desc=portion,
                    grams_est=float(grams) if grams is not None else None,
                    kcal_mid=mid,
                    kcal_low=low,
                    kcal_high=high,
                    use_count=1,
                    last_used=datetime.utcnow(),
                )
            )


def ensure_fuel_checkin(db: Session, goal_id: int, day: date) -> None:
    """Mark habit-style checkin when a meal is logged that day."""
    existing = (
        db.query(models.DayCheckin)
        .filter(models.DayCheckin.goal_id == goal_id, models.DayCheckin.day == day)
        .first()
    )
    if existing:
        existing.completed = True
    else:
        db.add(
            models.DayCheckin(
                goal_id=goal_id,
                day=day,
                completed=True,
                note="fuel-log",
            )
        )


def load_goal_with_meals(db: Session, goal_id: int) -> models.Goal | None:
    return (
        db.query(models.Goal)
        .options(
            joinedload(models.Goal.sub_goals),
            joinedload(models.Goal.checkins),
            joinedload(models.Goal.meals).joinedload(models.MealLog.items),
        )
        .filter(models.Goal.id == goal_id)
        .first()
    )
