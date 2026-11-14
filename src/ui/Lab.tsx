import { useEffect, useMemo, useState } from 'react'
import { source } from '../data/sources'

/**
 * Real spaceflight lab data: the four Inspiration4 crew members (3 days in orbit, 2021),
 * blood drawn before launch (L-92, L-44, L-3) and after return (R+1 … R+194).
 * Files are the unmodified "_TRANSFORMED.csv" tables from NASA OSDR, stored in /public/data.
 */

interface Marker {
  id: string
  label: string
  file: 'cbc' | 'cmp'
  /** Column prefix in the NASA file. */
  column: string
  valueSuffix: string
  minColumn: string
  maxColumn: string
  unit: string
  decimals: number
  note: string
}

const FILES = {
  cbc: { path: 'data/LSDS-7_Complete_Blood_Count_CBC_TRANSFORMED.csv', study: 'OSD-569', sourceId: 'osd569' },
  cmp: { path: 'data/LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv', study: 'OSD-575', sourceId: 'osd575' },
} as const

const MARKERS: Marker[] = [
  { id: 'hgb', label: 'Hemoglobin', file: 'cbc', column: 'hemoglobin', valueSuffix: '_value_percent', minColumn: 'hemoglobin_range_min_percent', maxColumn: 'hemoglobin_range_max_percent', unit: 'g/dL', decimals: 1, note: 'Carries oxygen in red blood cells. The NASA column is labelled “percent”; the values are in g/dL.' },
  { id: 'wbc', label: 'White blood cells', file: 'cbc', column: 'white_blood_cell_count', valueSuffix: '_value_thousand_per_microliter', minColumn: 'white_blood_cell_count_range_min_thousand_per_microliter', maxColumn: 'white_blood_cell_count_range_max_thousand_per_microliter', unit: 'thousand/µL', decimals: 1, note: 'Immune cells. Spaceflight stresses the immune system.' },
  { id: 'plt', label: 'Platelets', file: 'cbc', column: 'platelet_count', valueSuffix: '_value_thousand_per_microliter', minColumn: 'platelet_count_range_min_thousand_per_microliter', maxColumn: 'platelet_count_range_max_thousand_per_microliter', unit: 'thousand/µL', decimals: 0, note: 'Cells that form clots.' },
  { id: 'glu', label: 'Glucose', file: 'cmp', column: 'glucose', valueSuffix: '_value_milligram_per_deciliter', minColumn: 'glucose_range_min_milligram_per_deciliter', maxColumn: 'glucose_range_max_milligram_per_deciliter', unit: 'mg/dL', decimals: 0, note: 'Blood sugar, the same measure as the Blood zone on the body map.' },
  { id: 'cre', label: 'Creatinine', file: 'cmp', column: 'creatinine', valueSuffix: '_value_milligram_per_deciliter', minColumn: 'creatinine_range_min_milligram_per_deciliter', maxColumn: 'creatinine_range_max_milligram_per_deciliter', unit: 'mg/dL', decimals: 2, note: 'Shows how well the kidneys filter the blood.' },
  { id: 'cal', label: 'Calcium', file: 'cmp', column: 'calcium', valueSuffix: '_value_milligram_per_deciliter', minColumn: 'calcium_range_min_milligram_per_deciliter', maxColumn: 'calcium_range_max_milligram_per_deciliter', unit: 'mg/dL', decimals: 1, note: 'Bone gives up calcium in microgravity, so calcium is watched closely.' },
]

const TIMEPOINTS = ['L-92', 'L-44', 'L-3', 'R+1', 'R+45', 'R+82', 'R+194']
const SUBJECTS = ['C001', 'C002', 'C003', 'C004']
const SUBJECT_COLOR = ['#8ea8ff', '#3ddc97', '#ffb020', '#f08bd0']
const SUBJECT_DASH = ['', '7 4', '2 4', '10 3 2 3']

type Table = Record<string, string>[]

function parseCsv(text: string): Table {
  const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/)
  const header = lines[0].split(',')
  return lines.slice(1).map((line) => {
    const cells = line.split(',')
    return Object.fromEntries(header.map((name, i) => [name, cells[i] ?? '']))
  })
}

