import type { Level } from '../engine/types'
import { LEVEL_UI } from './level'

/**
 * KOMEK's body: a small pixel-art robot with one large eye, drawn pixel by pixel in code.
 * Original character for this project. Not a person and not based on any existing character.
 *
 * Legend: b body, s shade, k screen, e eye, w eye highlight, a antenna light.
 */
const BODY = [
  '.......aa.......',
  '.......ss.......',
  '....ssssssss....',
  '...sbbbbbbbbs...',
  '..sbbbbbbbbbbs..',
  '..sbkkkkkkkkbs..',
  '..sbkkkkkkkkbs..',
  '..sbkkkkkkkkbs..',
  '..sbkkkkkkkkbs..',
  '..sbkkkkkkkkbs..',
  '..sbbbbbbbbbbs..',
  '.ssbbbbbbbbbbss.',
  '.s.sbbbbbbbbs.s.',
  '....ssssssss....',
  '....ss....ss....',
  '...sss....sss...',
]

/** Eye frames, drawn on the screen area (columns 4–11, rows 5–9). */
const EYE_OPEN = ['........', '..ewwe..', '..eeee..', '..eeee..', '........']
const EYE_SHUT = ['........', '........', '..eeee..', '........', '........']
/** Wide eye for warnings. */
const EYE_WIDE = ['..eeee..', '.ewweee.', '.eeeeee.', '.eeeeee.', '..eeee..']

const FILL: Record<string, string> = {
  b: '#cfd8ee',
  s: '#6f7fa8',
  k: '#0a0f1c',
  w: '#ffffff',
}

function pixels(rows: string[], offsetX: number, offsetY: number, color: (ch: string) => string | undefined) {
  const out = []
  for (let y = 0; y < rows.length; y += 1) {
    for (let x = 0; x < rows[y].length; x += 1) {
      const fill = color(rows[y][x])
      if (fill) out.push(<rect key={`${x}-${y}`} x={x + offsetX} y={y + offsetY} width="1.02" height="1.02" fill={fill} />)
    }
  }
  return out
}

export type KomekMood = 'idle' | 'notice' | 'alert'

export function KomekSprite({ size = 48, level = 'ok', mood = 'idle' }: { size?: number; level?: Level; mood?: KomekMood }) {
  const accent = level === 'ok' ? 'var(--color-link)' : LEVEL_UI[level].color
  const paint = (ch: string) => (ch === 'e' || ch === 'a' ? accent : FILL[ch])
  const wide = mood === 'alert' || level === 'alert'
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true" className={`komek-sprite komek-${mood}`}>
      {pixels(BODY, 0, 0, paint)}
      {wide ? (
        <g>{pixels(EYE_WIDE, 4, 5, paint)}</g>
      ) : (
        <>
          <g className="komek-eye-open">{pixels(EYE_OPEN, 4, 5, paint)}</g>
          <g className="komek-eye-shut">{pixels(EYE_SHUT, 4, 5, paint)}</g>
        </>
      )}
    </svg>
  )
}
