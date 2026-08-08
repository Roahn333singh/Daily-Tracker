import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, type Goal } from '../api'
import { FunkyIcon } from '../icons/FunkyIcon'
import { GoalIconPicker, StampIconPicker, SubIconPicker } from '../icons/IconPicker'
import { resolveIconId } from '../icons/catalog'
import './GoalFormPage.css'

const PRESET_COLORS = ['#2563EB', '#DC2626', '#16A34A', '#CA8A04', '#7C3AED', '#EA580C', '#0891B2', '#DB2777']

interface SubDraft {
  key: string
  title: string
  icon: string
}

const emptySub = (): SubDraft => ({
  key: crypto.randomUUID(),
  title: '',
  icon: 'sub-dot',
})

export function GoalFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeSubKey, setActiveSubKey] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('target-wobble')
  const [duration, setDuration] = useState(30)
  const [accent, setAccent] = useState('#2563EB')
  const [completionEmoji, setCompletionEmoji] = useState('stamp-orbit')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [subGoals, setSubGoals] = useState<SubDraft[]>([])
  const [existing, setExisting] = useState<Goal | null>(null)
  const [kind, setKind] = useState<'habit' | 'fuel'>('habit')
  const [fuelTarget, setFuelTarget] = useState(2200)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      try {
        const g = await api.getGoal(Number(id))
        if (cancelled) return
        setExisting(g)
        setTitle(g.title)
        setDescription(g.description)
        setIcon(resolveIconId(g.icon))
        setDuration(g.duration_days)
        setAccent(g.accent_color)
        setCompletionEmoji(resolveIconId(g.completion_emoji))
        setStartDate(g.start_date)
        setKind(g.kind === 'fuel' ? 'fuel' : 'habit')
        setFuelTarget(g.fuel_target_kcal ?? 2200)
        setSubGoals(
          g.sub_goals.map((s) => ({
            key: String(s.id),
            title: s.title,
            icon: resolveIconId(s.icon),
          })),
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load goal')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  function updateSub(key: string, patch: Partial<SubDraft>) {
    setSubGoals((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)))
  }

  function removeSub(key: string) {
    setSubGoals((prev) => prev.filter((s) => s.key !== key))
    if (activeSubKey === key) setActiveSubKey(null)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (kind === 'fuel' && (!fuelTarget || fuelTarget < 500)) {
      setError('Set a daily calorie target (min 500)')
      return
    }
    setSaving(true)
    setError(null)
    const payload = {
      title: title.trim(),
      description: description.trim(),
      icon,
      duration_days: duration,
      accent_color: accent,
      completion_emoji: completionEmoji,
      start_date: startDate,
      kind,
      fuel_target_kcal: kind === 'fuel' ? fuelTarget : null,
      sub_goals:
        kind === 'fuel'
          ? []
          : subGoals
              .filter((s) => s.title.trim())
              .map((s, i) => ({
                title: s.title.trim(),
                icon: s.icon || 'sub-dot',
                sort_order: i,
              })),
    }
    try {
      if (isEdit && id) {
        await api.updateGoal(Number(id), payload)
        navigate(`/goals/${id}`)
      } else {
        const created = await api.createGoal(payload)
        if (!created?.id) {
          setError('Create succeeded but no goal id returned')
          return
        }
        // Land on tracker with this goal selected so it cannot “vanish” behind Fuel tab
        navigate(`/?goal=${created.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    if (!id || !existing) return
    if (!confirm(`Delete “${existing.title}”? This cannot be undone.`)) return
    setSaving(true)
    try {
      await api.deleteGoal(Number(id))
      navigate('/goals')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page form-page">
        <p className="muted pad">loading…</p>
      </div>
    )
  }

  return (
    <div className="page form-page">
      <header className="sheet-header">
        <h1 className="sheet-header__title">{isEdit ? 'Edit goal' : 'New goal'}</h1>
        <Link to={isEdit && id ? `/goals/${id}` : '/goals'} className="close-btn" aria-label="Close">
          ×
        </Link>
      </header>

      <form className="form" onSubmit={onSubmit}>
        <div className="preview-bar">
          <FunkyIcon id={icon} size="lg" accent={accent} />
          <div className="preview-bar__meta">
            <span className="preview-bar__title">{title || 'Your goal'}</span>
            <span className="preview-bar__sub">stamp preview</span>
          </div>
          <FunkyIcon id={completionEmoji} size="md" accent={accent} stamp />
        </div>

        <label className="field">
          <span>Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. 100 Days of LeetCode"
            maxLength={200}
            required
          />
        </label>

        <div className="field">
          <span>Goal type</span>
          <div className="kind-toggle">
            <button
              type="button"
              className={`kind-toggle__btn ${kind === 'habit' ? 'is-on' : ''}`}
              onClick={() => setKind('habit')}
            >
              Habit stamp
            </button>
            <button
              type="button"
              className={`kind-toggle__btn ${kind === 'fuel' ? 'is-on' : ''}`}
              onClick={() => {
                setKind('fuel')
                setIcon('coffee-ripple')
                setAccent('#059669')
                setCompletionEmoji('stamp-bloom')
              }}
            >
              Calorie / fuel
            </button>
          </div>
          <p className="hint">
            {kind === 'fuel'
              ? 'Photo plates, estimate calories with ranges, track vs daily target.'
              : 'Binary daily stamps + momentum calendar.'}
          </p>
        </div>

        {kind === 'fuel' && (
          <label className="field">
            <span>Daily calorie target</span>
            <input
              type="number"
              min={500}
              max={10000}
              value={fuelTarget}
              onChange={(e) => setFuelTarget(Number(e.target.value) || 0)}
            />
          </label>
        )}

        <label className="field">
          <span>Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What are you going for?"
            rows={3}
          />
        </label>

        <div className="field">
          <GoalIconPicker value={icon} onChange={setIcon} accent={accent} label="Funky goal icon" />
        </div>

        <div className="field-row">
          <label className="field">
            <span>Duration (days)</span>
            <input
              type="number"
              min={1}
              max={3650}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) || 1)}
            />
          </label>
          <label className="field">
            <span>Start date</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
        </div>

        <div className="field">
          <span>Accent color</span>
          <div className="pick-grid pick-grid--color">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`pick pick--color ${accent === c ? 'is-on' : ''}`}
                style={{ background: c }}
                onClick={() => setAccent(c)}
                aria-label={c}
              />
            ))}
          </div>
          <input
            type="color"
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
            className="color-input"
          />
        </div>

        <div className="field">
          <StampIconPicker
            value={completionEmoji}
            onChange={setCompletionEmoji}
            accent={accent}
            label="Done-day stamp (calendar fill)"
          />
        </div>

        {kind === 'habit' && (
        <div className="field">
          <div className="field__head">
            <span>Sub-goals</span>
            <button
              type="button"
              className="text-link"
              onClick={() => {
                const s = emptySub()
                setSubGoals((p) => [...p, s])
                setActiveSubKey(s.key)
              }}
            >
              + add
            </button>
          </div>
          {subGoals.length === 0 && (
            <p className="hint">Optional. Split big goals into swim / bike / run, habits, etc.</p>
          )}
          <div className="sub-list">
            {subGoals.map((s) => (
              <div key={s.key} className="sub-block">
                <div className="sub-row">
                  <button
                    type="button"
                    className="sub-icon-btn"
                    onClick={() => setActiveSubKey(activeSubKey === s.key ? null : s.key)}
                    title="Pick icon"
                  >
                    <FunkyIcon id={s.icon} size="sm" accent={accent} />
                  </button>
                  <input
                    className="sub-title"
                    value={s.title}
                    onChange={(e) => updateSub(s.key, { title: e.target.value })}
                    placeholder="Sub-goal title"
                  />
                  <button type="button" className="sub-remove" onClick={() => removeSub(s.key)} aria-label="Remove">
                    ×
                  </button>
                </div>
                {activeSubKey === s.key && (
                  <div className="sub-picker">
                    <SubIconPicker
                      value={s.icon}
                      onChange={(nid) => updateSub(s.key, { icon: nid })}
                      accent={accent}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        )}

        {error && <p className="error">{error}</p>}

        <button type="submit" className="btn btn--primary btn--block" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create goal'}
        </button>

        {isEdit && (
          <button type="button" className="btn btn--danger btn--block" onClick={() => void onDelete()} disabled={saving}>
            Delete goal
          </button>
        )}
      </form>
    </div>
  )
}
