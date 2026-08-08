/** Build week rows between start and end (inclusive of goal duration window). */

export interface CalendarDay {
  date: Date
  dateStr: string
  dayOfMonth: number
  inRange: boolean
  isFuture: boolean
  isToday: boolean
  completed: boolean
}

export interface WeekRow {
  label: string
  monthShort: string
  weekIndex: number
  isCurrentWeek: boolean
  days: (CalendarDay | null)[]
}

const DAY_MS = 24 * 60 * 60 * 1000

export function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function startOfWeekMonday(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = copy.getDay()
  const diff = day === 0 ? -6 : 1 - day
  copy.setDate(copy.getDate() + diff)
  return copy
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function buildCalendar(
  startDateStr: string,
  durationDays: number,
  completedSet: Set<string>,
  today = new Date(),
): WeekRow[] {
  const start = parseDate(startDateStr)
  const end = new Date(start.getTime() + (durationDays - 1) * DAY_MS)
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  let cursor = startOfWeekMonday(start)
  const last = startOfWeekMonday(end)
  // include the week containing end
  const weekEnd = new Date(last.getTime() + 6 * DAY_MS)

  const rows: WeekRow[] = []
  let weekIndex = 0
  const currentWeekStart = startOfWeekMonday(todayMid)

  while (cursor.getTime() <= weekEnd.getTime()) {
    const days: (CalendarDay | null)[] = []
    let monthForLabel = cursor
    let anyInRange = false

    for (let i = 0; i < 7; i++) {
      const cell = new Date(cursor.getTime() + i * DAY_MS)
      const dateStr = toDateStr(cell)
      const inRange = cell.getTime() >= start.getTime() && cell.getTime() <= end.getTime()
      if (inRange) {
        anyInRange = true
        monthForLabel = cell
      }
      days.push({
        date: cell,
        dateStr,
        dayOfMonth: cell.getDate(),
        inRange,
        isFuture: cell.getTime() > todayMid.getTime(),
        isToday: cell.getTime() === todayMid.getTime(),
        completed: completedSet.has(dateStr),
      })
    }

    if (anyInRange) {
      weekIndex += 1
      const isCurrentWeek = cursor.getTime() === currentWeekStart.getTime()
      rows.push({
        label: `Week ${weekIndex} ${MONTHS[monthForLabel.getMonth()]}`,
        monthShort: MONTHS[monthForLabel.getMonth()],
        weekIndex,
        isCurrentWeek,
        days,
      })
    }

    cursor = new Date(cursor.getTime() + 7 * DAY_MS)
  }

  return rows
}
