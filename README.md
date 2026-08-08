# Daily Momentum Tracker

A customizable daily goal tracker inspired by those crisp, monospaced “momentum + calendar stamp” tracker UIs — built for **web and mobile browsers**.

## What’s in the app

| Screen | What it does |
|--------|----------------|
| **Tracker** (`/`) | Horizontal goal tabs, circular **MOMENTUM** gauge, week × weekday grid. Tap a day to stamp it done. |
| **Goals list** (`/goals`) | Card list of all goals (icon, duration, description, sub-goals). |
| **Create / edit** | Full customization: title, description, icon, duration, start date, accent color, completion emoji, sub-goals. |
| **Goal detail** | Quick add/remove sub-goals, jump to edit or tracker. |

### Theme (from the screenshots)

- Warm cream background, white soft-border cards  
- **IBM Plex Mono** body + **Space Grotesk** display (techy / funky mono feel)  
- Electric blue accent (per-goal color override)  
- Completion cells show a **custom emoji stamp** instead of a checkmark  

## Stack

- **Backend:** FastAPI + SQLAlchemy + SQLite  
- **Frontend:** React 19 + TypeScript + Vite  

## Deploy (DigitalOcean)

See **[deploy/DIGITALOCEAN.md](deploy/DIGITALOCEAN.md)** for a full Droplet walkthrough.

Quick path:

```bash
# On a DO Ubuntu droplet with Docker:
git clone <your-repo> /opt/daily-tracker
cd /opt/daily-tracker
# put GEMINI_API_KEY in backend/.env
docker compose up -d --build
# open http://YOUR_DROPLET_IP
```

Local containers:

```bash
docker compose up -d --build
# open http://localhost
```

## Run locally

### 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs: http://127.0.0.1:8000/docs  

On first start, the DB is seeded with sample goals (Study 6h, Ironman, LeetCode, etc.).

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://127.0.0.1:5173 — the Vite dev server proxies `/api` to port 8000.

### Optional: one-shot from project root

```bash
# terminal 1
cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000

# terminal 2
cd frontend && npm run dev
```

## Calorie goals (photo estimate)

Fuel goals let you **photograph a plate**, get a **kcal mid + range** breakdown, **edit**, then **confirm** against a daily target.

### How logging works

1. Open the **Daily Fuel 2200** tab (or create a *Calorie / fuel* goal)
2. Tap **Log plate** → camera / gallery (or skip photo)
3. **Estimate from photo** (needs `VISION_API_KEY` / `OPENAI_API_KEY`) or **Offline only**
4. Edit items/portions → **Confirm**
5. Day total vs target appears under momentum; calendar shows kcal

### Online vision setup (Gemini recommended)

1. Get a key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Create `backend/.env`:

```bash
cd backend
cp .env.example .env
# edit .env — set GEMINI_API_KEY=...
```

```env
GEMINI_API_KEY=your-key-here
# optional model:
# VISION_MODEL=gemini-2.5-flash
```

3. Restart the API. `/api/health` should show `"vision_configured": true, "vision_provider": "gemini"`.

Also accepted env names: `GOOGLE_API_KEY`, `GOOGLE_AI_API_KEY`.

**OpenAI** still works if you set `OPENAI_API_KEY` or `VISION_API_KEY` instead (without a Gemini key).

Without any key, **offline cascade** still works: personal food memory → local food pack → manual entry.

### Fuel APIs

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/fuel/estimate` | Multipart image + optional `meal_hint` |
| GET | `/api/fuel/estimate-offline` | Pack/memory suggestions only |
| GET | `/api/fuel/food-pack` | Search offline catalog |
| GET | `/api/fuel/memory` | Your corrected foods |
| POST | `/api/goals/{id}/meals` | Confirm meal log |
| GET | `/api/goals/{id}/fuel/day` | Day totals + meals |


## API sketch

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/goals` | List goals + checkins + momentum |
| POST | `/api/goals` | Create goal (+ sub-goals) |
| GET/PATCH/DELETE | `/api/goals/{id}` | Read / update / delete |
| POST | `/api/goals/{id}/checkins` | Toggle a day’s completion |
| POST | `/api/goals/{id}/sub-goals` | Add sub-goal |
| DELETE | `/api/sub-goals/{id}` | Remove sub-goal |

## Momentum score

- Looks at the last **min(duration, 28)** days  
- Score ≈ % of those days completed (0–100)  
- Labels: `IDLE` → `RISING` → `WARMING` → `COOLING` → `ON FIRE`  
- Streak ≥ 7 days bumps the feel toward **ON FIRE**  

## Mobile

- Responsive single-column layout, safe-area padding, tap targets on calendar cells  
- Add to Home Screen from Safari / Chrome for an app-like shell  

## Project layout

```
backend/
  app/main.py          # FastAPI routes
  app/models.py        # Goal, SubGoal, DayCheckin
  app/services.py      # Momentum + seed data
frontend/
  src/pages/           # Tracker, goals list, form, detail
  src/components/      # Gauge, calendar, tabs, cards
```
