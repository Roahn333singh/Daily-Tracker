import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type Goal } from '../api'
import { GoalCard } from '../components/GoalCard'
import './GoalsPage.css'

export function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      setGoals(await api.listGoals())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="page goals-page">
      <header className="sheet-header">
        <h1 className="sheet-header__title">Add new goal</h1>
        <Link to="/" className="close-btn" aria-label="Close">
          ×
        </Link>
      </header>

      <div className="goals-page__list">
        {loading && <p className="muted pad">loading…</p>}
        {error && <p className="error pad">{error}</p>}
        {!loading &&
          goals.map((g, i) => (
            <div key={g.id} style={{ animationDelay: `${i * 40}ms` }}>
              <GoalCard goal={g} />
            </div>
          ))}
      </div>

      <div className="goals-page__cta">
        <Link to="/goals/new" className="btn btn--primary btn--block">
          + Create custom goal
        </Link>
      </div>
    </div>
  )
}
