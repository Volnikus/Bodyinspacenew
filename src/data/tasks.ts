import { HOUR, MIN } from '../state/time'

export type TaskKind = 'sleep' | 'vitals' | 'test' | 'exercise' | 'mood'

export interface TaskDef {
  id: string
  title: string
  /** What KOMEK says when it is due. */
  nudge: string
  /** Ship time of day, ms after midnight. */
  at: number
  kind: TaskKind
  /** Where tapping the task takes you. */
  route: string
}

/** Daily health routine. Exercise follows the ~2 h/day ISS countermeasure plan. */
export const DAILY_TASKS: TaskDef[] = [
  { id: 'sleep', title: 'Log last night’s sleep', nudge: 'You haven’t logged sleep today.', at: 7 * HOUR, kind: 'sleep', route: 'measure/sleepH' },
  { id: 'vitals-am', title: 'Morning vitals', nudge: 'Morning vitals are due.', at: 7 * HOUR + 30 * MIN, kind: 'vitals', route: 'measure' },
  { id: 'reaction', title: 'Reaction test', nudge: 'Reaction test is due. It takes one minute.', at: 10 * HOUR, kind: 'test', route: 'tests' },
  { id: 'vitals-noon', title: 'Midday vitals', nudge: 'Midday vitals and blood pressure are due.', at: 13 * HOUR + 30 * MIN, kind: 'vitals', route: 'measure' },
  { id: 'exercise', title: 'Finish exercise, 120 min', nudge: 'Exercise is not finished yet.', at: 17 * HOUR, kind: 'exercise', route: 'measure/exerciseMin' },
  { id: 'vitals-pm', title: 'Evening vitals', nudge: 'Evening vitals are due.', at: 20 * HOUR + 30 * MIN, kind: 'vitals', route: 'measure' },
]

export const taskKey = (crewId: string, day: number, taskId: string) => `${crewId}:${day}:${taskId}`

/** Tasks already ticked off when the demo opens (day 90, 11:40). */
export function initialTasksDone(day: number): Record<string, true> {
  const done: Record<string, true> = {}
  const mark = (crewId: string, ids: string[]) => ids.forEach((id) => (done[taskKey(crewId, day, id)] = true))
  mark('okafor', ['sleep', 'vitals-am', 'reaction'])
  mark('seitkali', ['sleep', 'vitals-am', 'reaction'])
  mark('ferreira', ['sleep', 'vitals-am', 'reaction'])
  mark('lindqvist', ['vitals-am', 'reaction']) // sleep not logged
  return done
}

/** Minutes of exercise already done today when the demo opens. */
export const INITIAL_EXERCISE_TODAY: Record<string, number> = {
  okafor: 60,
  seitkali: 45,
  ferreira: 30,
  lindqvist: 0,
}
