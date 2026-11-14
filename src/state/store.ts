import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EnvId } from '../data/environments'
import { INITIAL_EXERCISE_TODAY, initialTasksDone, taskKey } from '../data/tasks'
import type { Metrics, Reading, ReadingSource } from '../engine/types'
import { mulberry32 } from '../sim/prng'
import {
  LIVE_KEYS,
  MISSION_DAY,
  NOW0,
  SCENARIO_CREW_ID,
  initialLiveTargets,
  liveSample,
  scenarioTarget,
  type LiveVitals,
} from '../sim/simulator'
import { missionDay } from './time'

const STORAGE_KEY = 'body-in-space-v1'
const TRACE_LENGTH = 48

export interface OutboxMessage {
  id: string
  kind: 'question' | 'incident' | 'report'
  title: string
  body: string
  crewId: string
  /** Mission time the message was queued. */
  sentAt: number
  /** One-way delay at the time of sending, ms. */
  delayMs: number
}

interface AppState {
  envId: EnvId
  selectedCrewId: string
  /** Mission ms elapsed since the demo start, kept so a reload resumes the clock. */
  elapsed: number
  now: number
  /** Readings entered by the crew or produced by tablet tests. */
  manual: Reading[]
  liveTarget: Record<string, LiveVitals>
  live: Record<string, LiveVitals>
  /** Recent heart-rate samples for the live trace. */
  trace: Record<string, number[]>
  tasksDone: Record<string, true>
  exerciseToday: Record<string, number>
  outbox: OutboxMessage[]
  scenario: { crewId: string; startedReal: number; from: LiveVitals } | null
  /** 1 = real time. 60 = demo time, one second shows one minute. */
  timeScale: number

  tick: () => void
  setEnv: (envId: EnvId) => void
  selectCrew: (crewId: string) => void
  logReading: (crewId: string, m: Partial<Metrics>, source?: ReadingSource) => void
  completeTask: (crewId: string, taskId: string) => void
  queueMessage: (message: Omit<OutboxMessage, 'id' | 'sentAt'>) => OutboxMessage
  startScenario: () => void
  setTimeScale: (scale: number) => void
}

// "?fresh" in the address starts from the untouched demo state (handy for recording).
if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('fresh')) {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage unavailable: nothing to clear.
  }
}

// The mission clock: mission time advances with real time from a movable base.
const clock = { mission: NOW0, real: Date.now() }
let liveRand = mulberry32(20261114)

function missionNow(scale: number): number {
  return clock.mission + (Date.now() - clock.real) * scale
}

function rebase(scale: number) {
  clock.mission = missionNow(scale)
  clock.real = Date.now()
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      envId: 'transit',
      selectedCrewId: SCENARIO_CREW_ID,
      elapsed: 0,
      now: NOW0,
      manual: [],
      liveTarget: initialLiveTargets(),
      live: initialLiveTargets(),
      trace: {},
      tasksDone: initialTasksDone(MISSION_DAY),
      exerciseToday: { ...INITIAL_EXERCISE_TODAY },
      outbox: [],
      scenario: null,
      timeScale: 1,

      tick: () => {
        const state = get()
        const now = missionNow(state.timeScale)
        let liveTarget = state.liveTarget
        if (state.scenario) {
          const { crewId, startedReal, from } = state.scenario
          liveTarget = { ...liveTarget, [crewId]: scenarioTarget(from, Date.now() - startedReal) }
        }
        const live: Record<string, LiveVitals> = {}
        const trace: Record<string, number[]> = {}
        for (const crewId of Object.keys(liveTarget)) {
          live[crewId] = liveSample(liveTarget[crewId], liveRand)
          trace[crewId] = [...(state.trace[crewId] ?? []), live[crewId].hr].slice(-TRACE_LENGTH)
        }
        set({ now, elapsed: now - NOW0, liveTarget, live, trace })
      },

      setEnv: (envId) => set({ envId }),
      selectCrew: (selectedCrewId) => set({ selectedCrewId }),

      logReading: (crewId, m, source = 'manual') => {
        const state = get()
        const now = missionNow(state.timeScale)
        const reading: Reading = { crewId, t: now, m, source }
        // A fresh measurement becomes what the wearable agrees with from now on.
        const target = { ...state.liveTarget[crewId] }
        for (const key of LIVE_KEYS) {
          const value = m[key]
          if (typeof value === 'number') target[key] = value
        }
        const exerciseToday =
          typeof m.exerciseMin === 'number'
            ? { ...state.exerciseToday, [crewId]: m.exerciseMin }
            : state.exerciseToday
        set({
          manual: [...state.manual, reading],
          liveTarget: { ...state.liveTarget, [crewId]: target },
          live: { ...state.live, [crewId]: liveSample(target, liveRand) },
          exerciseToday,
          scenario: state.scenario?.crewId === crewId && LIVE_KEYS.some((k) => k in m) ? null : state.scenario,
          now,
          elapsed: now - NOW0,
        })
      },

      completeTask: (crewId, taskId) =>
        set((state) => ({
          tasksDone: { ...state.tasksDone, [taskKey(crewId, missionDay(state.now), taskId)]: true },
        })),

      queueMessage: (message) => {
        const state = get()
        const full: OutboxMessage = {
          ...message,
          id: `${Date.now()}-${state.outbox.length}`,
          sentAt: missionNow(state.timeScale),
        }
        set({ outbox: [...state.outbox, full] })
        return full
      },

      startScenario: () => {
        const state = get()
        set({
          selectedCrewId: SCENARIO_CREW_ID,
          scenario: { crewId: SCENARIO_CREW_ID, startedReal: Date.now(), from: state.liveTarget[SCENARIO_CREW_ID] },
        })
      },

      setTimeScale: (scale) => {
        rebase(get().timeScale)
        set({ timeScale: scale })
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      partialize: (state) => ({
        envId: state.envId,
        selectedCrewId: state.selectedCrewId,
        elapsed: state.elapsed,
        manual: state.manual,
        liveTarget: state.liveTarget,
        tasksDone: state.tasksDone,
        exerciseToday: state.exerciseToday,
        outbox: state.outbox,
      }),
    },
  ),
)

// Resume the mission clock where the last session stopped.
clock.mission = NOW0 + useApp.getState().elapsed
clock.real = Date.now()
useApp.setState({ now: clock.mission, live: useApp.getState().liveTarget })

/** Wipes every stored change and reloads, so the demo starts identically each time. */
export function resetDemo() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage can be unavailable in private windows; the reload still resets in-memory state.
  }
  liveRand = mulberry32(20261114)
  window.location.hash = ''
  window.location.reload()
}
