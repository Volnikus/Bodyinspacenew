import type { Level } from '../engine/types'

/** Status is never colour alone: every level has its own shape and its own word. */
export const LEVEL_UI: Record<Level, { word: string; color: string; deep: string; text: string; border: string; bg: string }> = {
  ok: { word: 'All clear', color: 'var(--color-ok)', deep: 'var(--color-ok-deep)', text: 'text-ok', border: 'border-ok/45', bg: 'bg-ok-deep/55' },
  caution: { word: 'Check', color: 'var(--color-caution)', deep: 'var(--color-caution-deep)', text: 'text-caution', border: 'border-caution/55', bg: 'bg-caution-deep/55' },
  alert: { word: 'Act now', color: 'var(--color-alert)', deep: 'var(--color-alert-deep)', text: 'text-alert', border: 'border-alert/60', bg: 'bg-alert-deep/60' },
}

interface IconProps {
  level: Level
  size?: number
  x?: number
  y?: number
}

/** Circle + tick, triangle + mark, octagon + mark. Works in HTML and nested inside an SVG. */
export function StatusIcon({ level, size = 22, x, y }: IconProps) {
  const color = LEVEL_UI[level].color
  return (
    <svg x={x} y={y} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      {level === 'ok' && (
        <>
          <circle cx="12" cy="12" r="9.5" fill="none" stroke={color} strokeWidth="2" />
          <path d="M7.5 12.4l3 3 6-6.4" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {level === 'caution' && (
        <>
          <path d="M12 3.2 22 20.5H2Z" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
          <path d="M12 9.5v5" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="12" cy="17.4" r="1.25" fill={color} />
        </>
      )}
      {level === 'alert' && (
        <>
          <path d="M8 2.5h8l5.5 5.5v8L16 21.5H8L2.5 16V8Z" fill={color} />
          <path d="M12 7v6.5" stroke="#1a0308" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="12" cy="16.8" r="1.4" fill="#1a0308" />
        </>
      )}
    </svg>
  )
}

export function StatusPill({ level, label }: { level: Level; label?: string }) {
  const ui = LEVEL_UI[level]
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.95rem] font-semibold ${ui.text} ${ui.border} ${ui.bg}`} style={{ fontStretch: '88%' }}>
      <StatusIcon level={level} size={18} />
      {label ?? ui.word}
    </span>
  )
}
