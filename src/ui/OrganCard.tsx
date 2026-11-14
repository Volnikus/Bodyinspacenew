import { useMemo, useState } from 'react'
import { crewById } from '../data/crew'
import { AIR_ACTIONS, GUIDANCE_NOTE, RADIATION_ACTIONS, ZONE_CONTENT, actionsFor } from '../data/content'
import { METRIC_INFO, formatMetric } from '../data/metrics'
import { source } from '../data/sources'
import { CO2, EXERCISE, RADIATION } from '../data/thresholds'
import type { Assessment } from '../engine/assess'
import { rollingBaseline } from '../engine/baseline'
import { lastMeasuredAt, series } from '../engine/readings'
import type { Finding, Level, NumericMetricKey, OrganId, Reading, ZoneId } from '../engine/types'
import { worst } from '../engine/types'
import { useKomek } from '../state/komek'
import { go } from '../state/route'
import { useAssessment, useEnvStatus, useReadings, type EnvStatus } from '../state/selectors'
import { useApp } from '../state/store'
import { DAY, missionDay } from '../state/time'
import { LineChart } from './charts/LineChart'
import { linkText } from './EarthLink'
import { BackIcon, PlusIcon } from './icons'
import { LEVEL_UI, StatusIcon, StatusPill } from './level'
import { SpaceWeather } from './SpaceWeather'

const ZONES: ZoneId[] = ['brain', 'eyes', 'heart', 'lungs', 'blood', 'bones', 'skin', 'air', 'radiation']
export const isZone = (value: string | undefined): value is ZoneId => ZONES.includes(value as ZoneId)

const CHART_METRICS: Record<ZoneId, NumericMetricKey[]> = {
  heart: ['hr', 'sbp', 'dbp'],
  lungs: ['rr', 'spo2'],
  brain: ['sleepH', 'reactionMs'],
  eyes: [],
  blood: ['glucose'],
  bones: ['exerciseMin'],
  skin: ['temp'],
  air: [],
  radiation: [],
}

const NORMAL_BAND: Partial<Record<NumericMetricKey, [number, number]>> = {
  hr: [51, 90],
  rr: [12, 20],
  spo2: [96, 100],
  sbp: [111, 129],
  temp: [36.1, 38.0],
  glucose: [70, 99],
  sleepH: [7, 9],
}

const NEWS2_PART: Partial<Record<NumericMetricKey, 'hr' | 'sbp' | 'rr' | 'spo2' | 'temp'>> = {
  hr: 'hr',
  sbp: 'sbp',
  rr: 'rr',
  spo2: 'spo2',
  temp: 'temp',
}

const CONSCIOUSNESS_WORD = { A: 'Alert', C: 'Confused', V: 'Responds to voice', P: 'Responds to pain', U: 'Unresponsive' }

interface Tile {
  label: string
  value: string
  unit?: string
  level?: Level
  notes?: string[]
  /** 0..1, draws a bar under the value. */
  share?: number
}

function metricTile(key: NumericMetricKey, a: Assessment, readings: Reading[]): Tile {
  const info = METRIC_INFO[key]
  const value = a.metrics[key]
  const findings = a.organs[info.organ].findings.filter((f) => f.metric === key || (key === 'sbp' && f.metric === 'dbp'))
  const notes: string[] = []
  const part = NEWS2_PART[key]
  if (part) notes.push(`NEWS2 +${a.news2.parts[part]}`)
  const base = rollingBaseline(series(readings, key), a.t)
  if (base) notes.push(`Your 7-day normal ${formatMetric(key, base.mean)}`)
  else notes.push(`Normal ${info.normal}`)
  return {
    label: info.label,
    value: value === undefined ? '–' : formatMetric(key, value),
    unit: info.unit,
    level: worst(...findings.map((f) => f.level)),
    notes,
  }
}

