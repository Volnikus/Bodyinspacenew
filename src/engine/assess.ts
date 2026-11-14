import { METRIC_INFO, formatMetric } from '../data/metrics'
import { SLEEP, SPACE_SHIFT } from '../data/thresholds'
import { baselineFlags, type BaselineFlag } from './baseline'
import { bpCheck, exerciseCheck, glucoseCheck, phq9Check, sleepCheck, visionCheck, type Check } from './extras'
import { news2, partLevel, type News2Param, type News2Result } from './news2'
import { latestMetrics, series } from './readings'
import {
  worst,
  type Finding,
  type Level,
  type MetricKey,
  type Metrics,
  type OrganId,
  type OrganStatus,
  type Reading,
} from './types'

/**
 * Space-NEWS2 — the team's own method.
 *
 *   1. Official NEWS2 score, never modified.
 *   2. Personal-baseline drift: each vital sign against the crew member's own 7-day mean.
 *      Any drift lifts a "low risk" result to "caution" so slow changes are not missed.
 *   3. Space-adaptation hints: known in-flight shifts (+1 °C, +3 bpm, ~6 h sleep) are
 *      explained beside the score instead of silently changing it.
 *
 * Environment context (link delay, evacuation, radiation, cabin air) is layered on by
 * the caller, because it belongs to the vehicle rather than to one person.
 */
export interface Assessment {
  t: number
  metrics: Partial<Metrics>
  news2: News2Result
  baseline: BaselineFlag[]
  hints: Finding[]
  organs: Record<OrganId, OrganStatus>
  /** Space-NEWS2 level: NEWS2 band, raised to caution by any personal-baseline drift. */
  level: Level
  /** Worst of Space-NEWS2 and every body-zone check. */
  overall: Level
}

const ORGANS: OrganId[] = ['brain', 'eyes', 'heart', 'lungs', 'blood', 'bones', 'skin']

const NEWS2_VITAL: Record<'rr' | 'spo2' | 'sbp' | 'hr' | 'temp', { organ: OrganId; lowBelow: number }> = {
  rr: { organ: 'lungs', lowBelow: 12 },
  spo2: { organ: 'lungs', lowBelow: 96 },
  sbp: { organ: 'heart', lowBelow: 111 },
  hr: { organ: 'heart', lowBelow: 51 },
  temp: { organ: 'skin', lowBelow: 36.1 },
}

const BASELINE_ORGAN: Record<BaselineFlag['metric'], OrganId> = {
  hr: 'heart',
  sbp: 'heart',
  rr: 'lungs',
  spo2: 'lungs',
  temp: 'skin',
  reactionMs: 'brain',
}

export function baselineText(flag: BaselineFlag): string {
  const info = METRIC_INFO[flag.metric]
  const size =
    flag.rule.kind === 'percent'
      ? `${Math.round(Math.abs(flag.deviation.pct))}%`
      : `${Math.abs(flag.deviation.abs).toFixed(info.decimals)} ${info.unit}`
  const now = formatMetric(flag.metric, flag.value)
  const usual = formatMetric(flag.metric, flag.mean)
  return `${info.label} is ${size} ${flag.direction} your 7-day normal (${now} vs ${usual} ${info.unit}).`
}

function fromCheck(organ: OrganId, metric: MetricKey, check: Check): Finding {
  return {
    organ,
    metric,
    level: check.level,
    kind: 'threshold',
    text: check.text,
    sourceId: check.sourceId,
    teamDefined: check.teamDefined,
  }
}

