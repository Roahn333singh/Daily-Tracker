import type { CSSProperties, ReactNode } from 'react'
import { resolveIconId, SIZE_PX, type IconSize } from './catalog'
import './FunkyIcon.css'

interface Props {
  id: string
  size?: IconSize
  className?: string
  title?: string
  /** accent color override for multi-tone icons */
  accent?: string
  animated?: boolean
  /** calendar stamp entrance animation */
  stamp?: boolean
}

export function FunkyIcon({
  id,
  size = 'md',
  className = '',
  title,
  accent,
  animated = true,
  stamp = false,
}: Props) {
  const resolved = resolveIconId(id)
  const px = SIZE_PX[size]
  return (
    <span
      className={`fx fx--${size} ${stamp ? 'is-stamp' : ''} ${animated ? '' : 'is-static'} ${className}`.trim()}
      style={{ width: px, height: px, ['--fx-accent' as string]: accent }}
      role="img"
      aria-label={title ?? resolved}
    >
      <span className="fx__art">{renderArt(resolved, accent)}</span>
    </span>
  )
}

function renderArt(id: string, accent?: string): ReactNode {
  switch (id) {
    case 'lofi-desk':
      return <LofiDesk />
    case 'orbit-bolt':
      return <OrbitBolt accent={accent} />
    case 'neon-cat':
      return <NeonCat />
    case 'dash-runner':
      return <DashRunner accent={accent} />
    case 'code-cube':
      return <CodeCube accent={accent} />
    case 'chaos-spark':
      return <ChaosSpark />
    case 'brain-pulse':
      return <BrainPulse accent={accent} />
    case 'flame-dance':
      return <FlameDance />
    case 'wave-swim':
      return <WaveSwim accent={accent} />
    case 'turbo-wheel':
      return <TurboWheel accent={accent} />
    case 'seed-pop':
      return <SeedPop />
    case 'pixel-heart':
      return <PixelHeart />
    case 'rocket-zip':
      return <RocketZip accent={accent} />
    case 'moon-glitch':
      return <MoonGlitch />
    case 'sun-spin':
      return <SunSpin />
    case 'game-joy':
      return <GameJoy accent={accent} />
    case 'coffee-ripple':
      return <CoffeeRipple />
    case 'target-wobble':
      return <TargetWobble accent={accent} />
    case 'stamp-orbit':
      return <StampOrbit accent={accent} />
    case 'stamp-zap':
      return <StampZap />
    case 'stamp-bloom':
      return <StampBloom />
    case 'stamp-pixel':
      return <StampPixel accent={accent} />
    case 'stamp-star':
      return <StampStar />
    case 'stamp-flame':
      return <StampFlame />
    case 'stamp-desk':
      return <StampDesk />
    case 'stamp-cat':
      return <StampCat />
    case 'sub-sun':
      return <SubSun />
    case 'sub-brain':
      return <SubBrain accent={accent} />
    case 'sub-moon':
      return <SubMoon />
    case 'sub-wave':
      return <SubWave accent={accent} />
    case 'sub-bike':
      return <SubBike accent={accent} />
    case 'sub-run':
      return <SubRun accent={accent} />
    case 'sub-walk':
      return <SubWalk />
    case 'sub-zap':
      return <SubZap />
    case 'sub-note':
      return <SubNote accent={accent} />
    case 'sub-sleep':
      return <SubSleep />
    case 'sub-clean':
      return <SubClean />
    case 'sub-phone':
      return <SubPhone />
    case 'sub-dot':
    default:
      return <SubDot accent={accent} />
  }
}

/* ═══════════════════════════════════════════════
   GOAL ICONS — full character / marks
   ═══════════════════════════════════════════════ */

