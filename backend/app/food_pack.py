"""Local food pack: IFCT-style densities + Indian portion vocabulary."""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

PACK_PATH = Path(__file__).resolve().parent / "data" / "food_pack_v1.json"

# Common Indian serving cues → grams heuristics when model is vague
PORTION_GRAMS: list[tuple[re.Pattern[str], float]] = [
    (re.compile(r"\b(3\s*rotis?|3\s*chapatis?|3\s*phulka)\b", re.I), 120),
    (re.compile(r"\b(2\.5\s*rotis?|2\s*1/2)\b", re.I), 100),
    (re.compile(r"\b(2\s*rotis?|2\s*chapatis?|2\s*phulka)\b", re.I), 80),
    (re.compile(r"\b(1\.5\s*rotis?|1½)\b", re.I), 60),
    (re.compile(r"\b(1\s*roti|1\s*chapati|1\s*phulka)\b", re.I), 40),
    (re.compile(r"\b(large\s*katori|full\s*katori|bada\s*katori)\b", re.I), 180),
    (re.compile(r"\b(medium\s*katori|1\s*katori|ek\s*katori|bowl)\b", re.I), 140),
    (re.compile(r"\b(small\s*katori|half\s*katori)\b", re.I), 90),
    (re.compile(r"\b(1\s*cup|one\s*cup)\b", re.I), 160),
    (re.compile(r"\b(1/2\s*cup|half\s*cup)\b", re.I), 80),
    (re.compile(r"\b(ladle|serving\s*spoon|chamach)\b", re.I), 50),
    (re.compile(r"\b(half\s*plate\s*rice|½\s*plate)\b", re.I), 140),
    (re.compile(r"\b(full\s*plate\s*rice|large\s*heap|heaped)\b", re.I), 250),
    (re.compile(r"\b(handful|small\s*scoop)\b", re.I), 80),
    (re.compile(r"\b(3\s*idli)\b", re.I), 120),
    (re.compile(r"\b(2\s*idli)\b", re.I), 80),
    (re.compile(r"\b(1\s*idli)\b", re.I), 40),
    (re.compile(r"\b(2\s*paratha)\b", re.I), 160),
    (re.compile(r"\b(1\s*paratha|stuffed\s*paratha)\b", re.I), 110),
    (re.compile(r"\b(1\s*naan|butter\s*naan)\b", re.I), 95),
    (re.compile(r"\b(2\s*pcs?|2\s*pieces)\b", re.I), 100),
    (re.compile(r"\b(1\s*piece|1\s*pc)\b", re.I), 50),
]


@lru_cache(maxsize=1)
def load_food_pack() -> list[dict[str, Any]]:
    with open(PACK_PATH, encoding="utf-8") as f:
        return json.load(f)


def normalize_name(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (name or "").lower()).strip()


def kcal_for_grams(entry: dict[str, Any], grams: float) -> int:
    return int(round(entry["kcal_per_100g"] * grams / 100.0))


def range_around(mid: int, spread: float = 0.15) -> tuple[int, int, int]:
    low = max(0, int(round(mid * (1 - spread))))
    high = int(round(mid * (1 + spread)))
    return low, mid, high


def infer_grams_from_text(*texts: str) -> float | None:
    blob = " ".join(t for t in texts if t)
    for pat, grams in PORTION_GRAMS:
        if pat.search(blob):
            return grams
    # bare number of rotis "rotis x3"
    m = re.search(r"(\d+(?:\.\d+)?)\s*(?:x)?\s*(?:rotis?|chapatis?)", blob, re.I)
    if m:
        return float(m.group(1)) * 40
    m = re.search(r"(\d+)\s*g(?:rams)?\b", blob, re.I)
    if m:
        return float(m.group(1))
    return None


