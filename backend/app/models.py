from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    icon: Mapped[str] = mapped_column(String(40), default="target-wobble")
    duration_days: Mapped[int] = mapped_column(Integer, default=30)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    accent_color: Mapped[str] = mapped_column(String(20), default="#2563EB")
    completion_emoji: Mapped[str] = mapped_column(String(40), default="stamp-orbit")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    kind: Mapped[str] = mapped_column(String(20), default="habit")
    fuel_target_kcal: Mapped[int | None] = mapped_column(Integer, nullable=True)

    sub_goals: Mapped[list["SubGoal"]] = relationship(
        "SubGoal",
        back_populates="goal",
        cascade="all, delete-orphan",
        order_by="SubGoal.sort_order",
    )
    checkins: Mapped[list["DayCheckin"]] = relationship(
        "DayCheckin",
        back_populates="goal",
        cascade="all, delete-orphan",
    )
    meals: Mapped[list["MealLog"]] = relationship(
        "MealLog",
        back_populates="goal",
        cascade="all, delete-orphan",
    )


class SubGoal(Base):
    __tablename__ = "sub_goals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    goal_id: Mapped[int] = mapped_column(ForeignKey("goals.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    icon: Mapped[str] = mapped_column(String(40), default="sub-dot")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    goal: Mapped["Goal"] = relationship("Goal", back_populates="sub_goals")


class DayCheckin(Base):
    __tablename__ = "day_checkins"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    goal_id: Mapped[int] = mapped_column(ForeignKey("goals.id", ondelete="CASCADE"), index=True)
    day: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    completed: Mapped[bool] = mapped_column(Boolean, default=True)
    sub_goal_id: Mapped[int | None] = mapped_column(
        ForeignKey("sub_goals.id", ondelete="SET NULL"),
        nullable=True,
    )
    note: Mapped[str] = mapped_column(Text, default="")

    goal: Mapped["Goal"] = relationship("Goal", back_populates="checkins")


class MealLog(Base):
    __tablename__ = "meal_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    goal_id: Mapped[int] = mapped_column(ForeignKey("goals.id", ondelete="CASCADE"), index=True)
    day: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    source: Mapped[str] = mapped_column(String(20), default="manual")
    photo_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    note: Mapped[str] = mapped_column(Text, default="")
    total_kcal_low: Mapped[int] = mapped_column(Integer, default=0)
    total_kcal_mid: Mapped[int] = mapped_column(Integer, default=0)
    total_kcal_high: Mapped[int] = mapped_column(Integer, default=0)
    confidence: Mapped[float] = mapped_column(Float, default=0.5)
    confirmed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    goal: Mapped["Goal"] = relationship("Goal", back_populates="meals")
    items: Mapped[list["MealItem"]] = relationship(
        "MealItem",
        back_populates="meal",
        cascade="all, delete-orphan",
    )


class MealItem(Base):
    __tablename__ = "meal_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    meal_id: Mapped[int] = mapped_column(ForeignKey("meal_logs.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    portion_desc: Mapped[str] = mapped_column(String(200), default="")
    grams_est: Mapped[float | None] = mapped_column(Float, nullable=True)
    kcal_low: Mapped[int] = mapped_column(Integer, default=0)
    kcal_mid: Mapped[int] = mapped_column(Integer, default=0)
    kcal_high: Mapped[int] = mapped_column(Integer, default=0)
    confidence: Mapped[float] = mapped_column(Float, default=0.5)
    from_memory: Mapped[bool] = mapped_column(Boolean, default=False)

    meal: Mapped["MealLog"] = relationship("MealLog", back_populates="items")


class UserFoodMemory(Base):
    __tablename__ = "user_food_memory"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    normalized_name: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(200), default="")
    portion_desc: Mapped[str] = mapped_column(String(200), default="")
    grams_est: Mapped[float | None] = mapped_column(Float, nullable=True)
    kcal_mid: Mapped[int] = mapped_column(Integer, default=0)
    kcal_low: Mapped[int] = mapped_column(Integer, default=0)
    kcal_high: Mapped[int] = mapped_column(Integer, default=0)
    use_count: Mapped[int] = mapped_column(Integer, default=1)
    last_used: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AppSetting(Base):
    """Key/value settings stored in SQLite (e.g. in-app Gemini API key)."""

    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