/** Returns null until all six NEWS2 vital signs have been measured at least once. */
export function assess(readings: readonly Reading[], now: number): Assessment | null {
  const m = latestMetrics(readings, now)
  if (
    m.rr === undefined ||
    m.spo2 === undefined ||
    m.sbp === undefined ||
    m.hr === undefined ||
    m.temp === undefined
  ) {
    return null
  }
  const consciousness = m.consciousness ?? 'A'
  const score = news2({
    rr: m.rr,
    spo2: m.spo2,
    onO2: m.onO2 ?? false,
    sbp: m.sbp,
    hr: m.hr,
    consciousness,
    temp: m.temp,
  })

  const findings: Finding[] = []
  const hints: Finding[] = []

  // 1. NEWS2 parameters
  for (const key of Object.keys(NEWS2_VITAL) as (keyof typeof NEWS2_VITAL)[]) {
    const part = score.parts[key as News2Param]
    if (part === 0) continue
    const info = METRIC_INFO[key]
    const value = m[key] as number
    const side = value < NEWS2_VITAL[key].lowBelow ? 'low' : 'high'
    findings.push({
      organ: NEWS2_VITAL[key].organ,
      metric: key,
      level: partLevel(part),
      kind: 'news2',
      text: `${info.label} ${formatMetric(key, value)}${/^[%/°]/.test(info.unit) && info.unit !== '°C' ? '' : ' '}${info.unit} is ${side} (NEWS2 +${part}).`,
      sourceId: 'news2',
    })
  }
  if (score.parts.o2 > 0) {
    findings.push({ organ: 'lungs', metric: 'onO2', level: 'caution', kind: 'news2', text: `On supplemental oxygen (NEWS2 +${score.parts.o2}).`, sourceId: 'news2' })
  }
  if (score.parts.consciousness > 0) {
    findings.push({ organ: 'brain', metric: 'consciousness', level: 'alert', kind: 'news2', text: `Not fully alert (NEWS2 +${score.parts.consciousness}).`, sourceId: 'news2' })
  }

  // 2. Personal baseline
  const flags = baselineFlags(
    { hr: m.hr, rr: m.rr, sbp: m.sbp, temp: m.temp, spo2: m.spo2, reactionMs: m.reactionMs },
    {
      hr: series(readings, 'hr', now),
      rr: series(readings, 'rr', now),
      sbp: series(readings, 'sbp', now),
      temp: series(readings, 'temp', now),
      spo2: series(readings, 'spo2', now),
      reactionMs: series(readings, 'reactionMs', now),
    },
    lastTime(readings, now),
  )
  for (const flag of flags) {
    findings.push({
      organ: BASELINE_ORGAN[flag.metric],
      metric: flag.metric,
      level: 'caution',
      kind: 'baseline',
      text: baselineText(flag),
      sourceId: 'spaceNews2',
      teamDefined: true,
    })
  }

  // 3. Thresholds outside NEWS2
  if (m.dbp !== undefined) {
    const bp = bpCheck(m.sbp, m.dbp)
    if (bp.level !== 'ok') findings.push(fromCheck('heart', 'dbp', bp))
  }
  if (m.glucose !== undefined) {
    const glucose = glucoseCheck(m.glucose, consciousness !== 'A')
    if (glucose.level !== 'ok') findings.push(fromCheck('blood', 'glucose', glucose))
  }
  const nights = series(readings, 'sleepH', now).map((p) => p.value)
  if (nights.length > 0) {
    const sleep = sleepCheck(nights)
    if (sleep.level !== 'ok') findings.push(fromCheck('brain', 'sleepH', sleep))
  }
  if (m.phq9 !== undefined) {
    const mood = phq9Check(m.phq9, m.phq9Item9 ?? 0)
    if (mood.level !== 'ok') findings.push(fromCheck('brain', 'phq9', mood))
  }
  const vision = visionCheck(m.amslerDistortion ?? false, m.visionWorse ?? false, m.headache ?? false)
  if (vision.level !== 'ok') findings.push(fromCheck('eyes', 'amslerDistortion', vision))

  const exercise = series(readings, 'exerciseMin', now).slice(-7)
  if (exercise.length > 0) {
    const avg = exercise.reduce((sum, p) => sum + p.value, 0) / exercise.length
    const check = exerciseCheck(avg)
    if (check.level !== 'ok') findings.push(fromCheck('bones', 'exerciseMin', check))
  }

  // 4. Space-adaptation hints (explain, never rescore)
  if (score.parts.temp === 1 && m.temp > 38.0) {
    hints.push({
      organ: 'skin',
      metric: 'temp',
      level: 'ok',
      kind: 'hint',
      text: `In flight, resting core temperature runs about ${SPACE_SHIFT.tempC} °C higher than on Earth. This may be adaptation. The NEWS2 score is unchanged.`,
      sourceId: 'stahn2017',
    })
  }
  if (score.parts.hr === 1 && m.hr > 90 && m.hr <= 90 + SPACE_SHIFT.hrBpm) {
    hints.push({
      organ: 'heart',
      metric: 'hr',
      level: 'ok',
      kind: 'hint',
      text: `In flight, resting heart rate runs about ${SPACE_SHIFT.hrBpm} bpm higher. This may be adaptation. The NEWS2 score is unchanged.`,
      sourceId: 'hrShift',
    })
  }
  if (nights.length > 0 && nights[nights.length - 1] < SLEEP.normalMin) {
    hints.push({
      organ: 'brain',
      metric: 'sleepH',
      level: 'ok',
      kind: 'hint',
      text: `Station crews average about ${SPACE_SHIFT.sleepH} h of sleep. Short nights are common in flight and still add up.`,
      sourceId: 'barger2014',
    })
  }

  const organs = {} as Record<OrganId, OrganStatus>
  for (const organ of ORGANS) {
    const own = findings.filter((f) => f.organ === organ)
    organs[organ] = { level: worst(...own.map((f) => f.level)), findings: own }
  }

  const level = worst(score.level, flags.length > 0 ? 'caution' : 'ok')
  const overall = worst(level, ...ORGANS.map((organ) => organs[organ].level))

  return { t: lastTime(readings, now), metrics: m, news2: score, baseline: flags, hints, organs, level, overall }
}

function lastTime(readings: readonly Reading[], now: number): number {
  for (let i = readings.length - 1; i >= 0; i -= 1) {
    if (readings[i].t <= now) return readings[i].t
  }
  return now
}
