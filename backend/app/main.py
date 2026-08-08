from datetime import date, datetime
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session, joinedload

# Load backend/.env so GEMINI_API_KEY works without exporting in shell
load_dotenv(Path(__file__).resolve().parent.parent / ".env")
load_dotenv()  # also cwd

from . import models, schemas
from .database import Base, engine, get_db
from .food_pack import item_from_pack, load_food_pack, search_food_pack
from .fuel_services import (
    day_meal_totals,
    ensure_fuel_checkin,
    load_goal_with_meals,
    upsert_food_memory,
)
from .migrate_db import migrate_schema
from .services import enrich_goal, ensure_fuel_seed, migrate_icon_ids, seed_if_empty
from .vision_estimate import (
    estimate_from_image,
    offline_estimate,
    vision_configured,
    vision_provider,
    vision_status,
)
from .settings_store import KEY_GEMINI, delete_setting, set_setting

UPLOAD_ROOT = Path(os.getenv("UPLOAD_DIR", str(Path(__file__).resolve().parent.parent / "uploads")))
UPLOAD_DIR = UPLOAD_ROOT / "meals"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

Base.metadata.create_all(bind=engine)
migrate_schema(engine)

app = FastAPI(
    title="Programming Daily Tracker",
    description="Daily tracker + photo-first calorie estimation",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_ROOT)), name="uploads")


@app.on_event("startup")
def on_startup():
    db = next(get_db())
    try:
        seed_if_empty(db)
        migrate_icon_ids(db)
        ensure_fuel_seed(db)
    finally:
        db.close()


def load_goal(db: Session, goal_id: int) -> models.Goal:
    goal = load_goal_with_meals(db, goal_id)
    if not goal:
        # fallback without meals if tables mid-migration
        goal = (
            db.query(models.Goal)
            .options(
                joinedload(models.Goal.sub_goals),
                joinedload(models.Goal.checkins),
            )
            .filter(models.Goal.id == goal_id)
            .first()
        )
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal


@app.get("/api/health")
def health():
    status = vision_status()
    return {
        "status": "ok",
        "vision_configured": status["configured"],
        "vision_provider": status["provider"],
        "vision_source": status["source"],
    }


@app.get("/api/settings/vision", response_model=schemas.VisionSettingsOut)
def get_vision_settings():
    return vision_status()


@app.put("/api/settings/vision", response_model=schemas.VisionSettingsOut)
def put_vision_key(payload: schemas.VisionKeyUpdate, db: Session = Depends(get_db)):
    key = (payload.api_key or "").strip()
    if len(key) < 10:
        raise HTTPException(status_code=400, detail="API key looks too short")
    set_setting(db, KEY_GEMINI, key)
    return vision_status()


@app.delete("/api/settings/vision", response_model=schemas.VisionSettingsOut)
def delete_vision_key(db: Session = Depends(get_db)):
    delete_setting(db, KEY_GEMINI)
    return vision_status()


@app.get("/api/goals", response_model=list[schemas.GoalOut])
def list_goals(db: Session = Depends(get_db)):
    goals = (
        db.query(models.Goal)
        .options(
            joinedload(models.Goal.sub_goals),
            joinedload(models.Goal.checkins),
            joinedload(models.Goal.meals).joinedload(models.MealLog.items),
        )
        .order_by(models.Goal.sort_order, models.Goal.id)
        .all()
    )
    return [enrich_goal(g) for g in goals]


@app.get("/api/goals/{goal_id}", response_model=schemas.GoalOut)
def get_goal(goal_id: int, db: Session = Depends(get_db)):
    return enrich_goal(load_goal(db, goal_id))


@app.post("/api/goals", response_model=schemas.GoalOut, status_code=201)
def create_goal(payload: schemas.GoalCreate, db: Session = Depends(get_db)):
    kind = payload.kind or "habit"
    if kind == "fuel" and not payload.fuel_target_kcal:
        raise HTTPException(status_code=400, detail="fuel_target_kcal required for fuel goals")
    goal = models.Goal(
        title=payload.title,
        description=payload.description,
        icon=payload.icon,
        duration_days=payload.duration_days,
        start_date=payload.start_date or date.today(),
        accent_color=payload.accent_color,
        completion_emoji=payload.completion_emoji,
        is_active=payload.is_active,
        sort_order=payload.sort_order,
        kind=kind,
        fuel_target_kcal=payload.fuel_target_kcal if kind == "fuel" else None,
    )
    db.add(goal)
    db.flush()

    for i, sg in enumerate(payload.sub_goals):
        db.add(
            models.SubGoal(
                goal_id=goal.id,
                title=sg.title,
                icon=sg.icon,
                sort_order=sg.sort_order if sg.sort_order else i,
            )
        )

    db.commit()
    return enrich_goal(load_goal(db, goal.id))