function buildTiles(zone: ZoneId, a: Assessment, readings: Reading[], env: EnvStatus, exerciseToday: number, now: number): Tile[] {
  const day = missionDay(now)
  switch (zone) {
    case 'heart':
      return [metricTile('hr', a, readings), metricTile('sbp', a, readings), metricTile('dbp', a, readings)]
    case 'lungs':
      return [
        metricTile('rr', a, readings),
        metricTile('spo2', a, readings),
        { label: 'Breathing', value: a.metrics.onO2 ? 'On oxygen' : 'Cabin air', level: a.metrics.onO2 ? 'caution' : 'ok', notes: [`NEWS2 +${a.news2.parts.o2}`] },
      ]
    case 'brain': {
      const c = a.metrics.consciousness ?? 'A'
      const mood = a.metrics.phq9
      return [
        { label: 'Alertness', value: CONSCIOUSNESS_WORD[c], level: c === 'A' ? 'ok' : 'alert', notes: [`NEWS2 +${a.news2.parts.consciousness}`] },
        metricTile('sleepH', a, readings),
        metricTile('reactionMs', a, readings),
        {
          label: 'Mood check (PHQ-9)',
          value: mood === undefined ? '–' : String(mood),
          unit: 'of 27',
          level: worst(...a.organs.brain.findings.filter((f) => f.metric === 'phq9').map((f) => f.level)),
          notes: ['Private. 0–4 is the normal range'],
        },
      ]
    }
    case 'eyes': {
      const checked = lastMeasuredAt(readings, 'amslerDistortion')
      return [
        {
          label: 'Grid self-check',
          value: a.organs.eyes.level === 'ok' ? 'No change' : 'Change noted',
          level: a.organs.eyes.level,
          notes: [checked === null ? 'Not checked yet' : `Last checked on day ${missionDay(checked)}`],
        },
      ]
    }
    case 'blood':
      return [metricTile('glucose', a, readings)]
    case 'bones': {
      const week = series(readings, 'exerciseMin').slice(-7)
      const avg = week.length ? week.reduce((sum, p) => sum + p.value, 0) / week.length : 0
      return [
        { label: 'Exercise today', value: String(exerciseToday), unit: `of ${EXERCISE.planMin} min`, share: exerciseToday / EXERCISE.planMin },
        { label: '7-day average', value: String(Math.round(avg)), unit: 'min/day', level: a.organs.bones.level, notes: [`Plan ${EXERCISE.planMin} min/day`] },
        {
          label: 'Estimated leg bone loss',
          value: env.boneLoss.pct.toFixed(1),
          unit: '%',
          notes: [
            env.env.id === 'clinic'
              ? 'Normal gravity: no spaceflight bone loss'
              : env.boneLoss.isReference
              ? `Reference estimate. No human data exists for ${env.env.gravity}; the microgravity rate is shown as an upper bound`
              : `Day ${day} at 0.8% a month`,
          ],
        },
      ]
    }
    case 'skin':
      return [metricTile('temp', a, readings)]
    case 'air':
      return [
        { label: 'CO2, 1-hour average', value: env.env.co2HourMean.toFixed(1), unit: 'mmHg', level: env.env.co2HourMean > CO2.hourMeanAbove ? 'alert' : 'ok', notes: [`Limit ${CO2.hourMeanAbove} mmHg`, 'Simulated'] },
        { label: 'CO2, 7-day average', value: env.env.co2WeekMean.toFixed(1), unit: 'mmHg', level: env.env.co2WeekMean > CO2.weekMeanAbove ? 'caution' : 'ok', notes: [`Watch above ${CO2.weekMeanAbove} mmHg`, 'Simulated'] },
      ]
    case 'radiation':
      return [
        { label: 'Career dose', value: String(Math.round(env.careerMsv)), unit: `of ${RADIATION.careerLimit} mSv`, level: env.radiation.level, share: env.careerMsv / RADIATION.careerLimit, notes: ['Simulated'] },
        { label: 'This mission so far', value: String(Math.round(env.missionDoseMsv)), unit: 'mSv', notes: [`Day ${day}`] },
        { label: 'Dose rate', value: String(env.env.doseRateMsvDay), unit: 'mSv/day', notes: [env.env.doseNote] },
      ]
  }
}

