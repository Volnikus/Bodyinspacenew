import { CREW, type CrewMember } from '../data/crew'
import type { Metrics, Reading } from '../engine/types'
import { DAY, HOUR, MIN } from '../state/time'
import { gaussian, hashSeed, mulberry32 } from './prng'

/**
 * Deterministic simulator. Open NASA data has no astronaut vital signs, so every
 * reading here is synthetic and labelled "Simulated" in the interface. The set of
 * parameters follows the Canadian Space Agency Bio-Monitor (heart rate, blood
 * pressure, breathing rate, SpO2, skin temperature, activity).
 */

/** The demo always opens on mission day 90 at 11:40 ship time. */
export const MISSION_DAY = 90
export const NOW0 = (MISSION_DAY - 1) * DAY + 11 * HOUR + 40 * MIN

const VITAL_TIMES = [7 * HOUR + 30 * MIN, 13 * HOUR + 30 * MIN, 20 * HOUR + 30 * MIN]
const CIRCADIAN_HR = [-2, 0, 2]
const CIRCADIAN_TEMP = [-0.15, 0, 0.15]
const NOISE = { hr: 2, sbp: 2.5, dbp: 2, rr: 0.8, spo2: 0.5, temp: 0.08, glucose: 3, sleepH: 0.3, exerciseMin: 9, reactionMs: 12 }

export type LiveVitals = Pick<Metrics, 'hr' | 'rr' | 'spo2' | 'sbp' | 'dbp'>
export const LIVE_KEYS = ['hr', 'rr', 'spo2', 'sbp', 'dbp'] as const

/** What makes each crew member worth looking at when the demo opens. */
interface Story {
  /** Vital signs measured this morning (07:30). */
  morning?: Partial<Metrics>
  /** Last three nights of sleep, oldest first. `null` means not logged yet today. */
  lastNights: (number | null)[]
  /** Values the wearable is reporting right now. */
  live?: Partial<LiveVitals>
}

const STORY: Record<string, Story> = {
  okafor: { lastNights: [7.2, 7.6, 7.4] },
  // Heart rate has crept up since this morning: still inside NEWS2 normal, 24% above his own baseline.
  seitkali: { lastNights: [7.3, 6.9, 7.1], live: { hr: 88 } },
  // Warm and short on sleep: both expected in flight, both explained by a hint.
  ferreira: { morning: { temp: 38.2 }, lastNights: [6.4, 6.0, 6.2] },
  // Has not logged sleep today and is behind on exercise.
  lindqvist: { lastNights: [7.6, 7.5, null] },
}

const round = (value: number, decimals = 0) => {
  const f = 10 ** decimals
  return Math.round(value * f) / f
}

function vitalsHistory(crew: CrewMember, rand: () => number): Reading[] {
  const readings: Reading[] = []
  const today = MISSION_DAY - 1
  for (let day = today - 7; day <= today; day += 1) {
    VITAL_TIMES.forEach((offset, slot) => {
      const t = day * DAY + offset
      if (t <= NOW0 - 7 * DAY || t >= NOW0) return
      readings.push({
        crewId: crew.id,
        t,
        source: 'simulated',
        m: {
          hr: crew.base.hr + CIRCADIAN_HR[slot] + gaussian(rand) * NOISE.hr,
          sbp: crew.base.sbp + gaussian(rand) * NOISE.sbp,
          dbp: crew.base.dbp + gaussian(rand) * NOISE.dbp,
          rr: crew.base.rr + gaussian(rand) * NOISE.rr,
          spo2: Math.min(100, crew.base.spo2 + gaussian(rand) * NOISE.spo2),
          temp: crew.base.temp + CIRCADIAN_TEMP[slot] + gaussian(rand) * NOISE.temp,
          onO2: false,
          consciousness: 'A',
        },
      })
    })
  }

  // This morning's reading follows the story.
  const morning = readings[readings.length - 1]
  morning.m = {
    ...morning.m,
    hr: crew.base.hr,
    sbp: crew.base.sbp,
    dbp: crew.base.dbp,
    rr: crew.base.rr,
    spo2: crew.base.spo2,
    temp: crew.base.temp,
    ...STORY[crew.id]?.morning,
  }

  // Shift the earlier readings so the 7-day mean is exactly the crew member's personal norm.
  const earlier = readings.slice(0, -1)
  for (const key of ['hr', 'sbp', 'dbp', 'rr', 'spo2', 'temp'] as const) {
    const mean = readings.reduce((sum, r) => sum + (r.m[key] as number), 0) / readings.length
    const shift = ((crew.base[key] - mean) * readings.length) / earlier.length
    for (const reading of earlier) {
      reading.m[key] = round((reading.m[key] as number) + shift, 2)
    }
  }
  return readings
}

