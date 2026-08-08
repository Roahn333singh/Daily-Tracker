"""Photo / offline meal calorie estimation — dual-pass Indian plate engine.

Supports Google Gemini (default) and OpenAI-compatible APIs.
Pipeline:
  1) Vision: segment plate (Indian thali-aware) → dishes + portions + oil
  2) Ground: map names → IFCT-style catalog densities + portion grammar
  3) Oil model: optional hidden oil/ghee line for shiny gravies
"""

from __future__ import annotations

import base64
import json
import os
import re
from typing import Any, Literal

import httpx

from . import models
from .food_pack import (
    apply_hidden_oil_item,
    ground_item,
    item_from_pack,
    search_food_pack,
    suggest_from_hint,
)
from .settings_store import get_gemini_key_from_db

# Pass 1 — identity + geometry (no raw kcal invention preferred)
SEGMENT_SYSTEM = """You are an expert Indian + global food plate analyst specializing in home thali accuracy.
Analyze the photo carefully. Decompose EVERY visible edible component separately
(do NOT collapse a thali into one item).

Return ONLY JSON:
{
  "cuisine_guess": "north_indian|south_indian|mixed|global|unknown",
  "plate_context": "home_thali|restaurant|tiffin|snack|other",
  "overall_oil_level": "low|medium|high|very_high",
  "items": [
    {
      "name": "specific dish name (e.g. yellow toor dal, jeera aloo, phulka roti)",
      "quantity_text": "e.g. 2 medium rotis / 1 medium katori",
      "portion_desc": "human readable portion",
      "count": 1,
      "grams_est": 120,
      "plate_fraction": 0.15,
      "oil_level": "low|medium|high",
      "appearance": "dry|gravy|fried|steamed|baked",
      "confidence": 0.0-1.0
    }
  ],
  "notes": "uncertainty (hidden ghee, bottom of katori, etc.)",
  "overall_confidence": 0.0-1.0
}

STRICT RULES:
1. Separate dal / sabzi / rice / roti / raita / papad / chutney / salad / pickle / sweet / drink.
2. Count rotis/parathas/idlis/dosas as discrete counts.
3. Use Indian portion language: katori (small/medium/large), roti diameter ~15cm, rice heap vs flat scoop.
4. grams_est must be realistic edible mass (roti ~35-45g, medium katori dal ~120-160g, rice half-plate ~150-200g cooked).
5. Prefer specific names (rajma, chole, aloo gobi) over generic "curry".
6. Do NOT invent drinks/sides you cannot see.
7. confidence low when food is occluded or blurry.
8. plate_fraction ≈ share of plate area (0-1), sum may be < 1.
"""

# Used if only one-shot OpenAI path
VISION_SYSTEM = SEGMENT_SYSTEM + """
Also fill kcal_low, kcal_mid, kcal_high per item (approximate). Catalog will recalibrate densities.
"""

Provider = Literal["gemini", "openai"]


def _env_gemini_key() -> str | None:
    return os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or os.getenv("GOOGLE_AI_API_KEY")


def _gemini_key() -> str | None:
    return get_gemini_key_from_db() or _env_gemini_key()


def _openai_key() -> str | None:
    return os.getenv("VISION_API_KEY") or os.getenv("OPENAI_API_KEY")


def vision_key_source() -> str | None:
    if get_gemini_key_from_db():
        return "app"
    if _env_gemini_key() or _openai_key():
        return "env"
    return None


def vision_provider() -> Provider | None:
    forced = (os.getenv("VISION_PROVIDER") or "").strip().lower()
    if forced in ("gemini", "google"):
        return "gemini" if _gemini_key() else None
    if forced in ("openai", "gpt"):
        return "openai" if _openai_key() else None
    if _gemini_key():
        return "gemini"
    if _openai_key():
        return "openai"
    return None


def vision_configured() -> bool:
    return vision_provider() is not None


