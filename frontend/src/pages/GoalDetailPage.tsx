import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, type Goal } from '../api'
import { FunkyIcon } from '../icons/FunkyIcon'
import { SubIconPicker } from '../icons/IconPicker'
import './GoalDetailPage.css'

export function GoalDetailPage() {
  const { id } = useParams()
  const [goal, setGoal] = useState<Goal | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [newSub, setNewSub] = useState('')
  const [newSubIcon, setNewSubIcon] = useState('sub-dot')
  const [busy, setBusy] = useState(false)
  const [showSubIcons, setShowSubIcons] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    try {
      setError(null)
      setGoal(await api.getGoal(Number(id)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function addSub() {
    if (!goal || !newSub.trim() || busy) return
    setBusy(true)
    try {
      await api.addSubGoal(goal.id, newSub.trim(), newSubIcon)
      setNewSub('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add sub-goal')
    } finally {
      setBusy(false)
    }
  }

  async function removeSub(subId: number) {
    if (!goal || busy) return
    setBusy(true)
    try {
      await api.deleteSubGoal(subId)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="page detail">
        <p className="muted pad">loading…</p>
      </div>
    )
  }

  if (!goal) {
    return (
      <div className="page detail">
        <header className="sheet-header">
          <h1 className="sheet-header__title">Goal</h1>
          <Link to="/goals" className="close-btn" aria-label="Close">
            ×
          </Link>
        </header>
        <p className="error pad">{error ?? 'Not found'}</p>
      </div>
    )
  }

  return (
    <div className="page detail">
      <header className="sheet-header">
        <h1 className="sheet-header__title">Goal</h1>
        <Link to="/goals" className="close-btn" aria-label="Close">
          ×
        </Link>
      </header>

      <div className="detail__hero">
        <div className="detail__icon" style={{ boxShadow: `0 0 0 3px ${goal.accent_color}22` }}>
          <FunkyIcon id={goal.icon} size="lg" accent={goal.accent_color} />
        </div>
        <h2 className="detail__title">{goal.title}</h2>
        <p className="detail__desc">{goal.description || 'No description'}</p>
        <div className="detail__stats">
          <span>
            <Clock /> {goal.duration_days}d
          </span>
          <span style={{ color: goal.accent_color }}>
            momentum {goal.momentum} · {goal.status_label}
          </span>
          <span className="detail__stamp-preview">
            stamp <FunkyIcon id={goal.completion_emoji} size="xs" accent={goal.accent_color} />
          </span>
        </div>
      </div>

      <section className="detail__section">
        <div className="detail__section-head">
          <h3>Sub-goals</h3>
          <span className="muted">{goal.sub_goals.length}</span>
        </div>
        <ul className="detail__subs">
          {goal.sub_goals.map((s) => (
            <li key={s.id}>
              <span className="detail__sub-icon">
                <FunkyIcon id={s.icon} size="sm" accent={goal.accent_color} />
              </span>
              <span className="detail__sub-title">{s.title}</span>
              <button type="button" className="text-link" onClick={() => void removeSub(s.id)} disabled={busy}>
                remove
              </button>
            </li>
          ))}
          {goal.sub_goals.length === 0 && <li className="muted">No sub-goals yet.</li>}
        </ul>
        <div className="detail__add-sub">
          <button
            type="button"
            className="detail__sub-icon-btn"
            onClick={() => setShowSubIcons((v) => !v)}
            aria-label="Pick sub-goal icon"
          >
            <FunkyIcon id={newSubIcon} size="sm" accent={goal.accent_color} />
          </button>
          <input
            value={newSub}
            onChange={(e) => setNewSub(e.target.value)}
            placeholder="Add a sub-goal…"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void addSub()
              }
            }}
          />
          <button type="button" className="btn btn--primary" onClick={() => void addSub()} disabled={busy}>
            Add
          </button>
        </div>
        {showSubIcons && (
          <div className="detail__sub-picker">
            <SubIconPicker
              value={newSubIcon}
              onChange={(nid) => {
                setNewSubIcon(nid)
                setShowSubIcons(false)
              }}
              accent={goal.accent_color}
            />
          </div>
        )}
      </section>

      {error && <p className="error pad">{error}</p>}

      <div className="detail__actions">
        <Link to={`/goals/${goal.id}/edit`} className="btn btn--primary btn--block">
          Edit goal
        </Link>
        <Link to={`/?goal=${goal.id}`} className="btn btn--ghost btn--block">
          Open tracker
        </Link>
      </div>
    </div>
  )
}

function Clock() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden style={{ verticalAlign: '-1px' }}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