def _token_score(query: str, candidate: str) -> int:
    q = normalize_name(query)
    c = normalize_name(candidate)
    if not q or not c:
        return 0
    if q == c:
        return 100
    if q in c or c in q:
        return 85
    q_toks = set(q.split())
    c_toks = set(c.split())
    if not q_toks or not c_toks:
        return 0
    inter = q_toks & c_toks
    if not inter:
        # soft stem: rajma/rajmah, sabzi/sabji
        soft = 0
        for qt in q_toks:
            for ct in c_toks:
                if len(qt) > 3 and (qt.startswith(ct[:4]) or ct.startswith(qt[:4])):
                    soft += 1
        if soft:
            return 40 + soft * 10
        return 0
    jaccard = len(inter) / len(q_toks | c_toks)
    return int(50 + jaccard * 50)


def search_food_pack(query: str, limit: int = 12) -> list[dict[str, Any]]:
    q = normalize_name(query)
    if not q:
        return load_food_pack()[:limit]

    scored: list[tuple[int, dict[str, Any]]] = []
    for entry in load_food_pack():
        names = [entry["name"]] + entry.get("aliases", [])
        best = max((_token_score(q, n) for n in names), default=0)
        # category boost
        if entry.get("cuisine") == "indian" and best:
            best += 5
        if best >= 40:
            scored.append((best, entry))

    scored.sort(key=lambda x: (-x[0], x[1]["name"]))
    return [e for _, e in scored[:limit]]


def match_food(name: str, min_score: int = 55) -> tuple[dict[str, Any], int] | None:
    q = normalize_name(name)
    if not q:
        return None
    best_entry = None
    best_score = 0
    for entry in load_food_pack():
        names = [entry["name"]] + entry.get("aliases", [])
        score = max((_token_score(q, n) for n in names), default=0)
        if score > best_score:
            best_score = score
            best_entry = entry
    if best_entry and best_score >= min_score:
        return best_entry, best_score
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
        "confidence": 0.78,
        "from_memory": False,
        "food_id": entry["id"],
        "grounding": "catalog",
    }


def resolve_grams(item: dict[str, Any], entry: dict[str, Any] | None = None) -> float:
    grams = item.get("grams_est")
    if grams is not None:
        try:
            g = float(grams)
            if g > 0:
                return g
        except (TypeError, ValueError):
            pass
    inferred = infer_grams_from_text(
        str(item.get("portion_desc") or ""),
        str(item.get("name") or ""),
        str(item.get("quantity_text") or ""),
    )
    if inferred:
        return inferred
    if entry:
        portions = entry.get("portions") or [{"grams": 100}]
        return float(portions[0]["grams"])
    return 100.0