def vision_status() -> dict[str, Any]:
    app_key = get_gemini_key_from_db()
    env_key = _env_gemini_key()
    provider = vision_provider()
    active = _gemini_key() if provider == "gemini" else (_openai_key() if provider == "openai" else None)
    from .settings_store import key_hint

    return {
        "configured": provider is not None,
        "provider": provider,
        "model": _gemini_model() if (provider or "gemini") == "gemini" else _openai_model(),
        "source": vision_key_source(),
        "has_app_key": bool(app_key),
        "has_env_key": bool(env_key or _openai_key()),
        "key_hint": key_hint(active or app_key or env_key),
        "engine": "dual-pass-indian-thali",
    }


def _gemini_model() -> str:
    return os.getenv("VISION_MODEL") or os.getenv("GEMINI_MODEL") or "gemini-2.5-flash"


def _openai_base_url() -> str:
    return (os.getenv("VISION_BASE_URL") or "https://api.openai.com/v1").rstrip("/")


def _openai_model() -> str:
    return os.getenv("VISION_MODEL") or "gpt-4o-mini"


def _extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    if not text.startswith("{"):
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            text = text[start : end + 1]
    return json.loads(text)


def _sum_items(items: list[dict[str, Any]]) -> tuple[int, int, int, float]:
    if not items:
        return 0, 0, 0, 0.0
    low = sum(int(i.get("kcal_low") or 0) for i in items)
    mid = sum(int(i.get("kcal_mid") or 0) for i in items)
    high = sum(int(i.get("kcal_high") or 0) for i in items)
    confs = [float(i.get("confidence") or 0.5) for i in items]
    conf = sum(confs) / len(confs)
    return low, mid, high, conf


def offline_estimate(
    meal_hint: str | None = None,
    memory_items: list[models.UserFoodMemory] | None = None,
) -> dict[str, Any]:
    items: list[dict[str, Any]] = []
    source = "catalog"

    if meal_hint and memory_items:
        q = (meal_hint or "").lower()
        for m in memory_items:
            name = (m.display_name or m.normalized_name).lower()
            if q in name or name in q or any(t in name for t in q.split() if len(t) > 2):
                items.append(
                    {
                        "name": m.display_name or m.normalized_name,
                        "portion_desc": m.portion_desc,
                        "grams_est": m.grams_est,
                        "kcal_low": m.kcal_low or int(m.kcal_mid * 0.82),
                        "kcal_mid": m.kcal_mid,
                        "kcal_high": m.kcal_high or int(m.kcal_mid * 1.18),
                        "confidence": min(0.9, 0.55 + 0.05 * min(m.use_count, 6)),
                        "from_memory": True,
                        "grounding": "memory",
                    }
                )
                source = "memory"
        if items:
            low, mid, high, conf = _sum_items(items)
            return {
                "source": source,
                "items": items[:10],
                "notes": "Offline: personal food memory.",
                "overall_confidence": conf,
                "total_kcal_low": low,
                "total_kcal_mid": mid,
                "total_kcal_high": high,
                "vision_used": False,
                "engine": "offline-memory",
            }

    if memory_items and not meal_hint:
        top = sorted(memory_items, key=lambda m: m.use_count, reverse=True)[:4]
        for m in top:
            items.append(
                {
                    "name": m.display_name or m.normalized_name,
                    "portion_desc": m.portion_desc,
                    "grams_est": m.grams_est,
                    "kcal_low": m.kcal_low or int(m.kcal_mid * 0.82),
                    "kcal_mid": m.kcal_mid,
                    "kcal_high": m.kcal_high or int(m.kcal_mid * 1.18),
                    "confidence": 0.55,
                    "from_memory": True,
                    "grounding": "memory",
                }
            )
        if items:
            low, mid, high, conf = _sum_items(items)
            return {
                "source": "memory",
                "items": items,
                "notes": "Offline: frequent memory foods.",
                "overall_confidence": conf,
                "total_kcal_low": low,
                "total_kcal_mid": mid,
                "total_kcal_high": high,
                "vision_used": False,
                "engine": "offline-memory",
            }

    items = suggest_from_hint(meal_hint)
    if meal_hint and not items:
        for e in search_food_pack(meal_hint, limit=5):
            items.append(item_from_pack(e))
    if not items:
        items = suggest_from_hint("thali")

    low, mid, high, conf = _sum_items(items)
    return {
        "source": "catalog",
        "items": items,
        "notes": "Vision offline. Indian food pack suggestions — edit portions before confirming.",
        "overall_confidence": conf * 0.85,
        "total_kcal_low": low,
        "total_kcal_mid": mid,
        "total_kcal_high": high,
        "vision_used": False,
        "engine": "offline-catalog",
    }