function LofiDesk() {
  return (
    <svg viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="lofi-bg" x1="8" y1="8" x2="56" y2="56">
          <stop stopColor="#FFD6E8" />
          <stop offset="1" stopColor="#C9E4FF" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="14" fill="url(#lofi-bg)" />
      {/* window glow */}
      <rect x="10" y="12" width="16" height="14" rx="3" fill="#fff" opacity="0.55" />
      <circle cx="18" cy="18" r="3" fill="#FFB347" data-pulse />
      {/* headphones floating */}
      <g data-float>
        <path d="M22 30c0-7 5-12 10-12s10 5 10 12" stroke="#2B2B2B" strokeWidth="3" strokeLinecap="round" />
        <rect x="19" y="28" width="7" height="10" rx="3" fill="#5B5BFF" />
        <rect x="38" y="28" width="7" height="10" rx="3" fill="#5B5BFF" />
      </g>
      {/* desk + laptop */}
      <rect x="14" y="44" width="36" height="4" rx="1" fill="#5C4033" />
      <g data-bob>
        <rect x="24" y="34" width="16" height="10" rx="2" fill="#1E1E2E" />
        <rect x="26" y="36" width="12" height="6" rx="1" fill="#7CF5C8" opacity="0.9" />
        <rect x="22" y="44" width="20" height="2" rx="1" fill="#2A2A3A" />
      </g>
      {/* music notes */}
      <g data-float data-d1>
        <circle cx="48" cy="22" r="2.2" fill="#FF5C8A" />
        <path d="M50 22v-8l5 1.5" stroke="#FF5C8A" strokeWidth="1.8" strokeLinecap="round" />
      </g>
      <g data-float data-d3>
        <circle cx="12" cy="40" r="1.6" fill="#5B5BFF" />
        <path d="M13.5 40v-6l4 1" stroke="#5B5BFF" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  )
}

function OrbitBolt({ accent = '#DC2626' }: { accent?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none">
      <rect x="4" y="4" width="56" height="56" rx="14" fill="#1A0A0A" />
      <circle cx="32" cy="32" r="10" fill={accent} opacity="0.25" data-pulse />
      <circle cx="32" cy="32" r="7" fill={accent} />
      <path d="M34 22 26 34h7l-2 10 9-14h-7l2-8z" fill="#FFE566" data-flicker />
      <g data-orbit>
        <ellipse cx="32" cy="32" rx="22" ry="10" stroke="#FFE566" strokeWidth="1.5" opacity="0.7" />
        <circle cx="54" cy="32" r="2.5" fill="#FFE566" />
      </g>
      <g
        data-orbit
        style={{ animationDuration: '4.5s', animationDirection: 'reverse' } as CSSProperties}
      >
        <ellipse
          cx="32"
          cy="32"
          rx="14"
          ry="20"
          stroke={accent}
          strokeWidth="1.2"
          opacity="0.55"
          transform="rotate(35 32 32)"
        />
      </g>
      <circle cx="14" cy="18" r="1.4" fill="#fff" data-spark />
      <circle cx="48" cy="48" r="1.2" fill="#FFE566" data-spark data-d2 />
    </svg>
  )
}

function NeonCat() {
  return (
    <svg viewBox="0 0 64 64" fill="none">
      <rect x="4" y="4" width="56" height="56" rx="14" fill="#1B1030" />
      <g data-glitch>
        {/* ears */}
        <path d="M18 28 24 14 30 28Z" fill="#FF6BCB" />
        <path d="M34 28 40 14 46 28Z" fill="#FF6BCB" />
        <path d="M20 27 24 18 28 27Z" fill="#FFB3E6" />
        <path d="M36 27 40 18 44 27Z" fill="#FFB3E6" />
        {/* head */}
        <ellipse cx="32" cy="36" rx="16" ry="14" fill="#FF6BCB" />
        {/* eyes */}
        <g data-blink>
          <ellipse cx="25" cy="34" rx="3.5" ry="4.5" fill="#1B1030" />
          <ellipse cx="39" cy="34" rx="3.5" ry="4.5" fill="#1B1030" />
          <circle cx="26" cy="33" r="1.2" fill="#7CF5C8" />
          <circle cx="40" cy="33" r="1.2" fill="#7CF5C8" />
        </g>
        {/* nose + mouth */}
        <path d="M32 38c-1.5 0-2.5 1-2.5 1s1 1.2 2.5 1.2 2.5-1.2 2.5-1.2-1-1-2.5-1Z" fill="#1B1030" />
        {/* whiskers */}
        <path d="M14 36h10M14 40h9M40 36h10M41 40h9" stroke="#7CF5C8" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
      </g>
      <circle cx="12" cy="14" r="1.5" fill="#7CF5C8" data-spark />
      <circle cx="52" cy="18" r="1.2" fill="#FF6BCB" data-spark data-d2 />
    </svg>
  )
}

