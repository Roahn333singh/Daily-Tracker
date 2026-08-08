import { FunkyIcon } from './FunkyIcon'
import { GOAL_ICONS, STAMP_ICONS, SUB_ICONS, type IconDef } from './catalog'
import './IconPicker.css'

interface Props {
  icons: IconDef[]
  value: string
  onChange: (id: string) => void
  accent?: string
  label?: string
  compact?: boolean
}

export function IconPicker({ icons, value, onChange, accent, label, compact }: Props) {
  return (
    <div className={`ipick ${compact ? 'is-compact' : ''}`}>
      {label && <span className="ipick__label">{label}</span>}
      <div className="ipick__grid" role="listbox" aria-label={label ?? 'Icons'}>
        {icons.map((ic) => {
          const on = value === ic.id
          return (
            <button
              key={ic.id}
              type="button"
              role="option"
              aria-selected={on}
              title={ic.label}
              className={`ipick__btn ${on ? 'is-on' : ''}`}
              onClick={() => onChange(ic.id)}
            >
              <FunkyIcon id={ic.id} size={compact ? 'sm' : 'md'} accent={accent} />
              {!compact && <span className="ipick__name">{ic.label}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function GoalIconPicker(props: Omit<Props, 'icons'>) {
  return <IconPicker icons={GOAL_ICONS} {...props} />
}

export function StampIconPicker(props: Omit<Props, 'icons'>) {
  return <IconPicker icons={STAMP_ICONS} {...props} />
}

export function SubIconPicker(props: Omit<Props, 'icons'>) {
  return <IconPicker icons={SUB_ICONS} compact {...props} />
}