def _normalize_raw_item(raw: dict[str, Any]) -> dict[str, Any]:
    qty = str(raw.get("quantity_text") or raw.get("portion_desc") or "")
    name = str(raw.get("name") or "food")
    count = raw.get("count")
    if count and not qty:
        qty = f"{count} x {name}"
    return {
        "name": name,
        "portion_desc": str(raw.get("portion_desc") or qty),
        "quantity_text": qty,
        "grams_est": raw.get("grams_est"),
        "kcal_low": int(raw.get("kcal_low") or 0),
        "kcal_mid": int(raw.get("kcal_mid") or 0),
        "kcal_high": int(raw.get("kcal_high") or 0),
        "confidence": float(raw.get("confidence") or 0.55),
        "oil_level": str(raw.get("oil_level") or "medium"),
        "appearance": str(raw.get("appearance") or ""),
        "plate_fraction": raw.get("plate_fraction"),
        "from_memory": False,
    }


def finalize_estimate(data: dict[str, Any], provider_label: str) -> dict[str, Any] | None:
    raw_items = data.get("items") or []
    if not raw_items:
        return None

    items = [_normalize_raw_item(r) for r in raw_items]
    # Drop zero-name junk
    items = [i for i in items if i["name"].strip()]

    grounded = [ground_item(i) for i in items]
    plate_oil = data.get("overall_oil_level")
    grounded = apply_hidden_oil_item(grounded, plate_oil)

    # Sanity: clamp absurd single-item kcal
    fixed = []
    for it in grounded:
        mid = int(it.get("kcal_mid") or 0)
        if mid > 1200:
            it = {**it, "kcal_mid": 900, "kcal_high": min(int(it.get("kcal_high") or 1100), 1200), "confidence": 0.35}
        if mid < 5 and "oil" not in (it.get("name") or "").lower():
            continue
        fixed.append(it)

    if not fixed:
        return None

    low, mid, high, conf = _sum_items(fixed)
    catalog_n = sum(1 for i in fixed if i.get("grounding") == "catalog")
    overall = float(data.get("overall_confidence") or conf)
    # boost confidence when catalog-grounded well
    if catalog_n >= max(1, len(fixed) // 2):
        overall = min(0.92, overall + 0.12)

    notes = str(data.get("notes") or "")
    meta = []
    if data.get("cuisine_guess"):
        meta.append(f"cuisine={data['cuisine_guess']}")
    if data.get("plate_context"):
        meta.append(f"context={data['plate_context']}")
    if plate_oil:
        meta.append(f"oil={plate_oil}")
    meta.append(f"catalog_hits={catalog_n}/{len(fixed)}")
    footer = " · ".join(meta)
    full_notes = f"{provider_label} dual-pass. {footer}. {notes}".strip()

    return {
        "source": "vision",
        "items": fixed,
        "notes": full_notes,
        "overall_confidence": overall,
        "total_kcal_low": low,
        "total_kcal_mid": mid,
        "total_kcal_high": high,
        "vision_used": True,
        "engine": "dual-pass-indian-thali",
        "cuisine_guess": data.get("cuisine_guess"),
        "plate_context": data.get("plate_context"),
    }


async def _gemini_json(
    image_bytes: bytes,
    media_type: str,
    system: str,
    user_text: str,
    temperature: float = 0.15,
) -> dict[str, Any]:
    key = _gemini_key()
    assert key
    model = _gemini_model()
    b64 = base64.b64encode(image_bytes).decode("ascii")
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={key}"
    )
    payload = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": user_text},
                    {"inline_data": {"mime_type": media_type, "data": b64}},
                ],
            }
        ],
        "generationConfig": {
            "temperature": temperature,
            "responseMimeType": "application/json",
        },
    }
    async with httpx.AsyncClient(timeout=120.0) as client:
        res = await client.post(url, json=payload)
        if res.status_code >= 400:
            raise RuntimeError(f"Gemini HTTP {res.status_code}: {res.text[:240]}")
        body = res.json()
    candidates = body.get("candidates") or []
    if not candidates:
        raise RuntimeError(f"Gemini no candidates: {body.get('promptFeedback')}")
    parts = candidates[0].get("content", {}).get("parts") or []
    text = "".join(p.get("text", "") for p in parts if "text" in p)
    if not text:
        raise RuntimeError("Gemini response empty")
    return _extract_json(text)