function DashRunner({ accent = '#16A34A' }: { accent?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none">
      <rect x="4" y="4" width="56" height="56" rx="14" fill="#E8FFF0" />
      {/* motion streaks */}
      <g data-dash>
        <path d="M10 28h10" stroke={accent} strokeWidth="2" strokeLinecap="round" opacity="0.35" />
        <path d="M8 34h14" stroke={accent} strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
        <path d="M12 40h8" stroke={accent} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      </g>
      <g data-bob>
        <circle cx="36" cy="20" r="6" fill="#1A1A1A" />
        <path d="M32 26c0 0 2 10 4 12l6-2 2 12 6-1-3-14c2-1 5-4 5-8" stroke="#1A1A1A" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M33 36l-6 4" stroke={accent} strokeWidth="3" strokeLinecap="round" />
        <path d="M48 48l4 6" stroke={accent} strokeWidth="3" strokeLinecap="round" />
        <circle cx="48" cy="18" r="2" fill={accent} data-spark />
      </g>
    </svg>
  )
}

function CodeCube({ accent = '#CA8A04' }: { accent?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none">
      <rect x="4" y="4" width="56" height="56" rx="14" fill="#1E1A0F" />
      <g data-pulse>
        {/* isometric cube */}
        <path d="M32 14 48 24 32 34 16 24Z" fill={accent} opacity="0.9" />
        <path d="M16 24v16l16 10V34Z" fill="#8B6914" />
        <path d="M48 24v16L32 50V34Z" fill="#E8B923" />
        {/* smiley face */}
        <circle cx="27" cy="24" r="1.6" fill="#1E1A0F" />
        <circle cx="37" cy="24" r="1.6" fill="#1E1A0F" />
        <path d="M27 29c2 2 8 2 10 0" stroke="#1E1A0F" strokeWidth="1.8" strokeLinecap="round" />
      </g>
      <text x="14" y="52" fill="#7CF5C8" fontSize="8" fontFamily="monospace" data-flicker>
        {'</>'}
      </text>
      <circle cx="50" cy="14" r="1.4" fill="#7CF5C8" data-spark />
    </svg>
  )
}

function ChaosSpark() {
  return (
    <svg viewBox="0 0 64 64" fill="none">
      <rect x="4" y="4" width="56" height="56" rx="14" fill="#F3E8FF" />
      <g data-wiggle>
        {/* broom */}
        <rect x="30" y="12" width="4" height="28" rx="2" fill="#7C3AED" transform="rotate(25 32 32)" />
        <path d="M20 42c4 6 10 8 16 6 4-1 8-5 10-10-6 2-12 2-18 0-4-1-8-3-8 4Z" fill="#A78BFA" transform="rotate(25 32 32)" />
        <path d="M22 40c2 1 6 2 10 1" stroke="#5B21B6" strokeWidth="1" opacity="0.5" transform="rotate(25 32 32)" />
      </g>
      <g data-spark>
        <path d="M48 16l1.5 4 4 1.5-4 1.5L48 27l-1.5-4-4-1.5 4-1.5Z" fill="#F59E0B" />
      </g>
      <g data-spark data-d2>
        <path d="M14 22l1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" fill="#EC4899" />
      </g>
      <g data-spark data-d3>
        <circle cx="46" cy="44" r="2" fill="#7C3AED" />
      </g>
    </svg>
  )
}

