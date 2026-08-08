import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, type Goal } from '../api'
import { CalendarGrid } from '../components/CalendarGrid'
import { FuelLogSheet } from '../components/FuelLogSheet'
import { GoalTabs } from '../components/GoalTabs'
import { KeySettings } from '../components/KeySettings'
import { MomentumGauge } from '../components/MomentumGauge'
import { FunkyIcon } from '../icons/FunkyIcon'
import { buildCalendar } from '../utils/calendar'
import './TrackerPage.css'

function parseGoalParam(raw: string | null): number | null {
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function TrackerPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const goalFromUrl = parseGoalParam(searchParams.get('goal'))

  const [goals, setGoals] = useState<Goal[]>([])
  const [activeId, setActiveId] = useState<number | null>(goalFromUrl)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [dayMealsOpen, setDayMealsOpen] = useState<string | null>(null)
  const [keyOpen, setKeyOpen] = useState(false)

  const selectGoal = useCallback(
    (id: number) => {
      setActiveId(id)
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('goal', String(id))
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const load = useCallback(async (preferId?: number | null) => {
    setError(null)
    try {
      const data = await api.listGoals()
      // Fuel first, then newest habit first so create never looks "lost" in the tab strip
      data.sort((a, b) => {
        if (a.kind === 'fuel' && b.kind !== 'fuel') return -1
        if (b.kind === 'fuel' && a.kind !== 'fuel') return 1
        const tb = b.created_at ? Date.parse(b.created_at) : 0
        const ta = a.created_at ? Date.parse(a.created_at) : 0
        if (tb !== ta) return tb - ta
        return (a.sort_order ?? 0) - (b.sort_order ?? 0) || b.id - a.id
      })
      setGoals(data)
      setActiveId((prev) => {
        const wanted = preferId ?? parseGoalParam(new URLSearchParams(window.location.search).get('goal'))
        if (wanted != null && data.some((g) => g.id === wanted)) return wanted
        if (prev != null && data.some((g) => g.id === prev)) return prev
        // Prefer fuel goal on first open (no explicit goal in URL)
        const fuel = data.find((g) => g.kind === 'fuel')
        return fuel?.id ?? data[0]?.id ?? null
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load goals')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(goalFromUrl)
  }, [load])

  // Deep-link: /?goal=id from a card or “Open tracker”
  useEffect(() => {
    if (goalFromUrl == null || goals.length === 0) return
    if (!goals.some((g) => g.id === goalFromUrl)) return
    setActiveId((prev) => {
      if (prev === goalFromUrl) return prev
      return goalFromUrl
    })
  }, [goalFromUrl, goals])

  useEffect(() => {
    setDayMealsOpen(null)
  }, [activeId])

  const detailed = useMemo(
    () => goals.find((g) => g.id === activeId) ?? null,
    [goals, activeId],
  )

  const isFuel = detailed?.kind === 'fuel'

  const completedSet = useMemo(() => {
    const set = new Set<string>()
    for (const c of detailed?.checkins ?? []) {
      if (c.completed) set.add(c.day)
    }
    // fuel: also mark days with meals
    if (detailed?.kind === 'fuel') {
      for (const m of detailed.meals ?? []) {
        set.add(m.day)
      }
    }
    return set
  }, [detailed])

  const kcalByDay = useMemo(() => {
    const map = new Map<string, number>()
    if (detailed?.kind !== 'fuel') return map
    for (const m of detailed.meals ?? []) {
      map.set(m.day, (map.get(m.day) || 0) + m.total_kcal_mid)
    }
    return map
  }, [detailed])

  const weeks = useMemo(() => {
    if (!detailed) return []
    return buildCalendar(detailed.start_date, detailed.duration_days, completedSet)
  }, [detailed, completedSet])

  const dayMeals = useMemo(() => {
    if (!detailed || !dayMealsOpen) return []
    return (detailed.meals ?? []).filter((m) => m.day === dayMealsOpen)
  }, [detailed, dayMealsOpen])

  async function handleToggle(dateStr: string) {
    if (!detailed || busy) return
    if (isFuel) {
      setDayMealsOpen(dateStr)
      return
    }
    setBusy(true)
    const wasDone = completedSet.has(dateStr)
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== detailed.id) return g
        const checkins = [...(g.checkins ?? [])]
        const idx = checkins.findIndex((c) => c.day === dateStr)
        if (idx >= 0) {
          checkins[idx] = { ...checkins[idx], completed: !wasDone }
        } else {
          checkins.push({
            id: -Date.now(),
            goal_id: g.id,
            day: dateStr,
            completed: true,
            sub_goal_id: null,
            note: '',
          })
        }
        return { ...g, checkins }
      }),
    )
    try {
      await api.toggleCheckin(detailed.id, dateStr, !wasDone)
      const refreshed = await api.getGoal(detailed.id)
      setGoals((prev) => prev.map((g) => (g.id === refreshed.id ? refreshed : g)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Toggle failed')
      await load(detailed.id)
    } finally {
      setBusy(false)
    }
  }

  async function deleteMeal(id: number) {
    if (!detailed) return
    try {
      await api.deleteMeal(id)
      await load(detailed.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  if (loading) {
    return (
      <div className="page tracker">
        <div className="state">loading tracker…</div>
      </div>
    )
  }

  if (error && goals.length === 0) {
    return (
      <div className="page tracker">
        <div className="state state--error">
          <p>Could not reach API.</p>
          <p className="state__detail">{error}</p>
          <button type="button" className="btn btn--primary" onClick={() => void load()}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (goals.length === 0) {
    return (
      <div className="page tracker">
        <header className="tracker__top">
          <h1 className="brand">daily.momentum</h1>
          <Link to="/goals" className="icon-btn" aria-label="Goals">
            +
          </Link>
        </header>
        <div className="state">
          <p>No goals yet.</p>
          <Link to="/goals/new" className="btn btn--primary">
            Create your first goal
          </Link>
        </div>
      </div>
    )
  }

  const eaten = detailed?.today_kcal_mid ?? 0
  const target = detailed?.fuel_target_kcal ?? 0
  const remaining = detailed?.today_remaining_mid
  const pct = target > 0 ? Math.min(100, Math.round((eaten / target) * 100)) : 0

  return (
    <div className="page tracker">
      <header className="tracker__top">
        <h1 className="brand">daily.momentum</h1>
        <div className="tracker__actions">
          <button
            type="button"
            className="icon-btn"
            aria-label="API key settings"
            title="Gemini API key"
            onClick={() => setKeyOpen(true)}
          >
            ⚙
          </button>
          <Link to="/goals" className="text-link">
            goals
          </Link>
          <Link to="/goals/new" className="icon-btn" aria-label="Add goal">
            +
          </Link>
        </div>
      </header>

      <GoalTabs goals={goals} activeId={activeId} onSelect={selectGoal} />

      {!isFuel && goals.some((g) => g.kind === 'fuel') && (
        <button
          type="button"
          className="fuel-jump"
          onClick={() => {
            const fuel = goals.find((g) => g.kind === 'fuel')
            if (fuel) {
              selectGoal(fuel.id)
              setLogOpen(true)
            }
          }}
        >
          <span className="fuel-jump__cam" aria-hidden>
            📷
          </span>
          <span>
            <strong>Photo calorie log</strong>
            <em>Tap for “Daily Fuel” · photograph your plate</em>
          </span>
          <span className="fuel-jump__go">Open →</span>
        </button>
      )}

      {detailed && (
        <>
          <MomentumGauge
            value={detailed.momentum}
            label={isFuel ? 'FUEL LOG' : detailed.status_label}
            accent={detailed.accent_color}
            streak={detailed.current_streak}
          />

          {isFuel && (
            <section className="fuel-today">
              <div className="fuel-today__hero">
                <p className="fuel-today__title">Today’s calories</p>
                <button
                  type="button"
                  className="btn btn--primary btn--block fuel-today__cta"
                  style={{ background: detailed.accent_color }}
                  onClick={() => setLogOpen(true)}
                >
                  📷 Photograph plate / log meal
                </button>
                <p className="fuel-today__hint">
                  {detailed.vision_configured
                    ? 'Gemini looks at your photo, then you confirm the kcal estimate'
                    : 'Add GEMINI_API_KEY in backend/.env for photo AI · pack search still works'}
                </p>
              </div>
              <div className="fuel-today__bar">
                <div
                  className="fuel-today__fill"
                  style={{ width: `${pct}%`, background: detailed.accent_color }}
                />
              </div>
              <div className="fuel-today__meta">
                <div>
                  <span className="fuel-today__eaten" style={{ color: detailed.accent_color }}>
                    ~{eaten}
                  </span>
                  <span className="fuel-today__of">
                    {' '}
                    / {target} kcal
                    {detailed.today_kcal_low != null && detailed.today_kcal_high != null
                      ? ` · range ${detailed.today_kcal_low}–${detailed.today_kcal_high}`
                      : ''}
                  </span>
                </div>
                <span className="fuel-today__rem">
                  {remaining == null
                    ? ''
                    : remaining >= 0
                      ? `${remaining} left`
                      : `${Math.abs(remaining)} over`}
                </span>
              </div>
              {(detailed.meals ?? [])
                .filter((m) => m.day === new Date().toISOString().slice(0, 10))
                .slice(0, 4)
                .map((m) => (
                  <div key={m.id} className="fuel-meal-row">
                    <span>
                      {m.items.map((i) => i.name).join(', ') || m.source}
                    </span>
                    <span>~{m.total_kcal_mid}</span>
                  </div>
                ))}
            </section>
          )}

          {!isFuel && detailed.sub_goals.length > 0 && (
            <div className="tracker__subs">
              {detailed.sub_goals.map((s) => (
                <span key={s.id} className="chip">
                  <FunkyIcon id={s.icon} size="xs" accent={detailed.accent_color} />
                  {s.title}
                </span>
              ))}
            </div>
          )}

          <CalendarGrid
            weeks={weeks}
            completionEmoji={detailed.completion_emoji}
            accent={detailed.accent_color}
            onToggle={handleToggle}
            busy={busy}
            kcalByDay={isFuel ? kcalByDay : undefined}
            fuelMode={isFuel}
          />

          <footer className="tracker__meta">
            <span>
              {isFuel
                ? `${detailed.completed_days} days logged · ${detailed.duration_days}d goal`
                : `${detailed.completed_days}/${detailed.duration_days} days`}
            </span>
            <Link to={`/goals/${detailed.id}`} className="text-link">
              customize →
            </Link>
          </footer>
        </>
      )}

      {keyOpen && (
        <KeySettings
          open={keyOpen}
          onClose={() => setKeyOpen(false)}
          onChanged={() => void load(activeId)}
        />
      )}

      {logOpen && detailed && isFuel && (
        <FuelLogSheet
          goalId={detailed.id}
          accent={detailed.accent_color}
          targetKcal={detailed.fuel_target_kcal || 2000}
          onClose={() => setLogOpen(false)}
          onConfirmed={async () => {
            setLogOpen(false)
            await load(detailed.id)
          }}
        />
      )}

      {dayMealsOpen && detailed && isFuel && (
        <div className="fuel-sheet" role="dialog" aria-modal>
          <div className="fuel-sheet__backdrop" onClick={() => setDayMealsOpen(null)} />
          <div className="fuel-sheet__panel">
            <header className="fuel-sheet__head">
              <div>
                <h2>{dayMealsOpen}</h2>
                <p>
                  Total ~
                  {(detailed.meals ?? [])
                    .filter((m) => m.day === dayMealsOpen)
                    .reduce((s, m) => s + m.total_kcal_mid, 0)}{' '}
                  kcal
                </p>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setDayMealsOpen(null)}
                aria-label="Close"
              >
                ×
              </button>
            </header>
            <div className="fuel-sheet__body">
              {dayMeals.length === 0 && (
                <p className="muted">No meals this day. Use Log plate for today.</p>
              )}
              {dayMeals.map((m) => (
                <div key={m.id} className="fuel-day-card">
                  <div className="fuel-day-card__top">
                    <strong>~{m.total_kcal_mid}</strong>
                    <span>
                      {m.total_kcal_low}–{m.total_kcal_high} · {m.source}
                    </span>
                    <button type="button" className="text-link" onClick={() => void deleteMeal(m.id)}>
                      delete
                    </button>
                  </div>
                  <ul>
                    {m.items.map((it) => (
                      <li key={it.id}>
                        {it.name} <span>{it.portion_desc}</span> — {it.kcal_mid} kcal
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {dayMealsOpen === new Date().toISOString().slice(0, 10) && (
                <button
                  type="button"
                  className="btn btn--primary btn--block"
                  style={{ background: detailed.accent_color }}
                  onClick={() => {
                    setDayMealsOpen(null)
                    setLogOpen(true)
                  }}
                >
                  Log another plate
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