def ground_item(item: dict[str, Any]) -> dict[str, Any]:
    """
    Pack-first calorie assignment.
    Vision is trusted for identity + portion size; kcal density from catalog when matched.
    """
    matched = match_food(item.get("name", ""))
    oil = str(item.get("oil_level") or "medium").lower()
    oil_factor = {"low": 0.92, "medium": 1.0, "high": 1.12, "very_high": 1.22}.get(oil, 1.0)

    if matched:
        entry, score = matched
        grams = resolve_grams(item, entry)
        pack_mid = int(round(kcal_for_grams(entry, grams) * oil_factor))
        vision_mid = int(item.get("kcal_mid") or 0)
        # Strong catalog prior when match is good; slight blend if vision present
        if vision_mid > 0 and score < 80:
            mid = int(round(0.2 * vision_mid + 0.8 * pack_mid))
        elif vision_mid > 0:
            mid = int(round(0.12 * vision_mid + 0.88 * pack_mid))
        else:
            mid = pack_mid
        spread = 0.12 if score >= 80 else 0.18
        low, mid, high = range_around(mid, spread=spread)
        conf = min(0.95, float(item.get("confidence") or 0.55) + (0.2 if score >= 80 else 0.1))
        return {
            **item,
            "name": entry["name"],  # canonical name
            "grams_est": grams,
            "kcal_low": low,
            "kcal_mid": mid,
            "kcal_high": high,
            "confidence": conf,
            "food_id": entry["id"],
            "grounding": "catalog",
            "match_score": score,
        }

    # Unmatched: prefer vision kcal; else density × grams by appearance
    grams = resolve_grams(item, None)
    vision_mid = int(item.get("kcal_mid") or 0)
    if vision_mid <= 0:
        vision_mid = int(item.get("kcal_low") or 0)
    if vision_mid <= 0:
        app = str(item.get("appearance") or "").lower()
        density = 1.35  # generic cooked food kcal/g
        if "fried" in app:
            density = 2.6
        elif "gravy" in app:
            density = 1.5
        elif "steamed" in app or "boiled" in app:
            density = 1.15
        elif "baked" in app or "dry" in app:
            density = 1.4
        name_l = (item.get("name") or "").lower()
        if any(x in name_l for x in ("rice", "chawal", "pulao")):
            density = 1.3
        if any(x in name_l for x in ("roti", "chapati", "paratha", "naan", "bread")):
            density = 2.9
        if any(x in name_l for x in ("salad", "raita", "curd", "dahi")):
            density = 0.55
        if any(x in name_l for x in ("papad", "pickle", "oil", "ghee", "butter")):
            density = 5.0
        if any(x in name_l for x in ("dal", "sambar", "rasam")):
            density = 1.1
        vision_mid = int(round(grams * density))
    mid = int(round(vision_mid * oil_factor))
    low, mid, high = range_around(mid, spread=0.25)
    return {
        **item,
        "grams_est": grams,
        "kcal_low": low,
        "kcal_mid": mid,
        "kcal_high": high,
        "confidence": min(0.7, float(item.get("confidence") or 0.45)),
        "grounding": "vision-density" if int(item.get("kcal_mid") or 0) <= 0 else "vision",
        "match_score": 0,
    }


def apply_hidden_oil_item(items: list[dict[str, Any]], plate_oil: str | None) -> list[dict[str, Any]]:
    """Add a small oil/ghee line when the model marks overall plate as oily."""
    if not plate_oil or plate_oil.lower() in ("low", "none", ""):
        return items
    if any("oil" in (i.get("name") or "").lower() or "ghee" in (i.get("name") or "").lower() for i in items):
        return items
    map_add = {"medium": (5, 45), "high": (10, 90), "very_high": (14, 126)}
    grams, mid = map_add.get(plate_oil.lower(), (5, 45))
    low, mid, high = range_around(mid, 0.1)
    items = list(items)
    items.append(
        {
            "name": "Cooking oil / ghee (visible / gravy)",
            "portion_desc": f"~{grams}g estimated for plate sheen/gravy",
            "grams_est": grams,
            "kcal_low": low,
            "kcal_mid": mid,
            "kcal_high": high,
            "confidence": 0.4,
            "from_memory": False,
            "grounding": "oil-model",
        }
    )
    return items


def suggest_from_hint(hint: str | None, limit: int = 4) -> list[dict[str, Any]]:
    if not hint:
        defaults = ["roti", "dal", "sabzi", "rice_white"]
        pack = {e["id"]: e for e in load_food_pack()}
        return [item_from_pack(pack[i]) for i in defaults if i in pack][:limit]

    h = normalize_name(hint)
    presets: dict[str, list[str]] = {
        "breakfast": ["poha", "idli", "eggs_scrambled", "chai"],
        "lunch": ["roti", "dal", "sabzi", "rice_white"],
        "dinner": ["roti", "dal", "sabzi", "raita"],
        "thali": ["roti", "rice_white", "dal", "sabzi", "raita", "papad"],
        "south": ["idli", "sambar", "coconut_chutney", "dosa"],
        "north": ["roti", "dal", "paneer_butter", "raita"],
        "biryani": ["biryani", "raita", "salan"],
        "snack": ["samosa", "chai", "namkeen"],
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