function BrainPulse({ accent = '#7C3AED' }: { accent?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none">
      <rect x="4" y="4" width="56" height="56" rx="14" fill="#F5F0FF" />
      <g data-pulse>
        <path
          d="M24 20c-6 0-10 5-10 11 0 3 1 5 3 7-1 2-1 4 0 6 2 4 7 6 12 5 1 2 3 3 5 3s4-1 5-3c5 1 10-1 12-5 1-2 1-4 0-6 2-2 3-4 3-7 0-6-4-11-10-11-2 0-4 1-5 2-1-1-3-2-5-2-2 0-4.5.8-5.5 2-1-1-3-2-4.5-2Z"
          fill={accent}
          opacity="0.9"
        />
        <path d="M32 22v24M24 28c4 2 8 2 12 0M24 36c4 2 8 2 12 0" stroke="#E9D5FF" strokeWidth="1.8" strokeLinecap="round" />
      </g>
      <circle cx="18" cy="16" r="1.5" fill={accent} data-spark />
      <circle cx="46" cy="18" r="1.2" fill="#EC4899" data-spark data-d2 />
    </svg>
  )
}

function FlameDance() {
  return (
    <svg viewBox="0 0 64 64" fill="none">
      <rect x="4" y="4" width="56" height="56" rx="14" fill="#1A0C00" />
      <g data-flicker>
        <path d="M32 12c2 8-6 10-4 18 1 4 5 6 5 10 0 6-5 10-11 8 4 8 16 10 22 2 5-7 3-16-2-22-3-4-7-6-10-16Z" fill="#FF6B00" />
        <path d="M30 28c1 4-2 6-1 10 1 3 3 4 3 7 0 4-3 6-6 5 2 4 9 5 12 1 3-4 2-9-1-12-2-3-5-4-7-11Z" fill="#FFD060" data-float />
        <ellipse cx="32" cy="46" rx="5" ry="6" fill="#FFF3B0" data-pulse />
      </g>
    </svg>
  )
}

function WaveSwim({ accent = '#0891B2' }: { accent?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none">
      <rect x="4" y="4" width="56" height="56" rx="14" fill="#E0F7FA" />
      <g data-float>
        <ellipse cx="32" cy="30" rx="14" ry="5" fill={accent} opacity="0.35" transform="rotate(-20 32 30)" />
        <path d="M18 28c6-4 14-4 20 0 3 2 8 2 12-1" stroke={accent} strokeWidth="3" strokeLinecap="round" fill="none" />
        <circle cx="40" cy="24" r="3.5" fill="#0E7490" />
        <path d="M42 24c3 0 6 2 7 5" stroke="#0E7490" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <path d="M10 44c4-3 8-3 12 0s8 3 12 0 8-3 12 0 8 3 12 0" stroke={accent} strokeWidth="2.5" strokeLinecap="round" data-dash />
      <path d="M10 50c4-3 8-3 12 0s8 3 12 0 8-3 12 0 8 3 12 0" stroke={accent} strokeWidth="2" strokeLinecap="round" opacity="0.45" data-dash data-d2 />
    </svg>
  )
}

function TurboWheel({ accent = '#2563EB' }: { accent?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none">
      <rect x="4" y="4" width="56" height="56" rx="14" fill="#EEF2FF" />
      <g data-spin>
        <circle cx="32" cy="32" r="16" stroke={accent} strokeWidth="3" fill="none" />
        <circle cx="32" cy="32" r="4" fill={accent} />
        <path d="M32 16v12M32 36v12M16 32h12M36 32h12" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M21 21l8 8M35 35l8 8M43 21l-8 8M29 35l-8 8" stroke={accent} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      </g>
      <path d="M48 18l4-6" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" data-spark />
    </svg>
  )
}