async def _call_gemini_dual(
    image_bytes: bytes,
    media_type: str,
    meal_hint: str | None,
) -> dict[str, Any]:
    """Pass A: segment. Pass B: refine portions with self-critique."""
    hint = meal_hint or "Indian home / restaurant plate or thali"
    user_a = (
        f"Segment this meal photo into individual foods. Context: {hint}. "
        "Focus on accurate item separation and portion sizes (katori, roti count, rice heap). "
        "JSON only."
    )
    data = await _gemini_json(image_bytes, media_type, SEGMENT_SYSTEM, user_a, temperature=0.12)

    # Critique / refine pass when we got something
    items = data.get("items") or []
    if len(items) >= 1:
        critique_system = (
            SEGMENT_SYSTEM
            + "\nYou are revising a prior segmentation. Fix missed items, wrong counts, "
            "unrealistic grams. Keep only foods actually visible."
        )
        user_b = (
            f"Prior analysis JSON:\n{json.dumps(data)[:6000]}\n\n"
            f"Context: {hint}. Re-check the image. Return improved full JSON (same schema). "
            "If a thali has multiple small bowls, list each. JSON only."
        )
        try:
            revised = await _gemini_json(
                image_bytes, media_type, critique_system, user_b, temperature=0.1
            )
            if revised.get("items"):
                data = revised
        except Exception:  # noqa: BLE001
            pass  # keep pass-A result

    return data


async def _call_openai(
    image_bytes: bytes,
    media_type: str,
    meal_hint: str | None,
) -> dict[str, Any]:
    key = _openai_key()
    assert key
    b64 = base64.b64encode(image_bytes).decode("ascii")
    data_url = f"data:{media_type};base64,{b64}"
    user_text = (
        f"Segment this plate and estimate portions. Context: {meal_hint or 'general meal'}. "
        "Strongly prefer Indian thali decomposition when applicable."
    )
    payload = {
        "model": _openai_model(),
        "temperature": 0.15,
        "messages": [
            {"role": "system", "content": VISION_SYSTEM},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": user_text},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            },
        ],
    }
    async with httpx.AsyncClient(timeout=90.0) as client:
        res = await client.post(
            f"{_openai_base_url()}/chat/completions",
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        if res.status_code >= 400:
            raise RuntimeError(f"OpenAI HTTP {res.status_code}: {res.text[:200]}")
        body = res.json()
        content = body["choices"][0]["message"]["content"]
        return _extract_json(content)


async def estimate_from_image(
    image_bytes: bytes,
    media_type: str = "image/jpeg",
    meal_hint: str | None = None,
    memory_items: list[models.UserFoodMemory] | None = None,
) -> dict[str, Any]:
    provider = vision_provider()
    if not provider:
        return offline_estimate(meal_hint, memory_items)

    try:
        if provider == "gemini":
            data = await _call_gemini_dual(image_bytes, media_type, meal_hint)
            label = f"Gemini/{_gemini_model()}"
        else:
            data = await _call_openai(image_bytes, media_type, meal_hint)
            label = f"OpenAI/{_openai_model()}"
        result = finalize_estimate(data, label)
        if result:
            return result
        return offline_estimate(meal_hint, memory_items)
    except Exception as exc:  # noqa: BLE001
        est = offline_estimate(meal_hint, memory_items)
        est["notes"] = f"Vision unavailable ({exc!s:.140}); offline fallback. " + (
            est.get("notes") or ""
        )
        return est