export function Lab() {
  const [tables, setTables] = useState<Partial<Record<'cbc' | 'cmp', Table>>>({})
  const [error, setError] = useState(false)
  const [markerId, setMarkerId] = useState('hgb')
  const marker = MARKERS.find((m) => m.id === markerId)!
  const file = FILES[marker.file]

  useEffect(() => {
    let live = true
    for (const key of ['cbc', 'cmp'] as const) {
      fetch(FILES[key].path)
        .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
        .then((text) => live && setTables((t) => ({ ...t, [key]: parseCsv(text) })))
        .catch(() => live && setError(true))
    }
    return () => {
      live = false
    }
  }, [])

  const data = useMemo(() => {
    const table = tables[marker.file]
    if (!table) return null
    const series = SUBJECTS.map((subject) =>
      TIMEPOINTS.map((tp) => {
        const row = table.find((r) => r['Sample Name'].startsWith(`${subject}_`) && r['Sample Name'].split('_')[2] === tp)
        const value = row ? Number(row[marker.column + marker.valueSuffix]) : NaN
        return Number.isFinite(value) ? value : null
      }),
    )
    const first = table[0]
    const range: [number, number] = [Number(first[marker.minColumn]), Number(first[marker.maxColumn])]
    return { series, range }
  }, [tables, marker])

  const W = 760
  const H = 330
  const pad = { l: 52, r: 20, t: 18, b: 42 }
  const all = data ? [...data.series.flat().filter((v): v is number => v !== null), ...data.range.filter(Number.isFinite)] : [0, 1]
  const lo = Math.min(...all)
  const hi = Math.max(...all)
  const span = hi - lo || 1
  const yMin = lo - span * 0.12
  const yMax = hi + span * 0.12
  const x = (i: number) => pad.l + (i / (TIMEPOINTS.length - 1)) * (W - pad.l - pad.r)
  const y = (v: number) => pad.t + (1 - (v - yMin) / (yMax - yMin)) * (H - pad.t - pad.b)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => yMin + f * (yMax - yMin))

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="heading text-[1.7rem]">Real spaceflight lab data</h1>
          <p className="label">Inspiration4 crew of four, 3 days in orbit. Blood tests before launch and after return. Not simulated.</p>
        </div>
        <a href={source(file.sourceId).url} target="_blank" rel="noreferrer" className="rounded-full border border-link px-3.5 py-1.5 text-[0.9rem] font-semibold text-link" style={{ fontStretch: '88%' }}>
          Source: NASA OSDR, {file.study}
        </a>
      </header>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Blood marker">
        {MARKERS.map((m) => (
          <button
            key={m.id}
            onClick={() => setMarkerId(m.id)}
            aria-pressed={m.id === markerId}
            className={`min-h-[56px] rounded-[12px] border px-4 font-semibold ${m.id === markerId ? 'border-star bg-raised text-star' : 'border-line bg-panel text-dim hover:text-star'}`}
            style={{ fontStretch: '86%' }}
          >
            {m.label}
            <span className="label ml-2 text-[0.72rem]">{FILES[m.file].study}</span>
          </button>
        ))}
      </div>

      <section className="panel flex min-h-0 flex-1 flex-col p-4" aria-label={`${marker.label} before and after flight`}>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="heading text-[1.2rem]">
            {marker.label}, {marker.unit}
          </h2>
          <div className="flex flex-wrap gap-4">
            {SUBJECTS.map((subject, i) => (
              <span key={subject} className="flex items-center gap-2 text-[0.9rem]">
                <svg width="30" height="10" aria-hidden="true">
                  <path d="M0 5h30" stroke={SUBJECT_COLOR[i]} strokeWidth="2.5" strokeDasharray={SUBJECT_DASH[i]} />
                </svg>
                Crew member {subject}
              </span>
            ))}
          </div>
        </div>

        {error && !data && <p className="mt-6 text-caution">The NASA data files could not be loaded. Check that /public/data contains the two CSV files.</p>}
        {!error && !data && <p className="label mt-6">Loading the NASA files…</p>}
        {data && (
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 min-h-0 w-full flex-1" role="img" aria-label={`${marker.label} for four crew members at seven time points around the flight`}>
            {Number.isFinite(data.range[0]) && Number.isFinite(data.range[1]) && (
              <>
                <rect x={pad.l} y={y(data.range[1])} width={W - pad.l - pad.r} height={y(data.range[0]) - y(data.range[1])} fill="var(--color-ok)" opacity="0.07" />
                <text x={W - pad.r - 6} y={y(data.range[1]) + 14} textAnchor="end" fontSize="11.5" fill="var(--color-dim)" style={{ fontStretch: '82%' }}>
                  laboratory reference range {data.range[0]}–{data.range[1]}
                </text>
              </>
            )}
            {ticks.map((tick) => (
              <g key={tick}>
                <path d={`M${pad.l} ${y(tick)}H${W - pad.r}`} stroke="var(--color-line-soft)" />
                <text x={pad.l - 8} y={y(tick) + 4} textAnchor="end" fontSize="12" fill="var(--color-faint)" style={{ fontStretch: '82%' }}>
                  {tick.toFixed(marker.decimals)}
                </text>
              </g>
            ))}
            {/* The flight itself sits between the last pre-launch and the first post-return sample. */}
            <rect x={x(2)} y={pad.t} width={x(3) - x(2)} height={H - pad.t - pad.b} fill="var(--color-link)" opacity="0.1" />
            <text x={(x(2) + x(3)) / 2} y={pad.t + 14} textAnchor="middle" fontSize="12" fill="var(--color-link)" style={{ fontStretch: '82%' }}>
              3 days in orbit
            </text>
            {TIMEPOINTS.map((tp, i) => (
              <text key={tp} x={x(i)} y={H - 20} textAnchor="middle" fontSize="13" fill="var(--color-dim)" style={{ fontStretch: '82%' }}>
                {tp}
              </text>
            ))}
            <text x={x(1)} y={H - 4} textAnchor="middle" fontSize="11.5" fill="var(--color-faint)" style={{ fontStretch: '82%' }}>
              days before launch
            </text>
            <text x={x(5)} y={H - 4} textAnchor="middle" fontSize="11.5" fill="var(--color-faint)" style={{ fontStretch: '82%' }}>
              days after return
            </text>
            {data.series.map((values, s) => {
              const d = values
                .map((v, i) => (v === null ? null : `${x(i).toFixed(1)} ${y(v).toFixed(1)}`))
                .filter(Boolean)
                .map((p, i) => `${i === 0 ? 'M' : 'L'}${p}`)
                .join(' ')
              return (
                <g key={s}>
                  <path d={d} fill="none" stroke={SUBJECT_COLOR[s]} strokeWidth="2.4" strokeDasharray={SUBJECT_DASH[s]} strokeLinejoin="round" />
                  {values.map((v, i) => v !== null && <circle key={i} cx={x(i)} cy={y(v)} r="4" fill="var(--color-hull)" stroke={SUBJECT_COLOR[s]} strokeWidth="2" />)}
                </g>
              )
            })}
          </svg>
        )}
        <p className="mt-1 text-[0.92rem] text-dim">
          {marker.note} Each line is one anonymised crew member. Values are shown exactly as published; the green band is the laboratory’s own reference range from the same file.
        </p>
      </section>
    </div>
  )
}