function SeedPop() {
  return (
    <svg viewBox="0 0 64 64" fill="none">
      <rect x="4" y="4" width="56" height="56" rx="14" fill="#ECFDF5" />
      <rect x="29" y="36" width="6" height="14" rx="2" fill="#15803D" data-grow />
      <g data-grow>
        <ellipse cx="24" cy="32" rx="10" ry="7" fill="#22C55E" transform="rotate(-30 24 32)" />
        <ellipse cx="40" cy="30" rx="10" ry="7" fill="#4ADE80" transform="rotate(25 40 30)" />
        <circle cx="32" cy="24" r="5" fill="#86EFAC" data-pulse />
      </g>
      <circle cx="18" cy="18" r="1.5" fill="#F59E0B" data-spark />
      <circle cx="46" cy="16" r="1.2" fill="#F59E0B" data-spark data-d2 />
      <ellipse cx="32" cy="52" rx="12" ry="3" fill="#86EFAC" opacity="0.5" />
    </svg>
  )
}

function PixelHeart() {
  return (
    <svg viewBox="0 0 64 64" fill="none">
      <rect x="4" y="4" width="56" height="56" rx="14" fill="#FFF0F3" />
      <g data-pop>
        <rect x="18" y="22" width="10" height="10" fill="#FB7185" />
        <rect x="36" y="22" width="10" height="10" fill="#FB7185" />
        <rect x="14" y="28" width="36" height="10" fill="#F43F5E" />
        <rect x="18" y="36" width="28" height="8" fill="#E11D48" />
        <rect x="24" y="42" width="16" height="6" fill="#BE123C" />
        <rect x="30" y="46" width="4" height="4" fill="#9F1239" />
        <rect x="22" y="26" width="4" height="4" fill="#FFE4E6" opacity="0.9" />
      </g>
    </svg>
  )
}

function RocketZip({ accent = '#2563EB' }: { accent?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none">
      <rect x="4" y="4" width="56" height="56" rx="14" fill="#0B1220" />
      <g data-bob>
        <path d="M32 12c8 8 10 20 8 30l-8 4-8-4c-2-10 0-22 8-30Z" fill={accent} />
        <circle cx="32" cy="30" r="4" fill="#7CF5C8" />
        <path d="M24 36l-6 6 8-2M40 36l6 6-8-2" fill="#FF6B6B" />
        <path d="M28 46c1 6 3 8 4 10 1-2 3-4 4-10" fill="#FFB347" data-flicker />
      </g>
      <circle cx="14" cy="18" r="1.2" fill="#fff" data-spark />
      <circle cx="50" cy="22" r="1" fill="#7CF5C8" data-spark data-d2 />
      <circle cx="18" cy="48" r="0.9" fill="#fff" data-spark data-d3 />
    </svg>
  )
}

function MoonGlitch() {
  return (
    <svg viewBox="0 0 64 64" fill="none">
      <rect x="4" y="4" width="56" height="56" rx="14" fill="#0F172A" />
      <g data-glitch>
        <path d="M38 16a16 16 0 1 0 10 26 14 14 0 1 1-10-26Z" fill="#E2E8F0" />
        <circle cx="34" cy="28" r="2" fill="#94A3B8" />
        <circle cx="28" cy="36" r="1.5" fill="#94A3B8" />
        <circle cx="36" cy="38" r="1" fill="#64748B" />
      </g>
      <circle cx="16" cy="18" r="1" fill="#A5B4FC" data-spark />
      <circle cx="50" cy="20" r="1.3" fill="#FDE68A" data-spark data-d2 />
      <circle cx="48" cy="46" r="0.9" fill="#fff" data-spark data-d3 />
    </svg>
  )
}

