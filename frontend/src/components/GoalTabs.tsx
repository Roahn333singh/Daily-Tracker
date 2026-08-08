import type { Goal } from '../api'
import { FunkyIcon } from '../icons/FunkyIcon'
import './GoalTabs.css'

interface Props {
  goals: Goal[]
  activeId: number | null
  onSelect: (id: number) => void
}

export function GoalTabs({ goals, activeId, onSelect }: Props) {
  const active = goals.find((g) => g.id === activeId)
  const activeIndex = goals.findIndex((g) => g.id === activeId)

  return (
    <div className="tabs">
      <div className="tabs__scroll" role="tablist" aria-label="Goals">
        {goals.map((g) => {
          const selected = g.id === activeId
          const isFuel = g.kind === 'fuel'
          return (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`tabs__item ${selected ? 'is-active' : ''} ${isFuel ? 'is-fuel' : ''}`}
              style={
                selected
                  ? {
                      borderBottomColor: g.accent_color,
                      color: '#111',
                    }
                  : isFuel
                    ? { color: g.accent_color }
                    : undefined
              }
              onClick={() => onSelect(g.id)}
            >
              <span className="tabs__icon">
                <FunkyIcon id={g.icon} size="sm" accent={g.accent_color} />
              </span>
              <span className="tabs__title">{g.title}</span>
              {isFuel && <span className="tabs__badge">kcal</span>}
            </button>
          )
        })}
      </div>
      {goals.length > 1 && (
        <div className="tabs__dots" aria-hidden>
          {goals.map((g, i) => (
            <span
              key={g.id}
              className={`tabs__dot ${i === activeIndex ? 'is-active' : ''}`}
              style={
                i === activeIndex && active
                  ? { background: active.accent_color }
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
