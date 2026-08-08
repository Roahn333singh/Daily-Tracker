"""SQLite-friendly schema patches for existing DBs."""

from __future__ import annotations

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def ensure_column(engine: Engine, table: str, column: str, ddl_type: str) -> None:
    insp = inspect(engine)
    if table not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns(table)}
    if column in cols:
        return
    with engine.begin() as conn:
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}"))


def migrate_schema(engine: Engine) -> None:
    ensure_column(engine, "goals", "kind", "VARCHAR(20) DEFAULT 'habit'")
    ensure_column(engine, "goals", "fuel_target_kcal", "INTEGER")
