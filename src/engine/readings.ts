import type { Metrics, NumericMetricKey, Point, Reading } from './types'

/** Most recent value of every metric at or before `now`. Readings must be sorted by time. */
export function latestMetrics(readings: readonly Reading[], now = Infinity): Partial<Metrics> {
  const merged: Partial<Metrics> = {}
  for (const reading of readings) {
    if (reading.t > now) break
    Object.assign(merged, reading.m)
  }
  return merged
}

/** Time series of one numeric metric. */
export function series(readings: readonly Reading[], key: NumericMetricKey, now = Infinity): Point[] {
  const points: Point[] = []
  for (const reading of readings) {
    if (reading.t > now) break
    const value = reading.m[key]
    if (typeof value === 'number') points.push({ t: reading.t, value })
  }
  return points
}

/** Time of the most recent reading that contains the metric, or null. */
export function lastMeasuredAt(readings: readonly Reading[], key: keyof Metrics, now = Infinity): number | null {
  for (let i = readings.length - 1; i >= 0; i -= 1) {
    const reading = readings[i]
    if (reading.t <= now && reading.m[key] !== undefined) return reading.t
  }
  return null
}