function SunSpin() {
  return (
    <svg viewBox="0 0 64 64" fill="none">
      <rect x="4" y="4" width="56" height="56" rx="14" fill="#FFF7ED" />
      <g data-spin-slow>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <rect
            key={deg}
            x="30"
            y="8"
            width="4"
            height="10"
            rx="2"
            fill="#F59E0B"
            transform={`rotate(${deg} 32 32)`}
          />
        ))}
      </g>
      <circle cx="32" cy="32" r="12" fill="#FBBF24" data-pulse />
      <circle cx="28" cy="30" r="1.5" fill="#92400E" />
      <circle cx="36" cy="30" r="1.5" fill="#92400E" />
      <path d="M28 36c2 3 6 3 8 0" stroke="#92400E" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function GameJoy({ accent = '#7C3AED' }: { accent?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none">
      <rect x="4" y="4" width="56" height="56" rx="14" fill="#F5F3FF" />
      <g data-wiggle>
        <rect x="12" y="24" width="40" height="22" rx="10" fill={accent} />
        <rect x="18" y="30" width="6" height="6" rx="1" fill="#fff" />
        <rect x="16" y="32" width="10" height="2" rx="1" fill="#fff" />
        <circle cx="40" cy="32" r="2.5" fill="#FF6B6B" data-pulse />
        <circle cx="46" cy="36" r="2.5" fill="#FFE566" data-pulse data-d2 />
        <path d="M28 22c0-4 8-4 8 0" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  )
}

function CoffeeRipple() {
  return (
    <svg viewBox="0 0 64 64" fill="none">
      <rect x="4" y="4" width="56" height="56" rx="14" fill="#FFF7ED" />
      <g data-float>
        <path d="M20 28h22a2 2 0 0 1 2 2v12a10 10 0 0 1-10 10H28a10 10 0 0 1-10-10V30a2 2 0 0 1 2-2Z" fill="#9A3412" />
        <path d="M44 32h4a6 6 0 0 1 0 12h-4" stroke="#9A3412" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="31" cy="30" rx="10" ry="3" fill="#FBBF24" />
      </g>
      <path d="M26 18c0 4 2 4 2 8" stroke="#C4B5A5" strokeWidth="2" strokeLinecap="round" data-steam />
      <path d="M32 16c0 4 2 4 2 8" stroke="#C4B5A5" strokeWidth="2" strokeLinecap="round" data-steam data-d1 />
      <path d="M38 18c0 4 2 4 2 8" stroke="#C4B5A5" strokeWidth="2" strokeLinecap="round" data-steam data-d2 />
    </svg>
  )
}

function TargetWobble({ accent = '#2563EB' }: { accent?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none">
      <rect x="4" y="4" width="56" height="56" rx="14" fill="#EFF6FF" />
      <g data-wiggle>
        <circle cx="32" cy="32" r="18" stroke={accent} strokeWidth="3" fill="none" />
        <circle cx="32" cy="32" r="12" stroke={accent} strokeWidth="3" fill="none" opacity="0.7" />
        <circle cx="32" cy="32" r="6" fill={accent} data-pulse />
        <path d="M32 8v8M32 48v8M8 32h8M48 32h8" stroke={accent} strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      </g>
      <circle cx="46" cy="16" r="2" fill="#F59E0B" data-spark />
    </svg>
  )
}

/* ═══════════════════════════════════════════════
   STAMP ICONS — calendar cells
   ═══════════════════════════════════════════════ */

