import { Link } from 'react-router-dom'
import type { Goal } from '../api'
import { FunkyIcon } from '../icons/FunkyIcon'
import './GoalCard.css'

interface Props {
  goal: Goal
  onSelect?: () => void
}

export function GoalCard({ goal, onSelect }: Props) {
  const content = (
    <>
      <div className="gcard__icon" aria-hidden>
        <FunkyIcon id={goal.icon} size="lg" accent={goal.accent_color} />
      </div>
      <div className="gcard__body">
        <div className="gcard__top">
          <h3 className="gcard__title">{goal.title}</h3>
          <span className="gcard__duration">
            <ClockIcon />
            {goal.duration_days}d
          </span>
          <span className="gcard__chev" aria-hidden>
            ›
          </span>
        </div>
        <p className="gcard__desc">{goal.description}</p>
        {goal.sub_goals?.length > 0 && (
          <div className="gcard__subs">
            <div className="gcard__sub-icons">
              {goal.sub_goals.slice(0, 5).map((s) => (
                <span key={s.id} title={s.title} className="gcard__sub-icon">
                  <FunkyIcon id={s.icon} size="xs" accent={goal.accent_color} />
                </span>
              ))}
            </div>
            <span className="gcard__sub-count">
              {goal.sub_goals.length} sub-goal
              {goal.sub_goals.length === 1 ? '' : 's'}
            </span>
          </div>
        )}
      </div>
    </>
  )

  if (onSelect) {
    return (
      <button type="button" className="gcard" onClick={onSelect}>
        {content}
      </button>
    )
  }

  return (
    <Link to={`/goals/${goal.id}`} className="gcard">
      {content}
    </Link>
  )
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
