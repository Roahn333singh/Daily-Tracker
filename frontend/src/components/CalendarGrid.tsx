import type { WeekRow } from '../utils/calendar'
import { FunkyIcon } from '../icons/FunkyIcon'
import './CalendarGrid.css'

interface Props {
  weeks: WeekRow[]
  completionEmoji: string
  accent: string
  onToggle: (dateStr: string) => void
  busy?: boolean
  kcalByDay?: Map<string, number>
  fuelMode?: boolean
}

const HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function CalendarGrid({
  weeks,
  completionEmoji,
  accent,
  onToggle,
  busy,
  kcalByDay,
  fuelMode,
}: Props) {
  return (
    <section className="cal" aria-label="Daily check-in calendar">
      <div className="cal__head">
        <div className="cal__week-gutter" />
        {HEADERS.map((h) => (
          <div key={h} className="cal__dow">
            {h}
          </div>
        ))}
      </div>

      <div className="cal__body">
        {weeks.map((week) => (
          <div key={week.label} className="cal__row">
            <div
              className={`cal__week-label ${week.isCurrentWeek ? 'is-current' : ''}`}
              style={
                week.isCurrentWeek
                  ? { background: accent, borderColor: accent }
                  : undefined
              }
            >
              {week.label}
            </div>
            {week.days.map((day, i) => {
              if (!day || !day.inRange) {
                return <div key={i} className="cal__cell is-empty" />
              }
              const done = day.completed
              const kcal = kcalByDay?.get(day.dateStr)
              const disabled = day.isFuture || busy
              return (
                <button
                  key={day.dateStr}
                  type="button"
                  className={[
                    'cal__cell',
                    done ? 'is-done' : '',
                    day.isToday ? 'is-today' : '',
                    day.isFuture ? 'is-future' : '',
                    fuelMode && kcal ? 'is-fuel' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={
                    day.isToday && !done
                      ? { borderColor: accent, boxShadow: `inset 0 0 0 1.5px ${accent}` }
                      : fuelMode && kcal
                        ? {
                            background: `${accent}22`,
                            borderColor: `${accent}55`,
                          }
                        : undefined
                  }
                  disabled={disabled}
                  onClick={() => onToggle(day.dateStr)}
                  aria-label={
                    fuelMode
                      ? `${day.dateStr}${kcal ? `, ~${kcal} kcal` : ', no meals'}`
                      : `${day.dateStr}${done ? ' completed' : ' incomplete'}. Tap to toggle.`
                  }
                >
                  {fuelMode ? (
                    kcal ? (
                      <span className="cal__kcal" style={{ color: accent }}>
                        {kcal >= 1000 ? `${(kcal / 1000).toFixed(1)}k` : kcal}
                      </span>
                    ) : (
                      <span className="cal__num">{day.dayOfMonth}</span>
                    )
                  ) : done ? (
                    <span className="cal__stamp" aria-hidden>
                      <FunkyIcon
                        id={completionEmoji}
                        size="stamp"
                        accent={accent}
                        stamp
                      />
                    </span>
                  ) : (
                    <span className="cal__num">{day.dayOfMonth}</span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      <p className="cal__hint">
        {fuelMode
          ? 'Tap a day to view meals · Log plate to estimate calories'
          : 'Tap a day to mark it done · future days stay locked'}
      </p>
    </section>
  )
}
