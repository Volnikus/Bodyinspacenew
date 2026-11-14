import { useMemo } from 'react'
import { CREW, crewById } from '../data/crew'
import { ENVIRONMENTS, boneLossEstimate, type Environment } from '../data/environments'
import { DAILY_TASKS, taskKey, type TaskDef } from '../data/tasks'
import { assess, type Assessment } from '../engine/assess'
import { co2Check, radiationCheck, type Check } from '../engine/extras'
import { news2 } from '../engine/news2'
import { latestMetrics } from '../engine/readings'
import type { Point, Reading } from '../engine/types'
import { SIM_READINGS } from '../sim/simulator'
import { activeSolarEvent, useDonki } from './donki'
import { useApp } from './store'
import { DAY, missionDay } from './time'

/** Simulated history + crew entries + the current wearable sample, oldest first. */
export function buildReadings(
  crewId: string,
  manual: readonly Reading[],
  live: Reading['m'] | undefined,
  now: number,
): Reading[] {
  const readings = [...(SIM_READINGS[crewId] ?? []), ...manual.filter((r) => r.crewId === crewId)]
  if (live) readings.push({ crewId, t: now, m: live, source: 'simulated' })
  return readings
}

export function useReadings(crewId: string): Reading[] {
  const manual = useApp((s) => s.manual)
  const live = useApp((s) => s.live[crewId])
  const now = useApp((s) => s.now)
  // `now` only matters as the timestamp of the live sample, which changes with `live`.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => buildReadings(crewId, manual, live, now), [crewId, manual, live])
}

export function useAssessment(crewId: string): Assessment {
  const readings = useReadings(crewId)
  return useMemo(() => assess(readings, Infinity)!, [readings])
}

export function useAllAssessments(): Record<string, Assessment> {
  const manual = useApp((s) => s.manual)
  const live = useApp((s) => s.live)
  const now = useApp((s) => s.now)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(
    () => Object.fromEntries(CREW.map((c) => [c.id, assess(buildReadings(c.id, manual, live[c.id], now), Infinity)!])),
    [manual, live],
  )
}

export function useEnvironment(): Environment {
  return ENVIRONMENTS[useApp((s) => s.envId)]
}

export interface EnvStatus {
  env: Environment
  air: Check
  radiation: Check
  missionDoseMsv: number
  careerMsv: number
  boneLoss: { pct: number; isReference: boolean }
}

/** Vehicle-level context for one crew member: cabin air, radiation dose, bone-loss estimate. */
export function useEnvStatus(crewId: string): EnvStatus {
  const env = useEnvironment()
  const day = missionDay(useApp((s) => s.now))
  const donkiEvents = useDonki((s) => s.events)
  const simulated = useDonki((s) => s.simulated)
  return useMemo(() => {
    const solarEvent = activeSolarEvent({ events: donkiEvents, simulated }) !== null
    const missionDoseMsv = env.doseRateMsvDay * day
    const careerMsv = crewById(crewId).priorCareerMsv + missionDoseMsv
    return {
      env,
      air: co2Check(env.co2HourMean, env.co2WeekMean),
      radiation: radiationCheck({ careerMsv, eventMsv: 0, solarEvent }),
      missionDoseMsv,
      careerMsv,
      boneLoss: boneLossEstimate(env, day),
    }
  }, [env, day, crewId, donkiEvents, simulated])
}

/** NEWS2 total at every vitals reading in the last 24 h, plus now. */
export function news2Trend(readings: readonly Reading[], now: number): Point[] {
  const points: Point[] = []
  const from = now - DAY
  for (const reading of readings) {
    if (reading.t < from || reading.m.hr === undefined) continue
    const m = latestMetrics(readings, reading.t)
    if (m.rr === undefined || m.spo2 === undefined || m.sbp === undefined || m.hr === undefined || m.temp === undefined) continue
    const score = news2({
      rr: m.rr,
      spo2: m.spo2,
      onO2: m.onO2 ?? false,
      sbp: m.sbp,
      hr: m.hr,
      consciousness: m.consciousness ?? 'A',
      temp: m.temp,
    })
    points.push({ t: reading.t, value: score.total })
  }
  return points
}

export interface UpcomingTask {
  def: TaskDef
  /** Mission time the task is due. */
  dueAt: number
  /** Negative when overdue. */
  inMs: number
}

/** Today's open tasks for one crew member, soonest first (overdue first of all). */
export function openTasks(crewId: string, now: number, done: Record<string, true>): UpcomingTask[] {
  const day = missionDay(now)
  const dayStart = (day - 1) * DAY
  return DAILY_TASKS.filter((def) => !done[taskKey(crewId, day, def.id)])
    .map((def) => ({ def, dueAt: dayStart + def.at, inMs: dayStart + def.at - now }))
    .sort((a, b) => a.dueAt - b.dueAt)
}

export function useOpenTasks(crewId: string): UpcomingTask[] {
  const done = useApp((s) => s.tasksDone)
  // Re-evaluate once a minute rather than every second.
  const minute = Math.floor(useApp((s) => s.now) / 60_000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => openTasks(crewId, useApp.getState().now, done), [crewId, done, minute])
}
