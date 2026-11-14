import { useEffect, useMemo, useRef, useState } from 'react'
import { crewById } from '../data/crew'
import { METRIC_INFO } from '../data/metrics'
import { DAILY_TASKS, taskKey } from '../data/tasks'
import { EXERCISE } from '../data/thresholds'
import { news2, partLevel, type News2Param } from '../engine/news2'
import type { Consciousness, Metrics, NumericMetricKey } from '../engine/types'
import { go } from '../state/route'
import { useAssessment } from '../state/selectors'
import { useApp } from '../state/store'
import { HOUR, missionDay, DAY } from '../state/time'
import { BackIcon, MinusIcon, PlusIcon } from './icons'
import { LEVEL_UI, StatusIcon } from './level'

type FormValues = Pick<Metrics, 'rr' | 'spo2' | 'onO2' | 'sbp' | 'dbp' | 'hr' | 'consciousness' | 'temp' | 'glucose' | 'sleepH' | 'exerciseMin'>

type FormNumberKey = 'rr' | 'spo2' | 'sbp' | 'dbp' | 'hr' | 'temp' | 'glucose' | 'sleepH' | 'exerciseMin'
const REQUIRED: FormNumberKey[] = ['rr', 'spo2', 'sbp', 'dbp', 'hr', 'temp']
const OPTIONAL: FormNumberKey[] = ['glucose', 'sleepH', 'exerciseMin']

const CONSCIOUSNESS: { id: Consciousness; label: string }[] = [
  { id: 'A', label: 'Alert' },
  { id: 'C', label: 'Confused' },
  { id: 'V', label: 'Voice' },
  { id: 'P', label: 'Pain' },
  { id: 'U', label: 'No response' },
]

const PART_LABEL: Record<News2Param, string> = {
  rr: 'Breathing rate',
  spo2: 'Oxygen saturation',
  o2: 'Extra oxygen',
  sbp: 'Systolic pressure',
  hr: 'Pulse',
  consciousness: 'Alertness',
  temp: 'Temperature',
}

function snap(key: NumericMetricKey, value: number): number {
  const { min, max, step } = METRIC_INFO[key]
  const clamped = Math.min(max, Math.max(min, value))
  return Math.round(clamped / step) * step
}

/** Large − / + control. Hold a button to keep stepping. */
function Stepper({
  metric,
  value,
  onChange,
  dimmed,
  highlighted,
}: {
  metric: NumericMetricKey
  value: number
  onChange: (value: number) => void
  dimmed?: boolean
  highlighted?: boolean
}) {
  const info = METRIC_INFO[metric]
  const latest = useRef(value)
  latest.current = value
  const timers = useRef<{ delay?: number; repeat?: number }>({})
  const ref = useRef<HTMLDivElement>(null)

  const stop = () => {
    window.clearTimeout(timers.current.delay)
    window.clearInterval(timers.current.repeat)
  }
  useEffect(() => stop, [])
  useEffect(() => {
    if (highlighted) ref.current?.scrollIntoView({ block: 'center' })
  }, [highlighted])

  const bump = (direction: 1 | -1) => {
    latest.current = snap(metric, latest.current + direction * info.step)
    onChange(latest.current)
  }
  const press = (direction: 1 | -1) => {
    bump(direction)
    stop()
    timers.current.delay = window.setTimeout(() => {
      timers.current.repeat = window.setInterval(() => bump(direction), 70)
    }, 380)
  }

  const button = (direction: 1 | -1) => (
    <button
      type="button"
      className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-[12px] border border-line bg-raised active:scale-95"
      aria-label={`${direction === 1 ? 'Increase' : 'Decrease'} ${info.label}`}
      onPointerDown={(event) => {
        event.preventDefault()
        press(direction)
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          bump(direction)
        }
      }}
    >
      {direction === 1 ? <PlusIcon /> : <MinusIcon />}
    </button>
  )

  return (
    <div
      ref={ref}
      className={`rounded-[16px] border bg-hull p-3 transition-colors ${highlighted ? 'border-link' : 'border-line-soft'}`}
      role="group"
      aria-label={info.label}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="heading text-[1rem]">{info.label}</span>
        <span className="label text-[0.76rem]">{metric === 'exerciseMin' ? 'plan' : 'normal'} {info.normal}</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        {button(-1)}
        <div className={`text-center ${dimmed ? 'opacity-45' : ''}`}>
          <div className="num text-[2.5rem]" aria-live="polite">
            {value.toFixed(info.decimals)}
          </div>
          <div className="label text-[0.78rem]">{dimmed ? 'not logged' : info.unit}</div>
        </div>
        {button(1)}
      </div>
    </div>
  )
}