@app.patch("/api/goals/{goal_id}", response_model=schemas.GoalOut)
def update_goal(goal_id: int, payload: schemas.GoalUpdate, db: Session = Depends(get_db)):
    goal = load_goal(db, goal_id)
    data = payload.model_dump(exclude_unset=True)
    sub_goals = data.pop("sub_goals", None)

    for key, value in data.items():
        setattr(goal, key, value)

    if sub_goals is not None:
        goal.sub_goals.clear()
        db.flush()
        for i, sg in enumerate(sub_goals):
            goal.sub_goals.append(
                models.SubGoal(
                    title=sg["title"],
                    icon=sg.get("icon", "sub-dot"),
                    sort_order=sg.get("sort_order", i),
                )
            )

    db.commit()
    return enrich_goal(load_goal(db, goal_id))


@app.delete("/api/goals/{goal_id}", status_code=204)
def delete_goal(goal_id: int, db: Session = Depends(get_db)):
    goal = load_goal(db, goal_id)
    db.delete(goal)
    db.commit()
    return None


@app.post("/api/goals/{goal_id}/sub-goals", response_model=schemas.SubGoalOut, status_code=201)
def add_sub_goal(
    goal_id: int,
    payload: schemas.SubGoalCreate,
    db: Session = Depends(get_db),
):
    load_goal(db, goal_id)
    sg = models.SubGoal(
        goal_id=goal_id,
        title=payload.title,
        icon=payload.icon,
        sort_order=payload.sort_order,
    )
    db.add(sg)
    db.commit()
    db.refresh(sg)
    return sg


@app.patch("/api/sub-goals/{sub_goal_id}", response_model=schemas.SubGoalOut)
def update_sub_goal(
    sub_goal_id: int,
    payload: schemas.SubGoalUpdate,
    db: Session = Depends(get_db),
):
    sg = db.query(models.SubGoal).filter(models.SubGoal.id == sub_goal_id).first()
    if not sg:
        raise HTTPException(status_code=404, detail="Sub-goal not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(sg, key, value)
    db.commit()
    db.refresh(sg)
    return sg


@app.delete("/api/sub-goals/{sub_goal_id}", status_code=204)
def delete_sub_goal(sub_goal_id: int, db: Session = Depends(get_db)):
    sg = db.query(models.SubGoal).filter(models.SubGoal.id == sub_goal_id).first()
    if not sg:
        raise HTTPException(status_code=404, detail="Sub-goal not found")
    db.delete(sg)
    db.commit()
    return None


@app.post("/api/goals/{goal_id}/checkins", response_model=schemas.DayCheckinOut)
def toggle_checkin(
    goal_id: int,
    payload: schemas.DayCheckinToggle,
    db: Session = Depends(get_db),
):
    load_goal(db, goal_id)
    existing = (
        db.query(models.DayCheckin)
        .filter(
            models.DayCheckin.goal_id == goal_id,
            models.DayCheckin.day == payload.day,
        )
        .first()
    )

    if existing:
        if payload.completed is None:
            existing.completed = not existing.completed
        else:
            existing.completed = payload.completed
        if payload.note is not None:
            existing.note = payload.note
        if payload.sub_goal_id is not None:
            existing.sub_goal_id = payload.sub_goal_id
        db.commit()
        db.refresh(existing)
        return existing

    completed = True if payload.completed is None else payload.completed
    checkin = models.DayCheckin(
        goal_id=goal_id,
        day=payload.day,
        completed=completed,
        note=payload.note or "",
        sub_goal_id=payload.sub_goal_id,
    )
    db.add(checkin)
    db.commit()
    db.refresh(checkin)
    return checkin


# ── Fuel / calorie estimation ─────────────────────────────────


@app.get("/api/fuel/food-pack")
def get_food_pack(q: str | None = None, limit: int = 40):
    if q:
        entries = search_food_pack(q, limit=limit)
    else:
        entries = load_food_pack()[:limit]
    return entries


@app.get("/api/fuel/memory", response_model=list[schemas.FoodMemoryOut])
def list_memory(db: Session = Depends(get_db)):
    return (
        db.query(models.UserFoodMemory)
        .order_by(models.UserFoodMemory.use_count.desc(), models.UserFoodMemory.last_used.desc())
        .limit(100)
        .all()
    )


@app.post("/api/fuel/estimate", response_model=schemas.EstimateOut)
async def estimate_meal(
    image: UploadFile | None = File(default=None),
    meal_hint: str | None = Form(default=None),
    offline_only: bool = Form(default=False),
    db: Session = Depends(get_db),
):
    memory = db.query(models.UserFoodMemory).order_by(models.UserFoodMemory.use_count.desc()).all()
    photo_path = None

    if offline_only or image is None:
        est = offline_estimate(meal_hint, memory)
        return schemas.EstimateOut(**est, photo_path=None)

    raw = await image.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty image")

    # cap ~4MB
    if len(raw) > 4 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 4MB)")

    ext = "jpg"
    ct = image.content_type or "image/jpeg"
    if "png" in ct:
        ext = "png"
        media = "image/png"
    elif "webp" in ct:
        ext = "webp"
        media = "image/webp"
    else:
        media = "image/jpeg"

    fname = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{abs(hash(raw)) % 10**8}.{ext}"
    dest = UPLOAD_DIR / fname
    dest.write_bytes(raw)
    photo_path = f"/uploads/meals/{fname}"

    est = await estimate_from_image(raw, media, meal_hint, memory)
    est["photo_path"] = photo_path
    return schemas.EstimateOut(**est)