function TileView({ tile }: { tile: Tile }) {
  const color = tile.level && tile.level !== 'ok' ? LEVEL_UI[tile.level].color : undefined
  return (
    <div className="rounded-[16px] border border-line-soft bg-panel px-3.5 py-3" style={color ? { borderColor: color } : undefined}>
      <div className="flex items-center justify-between gap-2">
        <span className="label">{tile.label}</span>
        {tile.level && <StatusIcon level={tile.level} size={20} />}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="num text-[2.3rem]" style={{ color }}>
          {tile.value}
        </span>
        {tile.unit && <span className="label text-[0.9rem]">{tile.unit}</span>}
      </div>
      {tile.share !== undefined && (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-void">
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, tile.share * 100)}%`, background: color ?? 'var(--color-link)' }} />
        </div>
      )}
      {tile.notes?.map((note) => (
        <div key={note} className="mt-1 text-[0.8rem] leading-snug text-dim">
          {note}
        </div>
      ))}
    </div>
  )
}

export function OrganCard({ zone }: { zone: ZoneId }) {
  const crewId = useApp((s) => s.selectedCrewId)
  const exerciseToday = useApp((s) => s.exerciseToday[crewId] ?? 0)
  const now = useApp((s) => s.now)
  const member = crewById(crewId)
  const assessment = useAssessment(crewId)
  const readings = useReadings(crewId)
  const env = useEnvStatus(crewId)
  const content = ZONE_CONTENT[zone]
  const chartMetrics = CHART_METRICS[zone]
  const [chartKey, setChartKey] = useState<NumericMetricKey | undefined>(chartMetrics[0])
  const activeKey = chartKey && chartMetrics.includes(chartKey) ? chartKey : chartMetrics[0]

  const isOrgan = zone !== 'air' && zone !== 'radiation'
  const level: Level = isOrgan ? assessment.organs[zone as OrganId].level : zone === 'air' ? env.air.level : env.radiation.level
  const findings: Finding[] = isOrgan ? assessment.organs[zone as OrganId].findings : []
  const hints = isOrgan ? assessment.hints.filter((h) => h.organ === zone) : []
  const envCheck = zone === 'air' ? env.air : zone === 'radiation' ? env.radiation : null

  const tiles = useMemo(
    () => buildTiles(zone, assessment, readings, env, exerciseToday, now),
    // Minute resolution is enough for the day counters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [zone, assessment, readings, env, exerciseToday, Math.floor(now / 60_000)],
  )

  const actions = useMemo(() => {
    if (level === 'ok') return content.okActions
    if (zone === 'air') return AIR_ACTIONS[level]
    if (zone === 'radiation') return RADIATION_ACTIONS[level]
    const lines = actionsFor(findings, assessment.metrics)
    return lines.length > 0 ? lines : content.okActions
  }, [level, zone, findings, assessment.metrics, content.okActions])

  const chart = useMemo(() => {
    if (!activeKey) return null
    const all = series(readings, activeKey)
    const to = assessment.t
    const points = all.filter((p) => p.t >= to - 7 * DAY)
    return { points, base: rollingBaseline(all, to), to }
  }, [activeKey, readings, assessment.t])

  const ui = LEVEL_UI[level]
  const link = linkText(env.env)

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4">
      <header className="flex items-center gap-3">
        <button className="tap px-3" onClick={() => go('')} aria-label="Back to crew dashboard">
          <BackIcon />
          Crew
        </button>
        <div className="min-w-0">
          <h1 className="heading truncate text-[1.7rem]">{content.title}</h1>
          <p className="label truncate">{isOrgan ? member.name : env.env.name}</p>
        </div>
        <StatusPill level={level} />
        <button className="tap ml-auto" onClick={() => useKomek.getState().askAbout(zone, content.title)} aria-label={`Ask KOMEK about ${content.title}`}>
          <span className="num text-[1.3rem] text-link">?</span>
          Ask KOMEK
        </button>
        <button className="tap tap-primary" onClick={() => go(isOrgan && chartMetrics[0] ? `measure/${chartMetrics[0]}` : 'measure')}>
          <PlusIcon size={22} />
          Log new measurement
        </button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-12 grid-rows-[auto_minmax(0,1fr)] gap-x-6 gap-y-4">
        <section className="col-span-5 flex flex-col gap-3 px-1" aria-label="Current values">
          <p className="text-[0.98rem] text-dim">{content.what}</p>
          <div className={`grid gap-2.5 ${tiles.length >= 4 ? 'grid-cols-2' : tiles.length === 1 ? 'grid-cols-1' : tiles.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {tiles.map((tile) => (
              <TileView key={tile.label} tile={tile} />
            ))}
          </div>
        </section>

        <section className="col-span-7 flex min-h-0 flex-col px-1" aria-label="Seven-day trend">
          {chart && activeKey ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <h2 className="heading text-[1.1rem]">{METRIC_INFO[activeKey].label}, last 7 days</h2>
                <div className="flex items-center gap-2">
                  {chartMetrics.length > 1 &&
                    chartMetrics.map((key) => (
                      <button
                        key={key}
                        onClick={() => setChartKey(key)}
                        aria-pressed={key === activeKey}
                        className={`min-h-[44px] rounded-[12px] border px-3 text-[0.9rem] font-semibold ${
                          key === activeKey ? 'border-star bg-raised text-star' : 'border-line text-dim hover:text-star'
                        }`}
                        style={{ fontStretch: '86%' }}
                      >
                        {METRIC_INFO[key].short}
                      </button>
                    ))}
                  <span className="label rounded-full border border-line px-2.5 py-0.5">Simulated</span>
                </div>
              </div>
              <div className="mt-1 min-h-0 flex-1">
                <LineChart
                  points={chart.points}
                  from={chart.to - 7 * DAY}
                  to={chart.to}
                  width={640}
                  height={190}
                  color={level === 'ok' ? 'var(--color-link)' : ui.color}
                  baseline={chart.base?.mean}
                  baselineLabel={chart.base ? `your 7-day normal ${formatMetric(activeKey, chart.base.mean)} ${METRIC_INFO[activeKey].unit}` : undefined}
                  band={NORMAL_BAND[activeKey]}
                  yTicks={niceTicks(chart.points.map((p) => p.value), chart.base?.mean, NORMAL_BAND[activeKey])}
                  xLabels={[6, 4, 2, 0].map((d) => ({ t: chart.to - d * DAY - (d === 0 ? 0.25 * DAY : 0), text: d === 0 ? 'today' : `${d} d ago` }))}
                  ariaLabel={`${METRIC_INFO[activeKey].label} over the last 7 days with the personal baseline`}
                />
              </div>
            </>
          ) : zone === 'radiation' ? (
            <SpaceWeather />
          ) : (
            <div className="flex flex-1 flex-col justify-center gap-2">
              {envCheck && (
                <p className="flex items-center gap-2.5 text-[1.1rem]">
                  <StatusIcon level={envCheck.level} size={24} />
                  {envCheck.text}
                </p>
              )}
              <p className="text-dim">
                {zone === 'eyes'
                  ? 'The grid self-check has no number to plot. Each check is logged with its date.'
                  : `Cabin readings for ${env.env.name}. ${env.env.evacuation}.`}
              </p>
            </div>
          )}
        </section>

        <section className="col-span-4 flex min-h-0 flex-col border-t border-line px-1 pt-4" aria-label="How to measure">
          <h2 className="heading text-[1.2rem]">How to measure</h2>
          <ol className="scroll-quiet mt-2 flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
            {content.how.map((step, i) => (
              <li key={step} className="flex gap-3 text-[0.97rem] leading-snug">
                <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-[0.95rem] text-dim">{i + 1}</span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
            {content.howNote && <li className="mt-1 text-[0.85rem] text-dim">{content.howNote}</li>}
          </ol>
        </section>

        <section className="col-span-4 flex min-h-0 flex-col border-t border-line px-1 pt-4" aria-label="Why it matters in space">
          <h2 className="heading text-[1.2rem]">Why it matters in space</h2>
          <ul className="scroll-quiet mt-2 flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
            {content.why.map((fact) => (
              <li key={fact.text} className="text-[0.97rem] leading-snug">
                {fact.text}
                <SourceLink id={fact.sourceId} />
              </li>
            ))}
            {hints.map((hint) => (
              <li key={hint.text} className="rounded-[12px] border border-link-deep bg-link-deep/30 px-3 py-2 text-[0.93rem] leading-snug">
                {hint.text}
                <SourceLink id={hint.sourceId} />
              </li>
            ))}
          </ul>
        </section>

        <section
          className="panel col-span-4 flex min-h-0 flex-col p-4"
          style={level === 'ok' ? undefined : { borderColor: ui.color, background: `color-mix(in srgb, ${ui.color} 7%, var(--color-hull))` }}
          aria-label="What to do now"
        >
          <h2 className="heading flex items-center gap-2 text-[1.2rem]">
            <StatusIcon level={level} size={22} />
            What to do now
          </h2>
          <div className="scroll-quiet mt-2 flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
            {findings.map((finding) => (
              <p key={`${finding.metric}-${finding.kind}`} className={`text-[0.93rem] font-semibold leading-snug ${LEVEL_UI[finding.level].text}`}>
                {finding.text}
                {finding.teamDefined && <span className="font-normal text-dim"> Reference value, team-defined.</span>}
              </p>
            ))}
            {envCheck && envCheck.level !== 'ok' && <p className={`text-[0.93rem] font-semibold ${ui.text}`}>{envCheck.text}</p>}
            <ul className="flex flex-col gap-1.5">
              {actions.map((action) => (
                <li key={action} className="flex gap-2.5 text-[0.99rem] leading-snug">
                  <span className="mt-[0.5em] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ui.color }} />
                  {action}
                </li>
              ))}
            </ul>
            {level !== 'ok' && (
              <p className="rounded-[12px] bg-void/60 px-3 py-2 text-[0.9rem] leading-snug text-dim">
                {env.env.support} {link.live ? '' : `${link.reply}.`}
              </p>
            )}
            {level === 'alert' && isOrgan && (
              <button className="tap tap-alert mt-1 w-full" onClick={() => go('sos')}>
                Open SOS guide
              </button>
            )}
          </div>
          <p className="mt-2 pr-[78px] text-[0.74rem] leading-snug text-faint">{GUIDANCE_NOTE}</p>
        </section>
      </div>
    </div>
  )
}

function SourceLink({ id }: { id: string }) {
  const src = source(id)
  return (
    <a href={src.url} target="_blank" rel="noreferrer" className="mt-0.5 block text-[0.78rem] leading-snug text-link underline decoration-link/40 underline-offset-2 hover:decoration-link">
      Source: {src.label}
    </a>
  )
}

/** Three or four round tick values covering the data. */
function niceTicks(values: number[], baseline?: number, band?: [number, number]): number[] {
  const all = [...values, ...(baseline !== undefined ? [baseline] : []), ...(band ?? [])]
  if (all.length === 0) return []
  const lo = Math.min(...all)
  const hi = Math.max(...all)
  const span = Math.max(hi - lo, 1e-6)
  const rough = span / 3
  const pow = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? pow * 10
  const ticks: number[] = []
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100)
  return ticks
}
