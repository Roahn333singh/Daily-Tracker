"""Photo / offline meal calorie estimation.

Supports Google Gemini (default when GEMINI_API_KEY is set) and OpenAI-compatible APIs.
"""

from __future__ import annotations

import base64
import json
import os
import re
from typing import Any, Literal

import httpx

from . import models
from .food_pack import ground_item, item_from_pack, search_food_pack, suggest_from_hint

VISION_SYSTEM = """You are a nutrition estimator for plate photos.
Return ONLY valid JSON (no markdown) with this shape:
{
  "items": [
    {
      "name": "food name",
      "portion_desc": "e.g. 2 medium / 1 cup",
      "grams_est": 120,
      "kcal_low": 180,
      "kcal_mid": 220,
      "kcal_high": 280,
      "confidence": 0.0-1.0
    }
  ],
  "notes": "short uncertainty note (oil, hidden sauces, etc.)",
  "overall_confidence": 0.0-1.0
}
Rules:
- Break the plate into discrete edible items (not utensils/plates).
- Prefer realistic home/restaurant portions.
- Always provide a range (low/mid/high); do not fake perfect precision.
- If unsure, lower confidence and widen the range.
- Use common names; Indian and global foods OK.
"""

Provider = Literal["gemini", "openai"]


def _gemini_key() -> str | None:
    return os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or os.getenv("GOOGLE_AI_API_KEY")


def _openai_key() -> str | None:
    return os.getenv("VISION_API_KEY") or os.getenv("OPENAI_API_KEY")


def vision_provider() -> Provider | None:
    """Prefer explicit VISION_PROVIDER, else Gemini if key present, else OpenAI."""
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
    # model sometimes wraps extra prose
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
    """No vision: memory hits + food pack suggestions."""
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
                    }
                )
                source = "memory"
        if items:
            low, mid, high, conf = _sum_items(items)
            return {
                "source": source,
                "items": items[:8],
                "notes": "Offline: matched your personal food memory.",
                "overall_confidence": conf,
                "total_kcal_low": low,
                "total_kcal_mid": mid,
                "total_kcal_high": high,
                "vision_used": False,
            }

    if memory_items and not meal_hint:
        top = sorted(memory_items, key=lambda m: m.use_count, reverse=True)[:3]
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
                }
            )
        if items:
            low, mid, high, conf = _sum_items(items)
            return {
                "source": "memory",
                "items": items,
                "notes": "Offline: suggested from your most-logged foods. Edit freely.",
                "overall_confidence": conf,
                "total_kcal_low": low,
                "total_kcal_mid": mid,
                "total_kcal_high": high,
                "vision_used": False,
            }

    items = suggest_from_hint(meal_hint)
    if meal_hint and not items:
        for e in search_food_pack(meal_hint, limit=4):
            items.append(item_from_pack(e))

    if not items:
        items = suggest_from_hint("lunch")

    low, mid, high, conf = _sum_items(items)
    return {
        "source": "catalog",
        "items": items,
        "notes": "Vision offline or unavailable. Suggested from local food pack — edit portions before confirming.",
        "overall_confidence": conf * 0.85,
        "total_kcal_low": low,
        "total_kcal_mid": mid,
        "total_kcal_high": high,
        "vision_used": False,
    }


def _parse_items_payload(data: dict[str, Any]) -> list[dict[str, Any]]:
    raw_items = data.get("items") or []
    items = []
    for raw in raw_items:
        item = {
            "name": str(raw.get("name") or "food"),
            "portion_desc": str(raw.get("portion_desc") or ""),
            "grams_est": raw.get("grams_est"),
            "kcal_low": int(raw.get("kcal_low") or 0),
            "kcal_mid": int(raw.get("kcal_mid") or 0),
            "kcal_high": int(raw.get("kcal_high") or 0),
            "confidence": float(raw.get("confidence") or 0.5),
            "from_memory": False,
        }
        if item["kcal_mid"] <= 0 and item["kcal_low"]:
            item["kcal_mid"] = int((item["kcal_low"] + item["kcal_high"]) / 2)
        items.append(ground_item(item))
    return items


def _success_from_data(data: dict[str, Any], provider_label: str) -> dict[str, Any] | None:
    items = _parse_items_payload(data)
    if not items:
        return None
    low, mid, high, conf = _sum_items(items)
    overall = float(data.get("overall_confidence") or conf)
    return {
        "source": "vision",
        "items": items,
        "notes": str(
            data.get("notes")
            or f"{provider_label} estimate — ranges reflect portion uncertainty."
        ),
        "overall_confidence": overall,
        "total_kcal_low": low,
        "total_kcal_mid": mid,
        "total_kcal_high": high,
        "vision_used": True,
    }


async def _call_gemini(
    image_bytes: bytes,
    media_type: str,
    meal_hint: str | None,
) -> dict[str, Any]:
    key = _gemini_key()
    assert key
    model = _gemini_model()
    b64 = base64.b64encode(image_bytes).decode("ascii")
    user_text = "Estimate calories for foods visible on this plate."
    if meal_hint:
        user_text += f" Meal context: {meal_hint}."
    user_text += " Respond with JSON only."

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={key}"
    )
    payload = {
        "systemInstruction": {"parts": [{"text": VISION_SYSTEM}]},
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
            "temperature": 0.2,
            "responseMimeType": "application/json",
        },
    }

    async with httpx.AsyncClient(timeout=90.0) as client:
        res = await client.post(url, json=payload)
        if res.status_code >= 400:
            raise RuntimeError(f"Gemini HTTP {res.status_code}: {res.text[:200]}")
        body = res.json()

    # Handle blocked / empty candidates
    candidates = body.get("candidates") or []
    if not candidates:
        raise RuntimeError(f"Gemini returned no candidates: {body.get('promptFeedback')}")
    parts = candidates[0].get("content", {}).get("parts") or []
    text = "".join(p.get("text", "") for p in parts if "text" in p)
    if not text:
        raise RuntimeError("Gemini response empty")
    return _extract_json(text)


async def _call_openai(
    image_bytes: bytes,
    media_type: str,
    meal_hint: str | None,
) -> dict[str, Any]:
    key = _openai_key()
    assert key
    b64 = base64.b64encode(image_bytes).decode("ascii")
    data_url = f"data:{media_type};base64,{b64}"
    user_text = "Estimate calories for foods visible on this plate."
    if meal_hint:
        user_text += f" Meal context: {meal_hint}."

    payload = {
        "model": _openai_model(),
        "temperature": 0.2,
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
    async with httpx.AsyncClient(timeout=60.0) as client:
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
            data = await _call_gemini(image_bytes, media_type, meal_hint)
            label = f"Gemini ({_gemini_model()})"
        else:
            data = await _call_openai(image_bytes, media_type, meal_hint)
            label = f"OpenAI ({_openai_model()})"
        result = _success_from_data(data, label)
        if result:
            return result
        return offline_estimate(meal_hint, memory_items)
    except Exception as exc:  # noqa: BLE001
        est = offline_estimate(meal_hint, memory_items)
        est["notes"] = f"Vision unavailable ({exc!s:.120}); offline fallback. " + (
            est.get("notes") or ""
        )
        return est
