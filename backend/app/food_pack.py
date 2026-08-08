"""Local food pack: offline calorie grounding + search."""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

PACK_PATH = Path(__file__).resolve().parent / "data" / "food_pack_v1.json"


@lru_cache(maxsize=1)
def load_food_pack() -> list[dict[str, Any]]:
    with open(PACK_PATH, encoding="utf-8") as f:
        return json.load(f)


def normalize_name(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (name or "").lower()).strip()


def kcal_for_grams(entry: dict[str, Any], grams: float) -> int:
    return int(round(entry["kcal_per_100g"] * grams / 100.0))


def range_around(mid: int, spread: float = 0.18) -> tuple[int, int, int]:
    low = max(0, int(round(mid * (1 - spread))))
    high = int(round(mid * (1 + spread)))
    return low, mid, high


def search_food_pack(query: str, limit: int = 12) -> list[dict[str, Any]]:
    q = normalize_name(query)
    if not q:
        return load_food_pack()[:limit]

    scored: list[tuple[int, dict[str, Any]]] = []
    for entry in load_food_pack():
        names = [entry["name"]] + entry.get("aliases", [])
        best = 0
        for n in names:
            nn = normalize_name(n)
            if q == nn:
                best = max(best, 100)
            elif q in nn or nn in q:
                best = max(best, 80)
            elif any(tok in nn for tok in q.split() if len(tok) > 2):
                best = max(best, 50)
        if best:
            scored.append((best, entry))

    scored.sort(key=lambda x: (-x[0], x[1]["name"]))
    return [e for _, e in scored[:limit]]


def match_food(name: str) -> dict[str, Any] | None:
    hits = search_food_pack(name, limit=1)
    if not hits:
        return None
    # require decent match for grounding
    q = normalize_name(name)
    entry = hits[0]
    names = [normalize_name(entry["name"])] + [normalize_name(a) for a in entry.get("aliases", [])]
    if any(q == n or q in n or n in q for n in names if n):
        return entry
    return None


def item_from_pack(entry: dict[str, Any], portion_index: int = 0) -> dict[str, Any]:
    portions = entry.get("portions") or [{"label": "100g", "grams": 100}]
    portion = portions[min(portion_index, len(portions) - 1)]
    grams = float(portion["grams"])
    mid = kcal_for_grams(entry, grams)
    low, mid, high = range_around(mid)
    return {
        "name": entry["name"],
        "portion_desc": portion["label"],
        "grams_est": grams,
        "kcal_low": low,
        "kcal_mid": mid,
        "kcal_high": high,
        "confidence": 0.75,
        "from_memory": False,
        "food_id": entry["id"],
    }


def ground_item(item: dict[str, Any]) -> dict[str, Any]:
    """Re-anchor a vision item mid kcal using food pack if possible."""
    entry = match_food(item.get("name", ""))
    if not entry:
        return item
    grams = item.get("grams_est")
    if not grams:
        portions = entry.get("portions") or [{"grams": 100}]
        grams = float(portions[0]["grams"])
    pack_mid = kcal_for_grams(entry, float(grams))
    # blend vision mid with pack (prefer pack for known foods)
    vision_mid = int(item.get("kcal_mid") or pack_mid)
    mid = int(round(0.35 * vision_mid + 0.65 * pack_mid))
    low, mid, high = range_around(mid, spread=0.2)
    return {
        **item,
        "grams_est": grams,
        "kcal_low": low,
        "kcal_mid": mid,
        "kcal_high": high,
        "confidence": min(0.9, float(item.get("confidence") or 0.5) + 0.15),
    }


def suggest_from_hint(hint: str | None, limit: int = 4) -> list[dict[str, Any]]:
    if not hint:
        # default common plate
        defaults = ["thali", "roti", "dal", "rice_white"]
        pack = {e["id"]: e for e in load_food_pack()}
        return [item_from_pack(pack[i]) for i in defaults if i in pack][:limit]

    h = normalize_name(hint)
    presets: dict[str, list[str]] = {
        "breakfast": ["oatmeal", "eggs_scrambled", "banana", "chai"],
        "lunch": ["roti", "dal", "sabzi", "rice_white"],
        "dinner": ["roti", "chicken_curry", "sabzi", "raita"],
        "snack": ["banana", "almonds", "chai", "chips"],
        "thali": ["thali", "raita"],
        "south": ["idli", "sambar", "dosa"],
        "biryani": ["biryani", "raita"],
    }
    ids: list[str] = []
    for key, val in presets.items():
        if key in h:
            ids.extend(val)
    if not ids:
        hits = search_food_pack(hint, limit=limit)
        return [item_from_pack(e) for e in hits]

    pack = {e["id"]: e for e in load_food_pack()}
    out = []
    for i in ids:
        if i in pack and len(out) < limit:
            out.append(item_from_pack(pack[i]))
    return out
