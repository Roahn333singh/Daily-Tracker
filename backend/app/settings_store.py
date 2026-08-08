"""In-app settings (API keys, etc.) stored in SQLite."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from . import models

KEY_GEMINI = "gemini_api_key"
KEY_VISION_MODEL = "vision_model"


def get_setting(db: Session, key: str) -> str | None:
    row = db.query(models.AppSetting).filter(models.AppSetting.key == key).first()
    if not row or not (row.value or "").strip():
        return None
    return row.value.strip()


def set_setting(db: Session, key: str, value: str) -> None:
    row = db.query(models.AppSetting).filter(models.AppSetting.key == key).first()
    if row:
        row.value = value
        row.updated_at = datetime.utcnow()
    else:
        db.add(models.AppSetting(key=key, value=value, updated_at=datetime.utcnow()))
    db.commit()


def delete_setting(db: Session, key: str) -> bool:
    row = db.query(models.AppSetting).filter(models.AppSetting.key == key).first()
    if not row:
        return False
    db.delete(row)
    db.commit()
    return True


def key_hint(secret: str | None) -> str | None:
    if not secret:
        return None
    s = secret.strip()
    if len(s) <= 8:
        return "••••••••"
    return f"{s[:4]}…{s[-4:]}"


def get_gemini_key_from_db() -> str | None:
    """Read without request-scoped session (vision module)."""
    try:
        from .database import SessionLocal

        db = SessionLocal()
        try:
            return get_setting(db, KEY_GEMINI)
        finally:
            db.close()
    except Exception:  # noqa: BLE001
        return None