@app.get("/api/fuel/estimate-offline", response_model=schemas.EstimateOut)
def estimate_offline(
    meal_hint: str | None = None,
    db: Session = Depends(get_db),
):
    memory = db.query(models.UserFoodMemory).order_by(models.UserFoodMemory.use_count.desc()).all()
    return schemas.EstimateOut(**offline_estimate(meal_hint, memory))


@app.get("/api/goals/{goal_id}/fuel/day", response_model=schemas.DayFuelOut)
def fuel_day(goal_id: int, day: date | None = None, db: Session = Depends(get_db)):
    goal = load_goal(db, goal_id)
    if (goal.kind or "habit") != "fuel":
        raise HTTPException(status_code=400, detail="Not a fuel goal")
    d = day or date.today()
    totals = day_meal_totals(goal, d)
    meals = [m for m in (goal.meals or []) if m.day == d]
    return schemas.DayFuelOut(
        day=d,
        meals_count=totals["meals_count"],
        total_kcal_low=totals["total_kcal_low"],
        total_kcal_mid=totals["total_kcal_mid"],
        total_kcal_high=totals["total_kcal_high"],
        target_kcal=totals["target_kcal"],
        remaining_mid=totals["remaining_mid"],
        meals=meals,
    )


@app.post("/api/goals/{goal_id}/meals", response_model=schemas.MealLogOut, status_code=201)
def confirm_meal(
    goal_id: int,
    payload: schemas.MealConfirm,
    db: Session = Depends(get_db),
):
    goal = load_goal(db, goal_id)
    if (goal.kind or "habit") != "fuel":
        raise HTTPException(status_code=400, detail="Not a fuel goal")
    if not payload.items:
        raise HTTPException(status_code=400, detail="At least one item required")

    items_data = [i.model_dump() for i in payload.items]
    low = sum(int(i.get("kcal_low") or 0) for i in items_data)
    mid = sum(int(i.get("kcal_mid") or 0) for i in items_data)
    high = sum(int(i.get("kcal_high") or 0) for i in items_data)
    conf = payload.confidence
    if conf is None:
        confs = [float(i.get("confidence") or 0.5) for i in items_data]
        conf = sum(confs) / len(confs)

    meal = models.MealLog(
        goal_id=goal_id,
        day=payload.day or date.today(),
        source=payload.source or "manual",
        photo_path=payload.photo_path,
        note=payload.note or "",
        total_kcal_low=low,
        total_kcal_mid=mid,
        total_kcal_high=high,
        confidence=conf,
        confirmed_at=datetime.utcnow(),
    )
    db.add(meal)
    db.flush()

    for it in items_data:
        db.add(
            models.MealItem(
                meal_id=meal.id,
                name=it["name"],
                portion_desc=it.get("portion_desc") or "",
                grams_est=it.get("grams_est"),
                kcal_low=int(it.get("kcal_low") or 0),
                kcal_mid=int(it.get("kcal_mid") or 0),
                kcal_high=int(it.get("kcal_high") or 0),
                confidence=float(it.get("confidence") or 0.5),
                from_memory=bool(it.get("from_memory")),
            )
        )

    upsert_food_memory(db, items_data)
    ensure_fuel_checkin(db, goal_id, meal.day)
    db.commit()

    meal = (
        db.query(models.MealLog)
        .options(joinedload(models.MealLog.items))
        .filter(models.MealLog.id == meal.id)
        .first()
    )
    return meal


@app.delete("/api/meals/{meal_id}", status_code=204)
def delete_meal(meal_id: int, db: Session = Depends(get_db)):
    meal = db.query(models.MealLog).filter(models.MealLog.id == meal_id).first()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")
    db.delete(meal)
    db.commit()
    return None


@app.post("/api/fuel/pack-item", response_model=schemas.EstimateItemOut)
def pack_item_as_estimate(food_id: str, portion_index: int = 0):
    pack = {e["id"]: e for e in load_food_pack()}
    if food_id not in pack:
        raise HTTPException(status_code=404, detail="Food not found")
    return item_from_pack(pack[food_id], portion_index)


# Production: serve built React SPA from STATIC_DIR (root Dockerfile / App Platform)
_STATIC = Path(os.getenv("STATIC_DIR", ""))
if _STATIC.is_dir() and (_STATIC / "index.html").is_file():
    _assets = _STATIC / "assets"
    if _assets.is_dir():
        app.mount("/assets", StaticFiles(directory=str(_assets)), name="spa-assets")

    @app.get("/")
    def spa_index():
        return FileResponse(_STATIC / "index.html")

    @app.get("/{full_path:path}")
    def spa_fallback(full_path: str):
        # Never shadow API / uploads (registered above, but guard anyway)
        if full_path.startswith("api") or full_path.startswith("uploads"):
            raise HTTPException(status_code=404, detail="Not found")
        candidate = (_STATIC / full_path).resolve()
        try:
            candidate.relative_to(_STATIC.resolve())
        except ValueError:
            raise HTTPException(status_code=404, detail="Not found") from None
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(_STATIC / "index.html")
