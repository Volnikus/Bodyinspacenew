export const SEC = 1000
export const MIN = 60 * SEC
export const HOUR = 60 * MIN
export const DAY = 24 * HOUR

/** Mission time is milliseconds since 00:00 on mission day 1. */
export const missionDay = (t: number) => Math.floor(t / DAY) + 1

const pad = (n: number) => String(n).padStart(2, '0')

/** Ship clock, "09:40". */
export function clockText(t: number): string {
  const inDay = ((t % DAY) + DAY) % DAY
  return `${pad(Math.floor(inDay / HOUR))}:${pad(Math.floor((inDay % HOUR) / MIN))}`
}

/** Countdown, "14:32" or "1:02:10". */
export function countdownText(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / SEC))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/** Human duration, "1 h 50 min", "14 min 32 s", "1.3 s". */
export function durationText(ms: number): string {
  const abs = Math.abs(ms)
  if (abs < 10 * SEC) return `${(abs / SEC).toFixed(1).replace(/\.0$/, '')} s`
  if (abs < MIN) return `${Math.round(abs / SEC)} s`
  if (abs < HOUR) {
    const m = Math.floor(abs / MIN)
    const s = Math.round((abs % MIN) / SEC)
    return s === 0 || m >= 30 ? `${m} min` : `${m} min ${s} s`
  }
  if (abs < DAY) {
    const h = Math.floor(abs / HOUR)
    const m = Math.round((abs % HOUR) / MIN)
    return m === 0 ? `${h} h` : `${h} h ${m} min`
  }
  const d = Math.floor(abs / DAY)
  const h = Math.round((abs % DAY) / HOUR)
  return h === 0 ? `${d} d` : `${d} d ${h} h`
}

/** "Day 90, 09:40" */
export function stampText(t: number): string {
  return `Day ${missionDay(t)}, ${clockText(t)}`
}