export function Measure({ focus }: { focus?: string }) {
  const crewId = useApp((s) => s.selectedCrewId)
  const member = crewById(crewId)
  const assessment = useAssessment(crewId)
  const exerciseToday = useApp((s) => s.exerciseToday[crewId] ?? 0)

  // Start from the latest known values so only what changed needs touching.
  const [form, setForm] = useState<FormValues>(() => {
    const m = assessment.metrics
    return {
      rr: snap('rr', m.rr ?? 15),
      spo2: snap('spo2', m.spo2 ?? 98),
      onO2: m.onO2 ?? false,
      sbp: snap('sbp', m.sbp ?? 118),
      dbp: snap('dbp', m.dbp ?? 76),
      hr: snap('hr', m.hr ?? 70),
      consciousness: m.consciousness ?? 'A',
      temp: snap('temp', m.temp ?? 37.5),
      glucose: snap('glucose', m.glucose ?? 90),
      sleepH: snap('sleepH', m.sleepH ?? 7),
      exerciseMin: snap('exerciseMin', exerciseToday),
    }
  })
  const [touched, setTouched] = useState<Set<FormNumberKey>>(() => new Set(OPTIONAL.includes(focus as FormNumberKey) ? [focus as FormNumberKey] : []))

  const set = (key: FormNumberKey, value: number) => {
    setForm((f) => ({ ...f, [key]: value }))
    setTouched((t) => (t.has(key) ? t : new Set(t).add(key)))
  }

  const preview = useMemo(() => news2(form), [form])
  const ui = LEVEL_UI[preview.level]
  const before = assessment.news2.total

  const save = () => {
    const state = useApp.getState()
    const m: Partial<Metrics> = {
      rr: form.rr,
      spo2: form.spo2,
      onO2: form.onO2,
      sbp: form.sbp,
      dbp: form.dbp,
      hr: form.hr,
      consciousness: form.consciousness,
      temp: form.temp,
    }
    if (touched.has('glucose')) m.glucose = form.glucose
    if (touched.has('sleepH')) m.sleepH = form.sleepH
    if (touched.has('exerciseMin')) m.exerciseMin = form.exerciseMin
    state.logReading(crewId, m, 'manual')

    // Tick off the matching health tasks for today.
    const now = useApp.getState().now
    const day = missionDay(now)
    const timeOfDay = now - (day - 1) * DAY
    const vitals = DAILY_TASKS.filter((t) => t.kind === 'vitals' && !state.tasksDone[taskKey(crewId, day, t.id)]).find(
      (t) => t.at <= timeOfDay + 3 * HOUR,
    )
    if (vitals) state.completeTask(crewId, vitals.id)
    if (touched.has('sleepH')) state.completeTask(crewId, 'sleep')
    if (touched.has('exerciseMin') && form.exerciseMin >= EXERCISE.planMin) state.completeTask(crewId, 'exercise')
    go('')
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      <header className="flex items-center gap-3">
        <button className="tap px-3" onClick={() => go('')} aria-label="Back to crew dashboard">
          <BackIcon />
          Crew
        </button>
        <div>
          <h1 className="heading text-[1.7rem]">Log a measurement</h1>
          <p className="label">{member.name}. Values start at the latest reading: change what you measured.</p>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_clamp(270px,24vw,340px)] gap-3">
        <div className="scroll-quiet flex min-h-0 flex-col gap-3 overflow-auto pr-1">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {REQUIRED.map((key) => (
              <Stepper key={key} metric={key} value={form[key]} onChange={(v) => set(key, v)} highlighted={focus === key} />
            ))}
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3">
            <div className="rounded-[16px] border border-line-soft bg-hull p-3" role="group" aria-label="Breathing support">
              <span className="heading text-[1rem]">Breathing</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[
                  { on: false, label: 'Cabin air' },
                  { on: true, label: 'On oxygen' },
                ].map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    aria-pressed={form.onO2 === option.on}
                    onClick={() => setForm((f) => ({ ...f, onO2: option.on }))}
                    className={`min-h-[60px] rounded-[12px] border text-[0.98rem] font-semibold ${
                      form.onO2 === option.on ? 'border-star bg-raised text-star' : 'border-line bg-raised text-dim'
                    }`}
                    style={{ fontStretch: '86%' }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-[16px] border border-line-soft bg-hull p-3" role="group" aria-label="Alertness">
              <div className="flex items-baseline justify-between">
                <span className="heading text-[1rem]">Alertness</span>
                <span className="label text-[0.76rem]">speak, then tap the shoulder</span>
              </div>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {CONSCIOUSNESS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={form.consciousness === option.id}
                    onClick={() => setForm((f) => ({ ...f, consciousness: option.id }))}
                    className={`min-h-[60px] rounded-[12px] border px-1 text-[0.93rem] font-semibold ${
                      form.consciousness === option.id
                        ? option.id === 'A'
                          ? 'border-star bg-raised text-star'
                          : 'border-alert bg-alert-deep text-star'
                        : 'border-line bg-raised text-dim'
                    }`}
                    style={{ fontStretch: '82%' }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h2 className="label mb-2 px-1">Optional. Logged only if you change them.</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {OPTIONAL.map((key) => (
                <Stepper key={key} metric={key} value={form[key]} onChange={(v) => set(key, v)} dimmed={!touched.has(key)} highlighted={focus === key} />
              ))}
            </div>
          </div>
        </div>

        <aside className="panel flex min-h-0 flex-col p-4" aria-label="Score preview">
          <h2 className="label">NEWS2 after saving</h2>
          <div className="mt-1 flex items-end gap-3">
            <span key={preview.total} className="num score-pop text-[4.6rem]" style={{ color: ui.color }}>
              {preview.total}
            </span>
            <span className="pb-2">
              <span className={`flex items-center gap-1.5 font-semibold ${ui.text}`} style={{ fontStretch: '88%' }}>
                <StatusIcon level={preview.level} size={18} />
                {preview.label}
              </span>
              <span className="label block">now {before}</span>
            </span>
          </div>
          <ul className="scroll-quiet mt-3 flex min-h-0 flex-1 flex-col gap-1 overflow-auto">
            {(Object.keys(PART_LABEL) as News2Param[]).map((part) => {
              const score = preview.parts[part]
              const level = partLevel(score)
              return (
                <li key={part} className="flex items-center justify-between rounded-lg px-2 py-1 text-[0.93rem]">
                  <span className={score > 0 ? '' : 'text-dim'}>{PART_LABEL[part]}</span>
                  <span className={`num flex items-center gap-1.5 text-[1.05rem] ${LEVEL_UI[level].text}`}>
                    {score > 0 && <StatusIcon level={level} size={16} />}+{score}
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="mt-2 text-[0.85rem] leading-snug text-dim">{preview.response}</p>
          <button className="tap tap-primary mr-[74px] mt-3 text-[1.1rem]" onClick={save}>
            Save and recalculate
          </button>
        </aside>
      </div>
    </div>
  )
}