function StampOrbit({ accent = '#2563EB' }: { accent?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="16" fill={accent} opacity="0.15" />
      <g data-orbit>
        <circle cx="24" cy="24" r="12" stroke={accent} strokeWidth="2" strokeDasharray="4 3" fill="none" />
        <circle cx="36" cy="24" r="2.5" fill={accent} />
      </g>
      <path d="M17 24l4 4 10-10" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function StampZap() {
  return (
    <svg viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="16" fill="#FEF3C7" />
      <path d="M27 10 16 26h8l-2 12 12-18h-8l1-10Z" fill="#F59E0B" data-flicker />
    </svg>
  )
}

function StampBloom() {
  return (
    <svg viewBox="0 0 48 48" fill="none">
      <g data-pop>
        <circle cx="24" cy="18" r="6" fill="#F472B6" />
        <circle cx="16" cy="24" r="6" fill="#FB7185" />
        <circle cx="32" cy="24" r="6" fill="#FB7185" />
        <circle cx="20" cy="32" r="6" fill="#F9A8D4" />
        <circle cx="28" cy="32" r="6" fill="#F9A8D4" />
        <circle cx="24" cy="26" r="4" fill="#FEF08A" />
      </g>
    </svg>
  )
}

function StampPixel({ accent = '#CA8A04' }: { accent?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none">
      <rect x="10" y="10" width="28" height="28" rx="4" fill={accent} data-pulse />
      <rect x="16" y="18" width="5" height="5" fill="#1E1A0F" />
      <rect x="27" y="18" width="5" height="5" fill="#1E1A0F" />
      <path d="M17 28c2 3 12 3 14 0" stroke="#1E1A0F" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function StampStar() {
  return (
    <svg viewBox="0 0 48 48" fill="none">
      <path
        d="M24 6l4.5 11.5L40 18l-9 7.5L34 38 24 31l-10 7 3-12.5L8 18l11.5-.5Z"
        fill="#FBBF24"
        data-pop
      />
      <circle cx="10" cy="10" r="1.5" fill="#F59E0B" data-spark />
      <circle cx="38" cy="12" r="1.2" fill="#F59E0B" data-spark data-d2 />
    </svg>
  )
}

function StampFlame() {
  return (
    <svg viewBox="0 0 48 48" fill="none">
      <path d="M24 8c1 6-5 8-3 14 1 3 4 4 4 8 0 5-4 8-9 6 3 6 13 8 17 1 4-6 2-13-2-18-2-3-5-4-7-11Z" fill="#FF6B00" data-flicker />
      <path d="M23 20c1 3-1 5 0 8 1 2 2 3 2 5 0 3-2 5-5 4 2 3 7 4 9 1 2-3 1-7-1-9-1-2-3-3-5-9Z" fill="#FFD060" />
    </svg>
  )
}

function StampDesk() {
  return (
    <svg viewBox="0 0 48 48" fill="none">
      <rect x="8" y="8" width="32" height="32" rx="8" fill="#C9E4FF" />
      <g data-float>
        <rect x="16" y="18" width="16" height="10" rx="2" fill="#1E1E2E" />
        <rect x="18" y="20" width="12" height="6" rx="1" fill="#7CF5C8" />
        <rect x="14" y="28" width="20" height="3" rx="1" fill="#5C4033" />
      </g>
      <circle cx="34" cy="14" r="2" fill="#FF5C8A" data-spark />
    </svg>
  )
}

function StampCat() {
  return (
    <svg viewBox="0 0 48 48" fill="none">
      <rect x="8" y="8" width="32" height="32" rx="8" fill="#1B1030" />
      <g data-blink>
        <path d="M16 22 20 14 24 22Z" fill="#FF6BCB" />
        <path d="M24 22 28 14 32 22Z" fill="#FF6BCB" />
        <ellipse cx="24" cy="28" rx="10" ry="8" fill="#FF6BCB" />
        <ellipse cx="20" cy="27" rx="2" ry="2.5" fill="#1B1030" />
        <ellipse cx="28" cy="27" rx="2" ry="2.5" fill="#1B1030" />
        <circle cx="20.5" cy="26.5" r="0.7" fill="#7CF5C8" />
        <circle cx="28.5" cy="26.5" r="0.7" fill="#7CF5C8" />
      </g>
    </svg>
  )
}

/* ═══════════════════════════════════════════════
   SUB ICONS — compact marks
   ═══════════════════════════════════════════════ */

function SubSun() {
  return (
    <svg viewBox="0 0 32 32" fill="none">
      <g data-spin-slow>
        {[0, 60, 120, 180, 240, 300].map((d) => (
          <rect key={d} x="15" y="2" width="2" height="5" rx="1" fill="#F59E0B" transform={`rotate(${d} 16 16)`} />
        ))}
      </g>
      <circle cx="16" cy="16" r="6" fill="#FBBF24" data-pulse />
    </svg>
  )
}

function SubBrain({ accent = '#7C3AED' }: { accent?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none">
      <ellipse cx="16" cy="16" rx="10" ry="9" fill={accent} data-pulse />
      <path d="M16 9v14M11 13c2 1 6 1 10 0M11 19c2 1 6 1 10 0" stroke="#E9D5FF" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function SubMoon() {
  return (
    <svg viewBox="0 0 32 32" fill="none">
      <path d="M20 8a10 10 0 1 0 6 16 9 9 0 1 1-6-16Z" fill="#CBD5E1" data-float />
      <circle cx="8" cy="10" r="1" fill="#FDE68A" data-spark />
    </svg>
  )
}

function SubWave({ accent = '#0891B2' }: { accent?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none">
      <path d="M4 16c3-3 6-3 9 0s6 3 9 0 6-3 9 0" stroke={accent} strokeWidth="2.5" strokeLinecap="round" data-dash />
      <path d="M4 22c3-3 6-3 9 0s6 3 9 0 6-3 9 0" stroke={accent} strokeWidth="2" strokeLinecap="round" opacity="0.45" data-dash data-d1 />
    </svg>
  )
}

function SubBike({ accent = '#2563EB' }: { accent?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none">
      <circle cx="9" cy="22" r="5" stroke={accent} strokeWidth="2" data-spin />
      <circle cx="23" cy="22" r="5" stroke={accent} strokeWidth="2" data-spin />
      <path d="M9 22h8l4-8h-2M14 14h6M17 22l-3-8" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SubRun({ accent = '#16A34A' }: { accent?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none">
      <g data-dash>
        <circle cx="18" cy="8" r="3" fill="#1A1A1A" />
        <path d="M16 11c1 4 2 5 3 7l3-1 1 6 3-1-2-7c1-1 2-2 2-4" stroke="#1A1A1A" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M15 16l-3 2M22 24l2 3" stroke={accent} strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  )
}

function SubWalk() {
  return (
    <svg viewBox="0 0 32 32" fill="none">
      <g data-bob>
        <circle cx="16" cy="8" r="3" fill="#1A1A1A" />
        <path d="M16 12v8M12 16l4-2 4 3M14 28l2-8 2 8" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  )
}

function SubZap() {
  return (
    <svg viewBox="0 0 32 32" fill="none">
      <path d="M18 4 10 16h6l-2 12 10-16h-6l0-8Z" fill="#F59E0B" data-flicker />
    </svg>
  )
}

function SubNote({ accent = '#2563EB' }: { accent?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none">
      <rect x="8" y="6" width="16" height="20" rx="2" fill={accent} data-float />
      <path d="M12 12h8M12 16h8M12 20h5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function SubSleep() {
  return (
    <svg viewBox="0 0 32 32" fill="none">
      <path d="M8 20c0-6 4-10 10-10a9 9 0 0 0-2 18c-5 0-8-3-8-8Z" fill="#6366F1" data-float />
      <text x="20" y="12" fill="#A5B4FC" fontSize="7" fontFamily="monospace" data-float data-d1>
        z
      </text>
    </svg>
  )
}

function SubClean() {
  return (
    <svg viewBox="0 0 32 32" fill="none">
      <g data-wiggle>
        <rect x="14" y="6" width="3" height="12" rx="1" fill="#7C3AED" />
        <path d="M8 22c2 4 5 5 8 4 3 0 5-2 6-5-3 1-6 1-10 0-2 0-4-1-4 1Z" fill="#A78BFA" />
      </g>
      <circle cx="24" cy="10" r="1.5" fill="#F59E0B" data-spark />
    </svg>
  )
}

function SubPhone() {
  return (
    <svg viewBox="0 0 32 32" fill="none">
      <rect x="11" y="5" width="10" height="18" rx="2" fill="#1E293B" data-glitch />
      <rect x="13" y="8" width="6" height="10" fill="#334155" />
      <path d="M8 24l16-16" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" data-pulse />
    </svg>
  )
}

function SubDot({ accent = '#2563EB' }: { accent?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="6" fill={accent} data-pulse />
      <circle cx="16" cy="16" r="10" stroke={accent} strokeWidth="1.5" opacity="0.35" data-ripple />
    </svg>
  )
}
