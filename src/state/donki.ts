import { create } from 'zustand'

/**
 * Live space weather from NASA DONKI (Space Weather Database Of Notifications,
 * Knowledge, Information): solar flares and coronal mass ejections of the last 7 days.
 * The last successful answer is kept in localStorage, so the panel still shows the
 * most recent known event, with its date, when there is no connection.
 */

const API = 'https://api.nasa.gov/DONKI'
const KEY = 'DEMO_KEY'
const CACHE_KEY = 'body-in-space-donki-v1'
const TRY_KEY = 'body-in-space-donki-try'
const REFRESH_MS = 60 * 60 * 1000
const RETRY_MS = 10 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

export interface SolarEvent {
  id: string
  kind: 'Solar flare' | 'Coronal mass ejection'
  /** ISO time (UTC). */
  time: string
  /** Flare class such as "M2.3", or CME speed such as "640 km/s". */
  detail: string
  /** True when the event meets the team's shelter rule. */
  strong: boolean
  link?: string
}

interface Cache {
  fetchedAt: number
  events: SolarEvent[]
}

interface DonkiState {
  status: 'idle' | 'loading' | 'live' | 'cached' | 'unavailable'
  events: SolarEvent[]
  fetchedAt: number | null
  /** Demo switch: pretend a strong event was just reported. Labelled "Simulated" in the UI. */
  simulated: boolean
  load: () => Promise<void>
  setSimulated: (on: boolean) => void
}

/**
 * Shelter rule (team-defined, TODO: verify): an X-class flare, or a CME of 2000 km/s
 * or faster, reported in the last 24 hours. Weaker events are listed but do not alert.
 */
export const SHELTER_WINDOW_MS = DAY_MS
const isStrongFlare = (cls: string) => /^X/i.test(cls)
const isStrongCme = (speed: number | null) => speed !== null && speed >= 2000

function readCache(): Cache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as Cache) : null
  } catch {
    return null
  }
}

const day = (t: number) => new Date(t).toISOString().slice(0, 10)

async function getJson(path: string): Promise<unknown[]> {
  const now = Date.now()
  const response = await fetch(`${API}/${path}?startDate=${day(now - 7 * DAY_MS)}&endDate=${day(now)}&api_key=${KEY}`)
  if (!response.ok) throw new Error(`DONKI ${path} ${response.status}`)
  const data: unknown = await response.json()
  return Array.isArray(data) ? data : []
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function flares(rows: unknown[]): SolarEvent[] {
  return rows.map((row: any) => ({
    id: String(row.flrID),
    kind: 'Solar flare' as const,
    time: String(row.peakTime ?? row.beginTime),
    detail: `class ${row.classType ?? 'unknown'}`,
    strong: isStrongFlare(String(row.classType ?? '')),
    link: row.link,
  }))
}

function cmes(rows: unknown[]): SolarEvent[] {
  return rows.map((row: any) => {
    const analyses: any[] = row.cmeAnalyses ?? []
    const best = analyses.find((a) => a.isMostAccurate) ?? analyses[0]
    const speed = typeof best?.speed === 'number' ? Math.round(best.speed) : null
    return {
      id: String(row.activityID),
      kind: 'Coronal mass ejection' as const,
      time: String(row.startTime),
      detail: speed === null ? 'speed not analysed yet' : `${speed} km/s`,
      strong: isStrongCme(speed),
      link: row.link,
    }
  })
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const cached = typeof window === 'undefined' ? null : readCache()

export const useDonki = create<DonkiState>()((set, get) => ({
  // A recent saved answer counts as current: DEMO_KEY allows only a few requests per hour.
  status: cached ? (Date.now() - cached.fetchedAt < REFRESH_MS ? 'live' : 'cached') : 'idle',
  events: cached?.events ?? [],
  fetchedAt: cached?.fetchedAt ?? null,
  simulated: false,

  load: async () => {
    const state = get()
    if (state.status === 'loading') return
    if (state.fetchedAt && Date.now() - state.fetchedAt < REFRESH_MS && state.status === 'live') return
    // After a failed attempt, wait before asking again: the public demo key is rate-limited.
    try {
      const lastTry = Number(localStorage.getItem(TRY_KEY) ?? 0)
      if (Date.now() - lastTry < RETRY_MS) {
        set({ status: state.events.length > 0 ? 'cached' : 'unavailable' })
        return
      }
      localStorage.setItem(TRY_KEY, String(Date.now()))
    } catch {
      // No storage: just try.
    }
    set({ status: 'loading' })
    const [flr, cme] = await Promise.allSettled([getJson('FLR'), getJson('CME')])
    if (flr.status === 'rejected' && cme.status === 'rejected') {
      set({ status: get().events.length > 0 ? 'cached' : 'unavailable' })
      return
    }
    const events = [...(flr.status === 'fulfilled' ? flares(flr.value) : []), ...(cme.status === 'fulfilled' ? cmes(cme.value) : [])].sort(
      (a, b) => b.time.localeCompare(a.time),
    )
    const fetchedAt = Date.now()
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt, events } satisfies Cache))
    } catch {
      // No storage: the feed still works for this session.
    }
    set({ status: 'live', events, fetchedAt })
  },

  setSimulated: (simulated) => set({ simulated }),
}))

/** The event that currently calls for the storm shelter, if any. */
export function activeSolarEvent(state: Pick<DonkiState, 'events' | 'simulated'>, now = Date.now()): SolarEvent | null {
  if (state.simulated) {
    return { id: 'simulated', kind: 'Solar flare', time: new Date(now).toISOString(), detail: 'class X (simulated)', strong: true }
  }
  return state.events.find((e) => e.strong && now - Date.parse(e.time) < SHELTER_WINDOW_MS) ?? null
}
