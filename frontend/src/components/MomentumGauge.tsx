import './MomentumGauge.css'

interface Props {
  value: number
  label: string
  accent: string
  streak: number
}

export function MomentumGauge({ value, label, accent, streak }: Props) {
  const bars = 48
  const filled = Math.round((Math.min(100, Math.max(0, value)) / 100) * bars)

  return (
    <section className="momentum" aria-label={`Momentum ${value}, ${label}`}>
      <h2 className="momentum__title">MOMENTUM</h2>
      <div className="momentum__ring-wrap">
        <div className="momentum__ring" style={{ ['--accent' as string]: accent }}>
          {Array.from({ length: bars }, (_, i) => {
            const angle = (i / bars) * 360
            const isFilled = i < filled
            return (
              <span
                key={i}
                className={`momentum__bar ${isFilled ? 'is-filled' : ''}`}
                style={{
                  transform: `rotate(${angle}deg) translateY(-78px)`,
                  background: isFilled ? accent : 'rgba(0,0,0,0.08)',
                }}
              />
            )
          })}
          <div className="momentum__center">
            <span className="momentum__value" style={{ color: accent }}>
              {value}
            </span>
            <span className="momentum__status" style={{ color: accent }}>
              {label}
            </span>
            {streak > 0 && (
              <span className="momentum__streak">{streak}d streak</span>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