function dailyLogs(crew: CrewMember, rand: () => number): Reading[] {
  const readings: Reading[] = []
  const today = MISSION_DAY - 1
  const nights = STORY[crew.id]?.lastNights ?? []

  for (let day = today - 7; day <= today; day += 1) {
    const back = today - day // 0 = today
    const scripted = back < nights.length ? nights[nights.length - 1 - back] : undefined
    if (scripted !== null) {
      const sleepH = scripted ?? round(crew.base.sleepH + gaussian(rand) * NOISE.sleepH, 1)
      readings.push({ crewId: crew.id, t: day * DAY + 7 * HOUR, source: 'simulated', m: { sleepH } })
    }
    readings.push({
      crewId: crew.id,
      t: day * DAY + 7 * HOUR + 15 * MIN,
      source: 'simulated',
      m: { glucose: round(crew.base.glucose + gaussian(rand) * NOISE.glucose) },
    })
    readings.push({
      crewId: crew.id,
      t: day * DAY + 10 * HOUR,
      source: 'simulated',
      m: { reactionMs: round(crew.base.reactionMs + gaussian(rand) * NOISE.reactionMs) },
    })
    if (day < today) {
      readings.push({
        crewId: crew.id,
        t: day * DAY + 21 * HOUR,
        source: 'simulated',
        m: { exerciseMin: Math.max(0, round(crew.base.exerciseMin + gaussian(rand) * NOISE.exerciseMin)) },
      })
    }
  }

  // Weekly mood check and vision self-check, five days ago.
  readings.push({
    crewId: crew.id,
    t: (today - 5) * DAY + 19 * HOUR,
    source: 'simulated',
    m: { phq9: 1 + Math.floor(rand() * 3), phq9Item9: 0, amslerDistortion: false, visionWorse: false, headache: false },
  })
  return readings
}

export function generateHistory(crew: CrewMember): Reading[] {
  const rand = mulberry32(hashSeed(`body-in-space:${crew.id}`))
  return [...vitalsHistory(crew, rand), ...dailyLogs(crew, rand)].sort((a, b) => a.t - b.t)
}

/** Simulated history for the whole crew, generated once. */
export const SIM_READINGS: Record<string, Reading[]> = Object.fromEntries(
  CREW.map((crew) => [crew.id, generateHistory(crew)]),
)

export function initialLiveTargets(): Record<string, LiveVitals> {
  return Object.fromEntries(
    CREW.map((crew) => [
      crew.id,
      {
        hr: crew.base.hr,
        rr: crew.base.rr,
        spo2: crew.base.spo2,
        sbp: crew.base.sbp,
        dbp: crew.base.dbp,
        ...STORY[crew.id]?.live,
      },
    ]),
  )
}

const LIVE_NOISE: Record<keyof LiveVitals, number> = { hr: 0.22, rr: 0.25, spo2: 0.22, sbp: 0.6, dbp: 0.5 }

/** One wearable sample around the current target. */
export function liveSample(target: LiveVitals, rand: () => number): LiveVitals {
  return {
    hr: Math.round(target.hr + gaussian(rand) * LIVE_NOISE.hr),
    rr: Math.round(target.rr + gaussian(rand) * LIVE_NOISE.rr),
    spo2: Math.min(100, Math.round(target.spo2 + gaussian(rand) * LIVE_NOISE.spo2)),
    sbp: Math.round(target.sbp + gaussian(rand) * LIVE_NOISE.sbp),
    dbp: Math.round(target.dbp + gaussian(rand) * LIVE_NOISE.dbp),
  }
}

/**
 * Demo scenario: a crew member deteriorates over about 12 seconds
 * (pulse climbs, oxygen saturation and blood pressure fall, breathing speeds up).
 */
export const SCENARIO_CREW_ID = 'seitkali'
export const SCENARIO_RAMP_MS = 12_000
const SCENARIO_END: LiveVitals = { hr: 136, rr: 27, spo2: 89, sbp: 94, dbp: 58 }

export function scenarioTarget(start: LiveVitals, elapsedMs: number): LiveVitals {
  const p = Math.min(1, Math.max(0, elapsedMs / SCENARIO_RAMP_MS))
  const eased = p * p * (3 - 2 * p)
  const mix = (a: number, b: number) => a + (b - a) * eased
  return {
    hr: mix(start.hr, SCENARIO_END.hr),
    rr: mix(start.rr, SCENARIO_END.rr),
    spo2: mix(start.spo2, SCENARIO_END.spo2),
    sbp: mix(start.sbp, SCENARIO_END.sbp),
    dbp: mix(start.dbp, SCENARIO_END.dbp),
  }
}
