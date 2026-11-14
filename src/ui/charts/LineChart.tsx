import type { Point } from '../../engine/types'

interface Props {
  points: Point[]
  /** Time range shown. Defaults to the range of the points. */
  from?: number
  to?: number
  min?: number
  max?: number
  width?: number
  height?: number
  color?: string
  /** Horizontal reference line, e.g. the personal baseline. */
  baseline?: number
  baselineLabel?: string
  /** Shaded "normal" band. */
  band?: [number, number]
  /** Hold each value until the next point (for scores). */
  step?: boolean
  yTicks?: number[]
  xLabels?: { t: number; text: string }[]
  ariaLabel: string
}

/** Small dependency-free line chart drawn in SVG. */
export function LineChart({
  points,
  from,
  to,
  min,
  max,
  width = 320,
  height = 96,
  color = 'var(--color-link)',
  baseline,
  baselineLabel,
  band,
  step,
  yTicks,
  xLabels,
  ariaLabel,
}: Props) {
  const padL = yTicks ? 34 : 6
  const padR = 8
  const padT = 10
  const padB = xLabels ? 22 : 8
  if (points.length === 0) {
    return (
      <div className="label flex items-center justify-center" style={{ height }}>
        No readings yet
      </div>
    )
  }
  const t0 = from ?? points[0].t
  const t1 = to ?? points[points.length - 1].t
  const values = points.map((p) => p.value)
  const extra = [baseline, ...(band ?? [])].filter((v): v is number => v !== undefined)
  let lo = min ?? Math.min(...values, ...extra)
  let hi = max ?? Math.max(...values, ...extra)
  if (hi - lo < 1e-6) {
    hi += 1
    lo -= 1
  }
  if (min === undefined) lo -= (hi - lo) * 0.12
  if (max === undefined) hi += (hi - lo) * 0.12

  const x = (t: number) => padL + ((t - t0) / Math.max(1, t1 - t0)) * (width - padL - padR)
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * (height - padT - padB)

  let d = ''
  points.forEach((p, i) => {
    const px = x(p.t)
    const py = y(p.value)
    if (i === 0) d += `M${px.toFixed(1)} ${py.toFixed(1)}`
    else if (step) d += ` H${px.toFixed(1)} V${py.toFixed(1)}`
    else d += ` L${px.toFixed(1)} ${py.toFixed(1)}`
  })
  if (step) d += ` H${x(t1).toFixed(1)}`
  const last = points[points.length - 1]

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="block w-full" role="img" aria-label={ariaLabel}>
      {band && (
        <rect x={padL} y={y(band[1])} width={width - padL - padR} height={Math.max(0, y(band[0]) - y(band[1]))} fill="var(--color-ok)" opacity="0.07" />
      )}
      {yTicks?.map((tick) => (
        <g key={tick}>
          <path d={`M${padL} ${y(tick)}H${width - padR}`} stroke="var(--color-line-soft)" strokeWidth="1" />
          <text x={padL - 6} y={y(tick) + 4} textAnchor="end" fontSize="11" fill="var(--color-faint)" style={{ fontStretch: '80%' }}>
            {tick}
          </text>
        </g>
      ))}
      {xLabels?.map((label) => (
        <text key={label.t} x={x(label.t)} y={height - 5} textAnchor="middle" fontSize="11" fill="var(--color-faint)" style={{ fontStretch: '80%' }}>
          {label.text}
        </text>
      ))}
      {baseline !== undefined && (
        <g>
          <path d={`M${padL} ${y(baseline)}H${width - padR}`} stroke="var(--color-star)" strokeWidth="1.2" strokeDasharray="5 5" opacity="0.55" />
          {baselineLabel && (
            <text x={width - padR} y={y(baseline) - 5} textAnchor="end" fontSize="11" fill="var(--color-dim)" style={{ fontStretch: '80%' }}>
              {baselineLabel}
            </text>
          )}
        </g>
      )}
      <path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      {points.length <= 40 &&
        points.map((p, i) => <circle key={i} cx={x(p.t)} cy={y(p.value)} r="2.4" fill="var(--color-hull)" stroke={color} strokeWidth="1.4" />)}
      <circle cx={step ? x(t1) : x(last.t)} cy={y(last.value)} r="4.2" fill={color} />
    </svg>
  )
}
