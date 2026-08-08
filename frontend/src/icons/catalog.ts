/**
 * Funky icon IDs stored on goals/sub-goals/stamps.
 * Rendered as custom animated SVGs — not stock emoji.
 */
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'stamp'

export interface IconDef {
  id: string
  label: string
  kind: 'goal' | 'stamp' | 'sub'
  /** vibe tag for picker grouping */
  vibe: string
}

export const GOAL_ICONS: IconDef[] = [
  { id: 'lofi-desk', label: 'Lofi Desk', kind: 'goal', vibe: 'study' },
  { id: 'orbit-bolt', label: 'Orbit Bolt', kind: 'goal', vibe: 'power' },
  { id: 'neon-cat', label: 'Neon Cat', kind: 'goal', vibe: 'quirky' },
  { id: 'dash-runner', label: 'Dash Runner', kind: 'goal', vibe: 'sport' },
  { id: 'code-cube', label: 'Code Cube', kind: 'goal', vibe: 'dev' },
  { id: 'chaos-spark', label: 'Chaos Spark', kind: 'goal', vibe: 'life' },
  { id: 'brain-pulse', label: 'Brain Pulse', kind: 'goal', vibe: 'mind' },
  { id: 'flame-dance', label: 'Flame Dance', kind: 'goal', vibe: 'energy' },
  { id: 'wave-swim', label: 'Wave Swim', kind: 'goal', vibe: 'sport' },
  { id: 'turbo-wheel', label: 'Turbo Wheel', kind: 'goal', vibe: 'sport' },
  { id: 'seed-pop', label: 'Seed Pop', kind: 'goal', vibe: 'grow' },
  { id: 'pixel-heart', label: 'Pixel Heart', kind: 'goal', vibe: 'love' },
  { id: 'rocket-zip', label: 'Rocket Zip', kind: 'goal', vibe: 'launch' },
  { id: 'moon-glitch', label: 'Moon Glitch', kind: 'goal', vibe: 'night' },
  { id: 'sun-spin', label: 'Sun Spin', kind: 'goal', vibe: 'day' },
  { id: 'game-joy', label: 'Game Joy', kind: 'goal', vibe: 'play' },
  { id: 'coffee-ripple', label: 'Coffee Ripple', kind: 'goal', vibe: 'focus' },
  { id: 'target-wobble', label: 'Target Wobble', kind: 'goal', vibe: 'aim' },
]

export const STAMP_ICONS: IconDef[] = [
  { id: 'stamp-orbit', label: 'Orbit Check', kind: 'stamp', vibe: 'done' },
  { id: 'stamp-zap', label: 'Zap Hit', kind: 'stamp', vibe: 'done' },
  { id: 'stamp-bloom', label: 'Bloom', kind: 'stamp', vibe: 'done' },
  { id: 'stamp-pixel', label: 'Pixel OK', kind: 'stamp', vibe: 'done' },
  { id: 'stamp-star', label: 'Star Burst', kind: 'stamp', vibe: 'done' },
  { id: 'stamp-flame', label: 'Hot Streak', kind: 'stamp', vibe: 'done' },
  { id: 'stamp-desk', label: 'Desk Drop', kind: 'stamp', vibe: 'done' },
  { id: 'stamp-cat', label: 'Paw Print', kind: 'stamp', vibe: 'done' },
]

export const SUB_ICONS: IconDef[] = [
  { id: 'sub-sun', label: 'Sun', kind: 'sub', vibe: 'time' },
  { id: 'sub-brain', label: 'Brain', kind: 'sub', vibe: 'mind' },
  { id: 'sub-moon', label: 'Moon', kind: 'sub', vibe: 'time' },
  { id: 'sub-wave', label: 'Wave', kind: 'sub', vibe: 'sport' },
  { id: 'sub-bike', label: 'Bike', kind: 'sub', vibe: 'sport' },
  { id: 'sub-run', label: 'Run', kind: 'sub', vibe: 'sport' },
  { id: 'sub-walk', label: 'Walk', kind: 'sub', vibe: 'sport' },
  { id: 'sub-zap', label: 'Zap', kind: 'sub', vibe: 'energy' },
  { id: 'sub-note', label: 'Note', kind: 'sub', vibe: 'write' },
  { id: 'sub-sleep', label: 'Sleep', kind: 'sub', vibe: 'rest' },
  { id: 'sub-clean', label: 'Clean', kind: 'sub', vibe: 'life' },
  { id: 'sub-phone', label: 'No Phone', kind: 'sub', vibe: 'life' },
  { id: 'sub-dot', label: 'Dot', kind: 'sub', vibe: 'basic' },
]

export const ALL_ICONS: IconDef[] = [...GOAL_ICONS, ...STAMP_ICONS, ...SUB_ICONS]

const BY_ID = new Map(ALL_ICONS.map((i) => [i.id, i]))

/** Map legacy emoji (seed / old data) → funky icon ids */
const EMOJI_ALIASES: Record<string, string> = {
  '📚': 'lofi-desk',
  '🧑‍💻': 'stamp-desk',
  '🏊': 'orbit-bolt',
  '💪': 'stamp-zap',
  '🐱': 'neon-cat',
  '🚫': 'stamp-cat',
  '🏃': 'dash-runner',
  '🔥': 'stamp-flame',
  '💻': 'code-cube',
  '🧩': 'stamp-pixel',
  '🧹': 'chaos-spark',
  '✨': 'stamp-star',
  '🎯': 'target-wobble',
  '🧠': 'brain-pulse',
  '🌱': 'seed-pop',
  '🎮': 'game-joy',
  '☕': 'coffee-ripple',
  '⭐': 'stamp-star',
  '🚀': 'rocket-zip',
  '❤️': 'pixel-heart',
  '🏆': 'stamp-star',
  '✅': 'stamp-orbit',
  '☀️': 'sub-sun',
  '🌙': 'sub-moon',
  '🌊': 'sub-wave',
  '🚴': 'sub-bike',
  '🚶': 'sub-walk',
  '⚡': 'sub-zap',
  '📝': 'sub-note',
  '😴': 'sub-sleep',
  '📵': 'sub-phone',
  '•': 'sub-dot',
}

export function resolveIconId(raw: string | null | undefined): string {
  if (!raw) return 'target-wobble'
  if (BY_ID.has(raw)) return raw
  if (EMOJI_ALIASES[raw]) return EMOJI_ALIASES[raw]
  // single grapheme emoji → try again trimmed
  const trimmed = raw.trim()
  if (EMOJI_ALIASES[trimmed]) return EMOJI_ALIASES[trimmed]
  return 'target-wobble'
}

export function isKnownIcon(id: string): boolean {
  return BY_ID.has(id) || Boolean(EMOJI_ALIASES[id])
}

export const SIZE_PX: Record<IconSize, number> = {
  xs: 16,
  sm: 22,
  md: 36,
  lg: 56,
  stamp: 28,
}
