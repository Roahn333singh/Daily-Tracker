from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class SubGoalBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    icon: str = "sub-dot"
    sort_order: int = 0


class SubGoalCreate(SubGoalBase):
    pass


class SubGoalUpdate(BaseModel):
    title: str | None = None
    icon: str | None = None
    sort_order: int | None = None


class SubGoalOut(SubGoalBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    goal_id: int


class GoalBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = ""
    icon: str = "target-wobble"
    duration_days: int = Field(default=30, ge=1, le=3650)
    start_date: date | None = None
    accent_color: str = "#2563EB"
    completion_emoji: str = "stamp-orbit"
    is_active: bool = True
    sort_order: int = 0
    kind: str = "habit"  # habit | fuel
    fuel_target_kcal: int | None = Field(default=None, ge=500, le=10000)


class GoalCreate(GoalBase):
    sub_goals: list[SubGoalCreate] = []


class GoalUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    icon: str | None = None
    duration_days: int | None = Field(default=None, ge=1, le=3650)
    start_date: date | None = None
    accent_color: str | None = None
    completion_emoji: str | None = None
    is_active: bool | None = None
    sort_order: int | None = None
    kind: str | None = None
    fuel_target_kcal: int | None = Field(default=None, ge=500, le=10000)
    sub_goals: list[SubGoalCreate] | None = None


class DayCheckinOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    goal_id: int
    day: date
    completed: bool
    sub_goal_id: int | None = None
    note: str = ""


class DayCheckinToggle(BaseModel):
    day: date
    completed: bool | None = None
    note: str | None = None
    sub_goal_id: int | None = None


class MealItemIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    portion_desc: str = ""
    grams_est: float | None = None
    kcal_low: int = 0
    kcal_mid: int = 0
    kcal_high: int = 0
    confidence: float = 0.5
    from_memory: bool = False


class MealItemOut(MealItemIn):
    model_config = ConfigDict(from_attributes=True)

    id: int
    meal_id: int


class MealConfirm(BaseModel):
    day: date | None = None
    source: str = "manual"
    note: str = ""
    photo_path: str | None = None
    items: list[MealItemIn]
    confidence: float | None = None


class MealLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    goal_id: int
    day: date
    source: str
    photo_path: str | None = None
    note: str = ""
    total_kcal_low: int
    total_kcal_mid: int
    total_kcal_high: int
    confidence: float
    confirmed_at: datetime
    items: list[MealItemOut] = []


class DayFuelOut(BaseModel):
    day: date
    meals_count: int
    total_kcal_low: int
    total_kcal_mid: int
    total_kcal_high: int
    target_kcal: int | None
    remaining_mid: int | None
    meals: list[MealLogOut] = []


class EstimateItemOut(BaseModel):
    name: str
    portion_desc: str = ""
    grams_est: float | None = None
    kcal_low: int = 0
    kcal_mid: int = 0
    kcal_high: int = 0
    confidence: float = 0.5
    from_memory: bool = False
    food_id: str | None = None


class EstimateOut(BaseModel):
    source: str
    items: list[EstimateItemOut]
    notes: str = ""
    overall_confidence: float = 0.5
    total_kcal_low: int = 0
    total_kcal_mid: int = 0
    total_kcal_high: int = 0
    vision_used: bool = False
    photo_path: str | None = None


class FoodPackItem(BaseModel):
    id: str
    name: str
    aliases: list[str] = []
    kcal_per_100g: int
    portions: list[dict] = []


class FoodMemoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    normalized_name: str
    display_name: str
    portion_desc: str
    grams_est: float | None
    kcal_mid: int
    kcal_low: int
    kcal_high: int
    use_count: int
    last_used: datetime


class GoalOut(GoalBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    start_date: date
    created_at: datetime
    kind: str = "habit"
    fuel_target_kcal: int | None = None
    sub_goals: list[SubGoalOut] = []
    checkins: list[DayCheckinOut] = []
    meals: list[MealLogOut] = []
    momentum: int = 0
    status_label: str = "COOLING"
    completed_days: int = 0
    current_streak: int = 0
    today_kcal_mid: int | None = None
    today_kcal_low: int | None = None
    today_kcal_high: int | None = None
    today_remaining_mid: int | None = None
    vision_configured: bool = False
