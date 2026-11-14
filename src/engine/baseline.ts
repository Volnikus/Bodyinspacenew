import {
  BASELINE_MIN_SAMPLES,
  BASELINE_RULES,
  BASELINE_WINDOW_DAYS,
  type BaselineRule,
} from '../data/thresholds'
import type { Point } from './types'

const DAY_MS = 24 * 60 * 60 * 1000

export interface Baseline {
  mean: number
  n: number
}

/**
 * Personal baseline: mean of the crew member's own readings in the 7 days before `now`.
 * The reading being judged (t >= now) is never part of its own baseline.
 */
export function rollingBaseline(
  series: readonly Point[],
  now: number,
  days: number = BASELINE_WINDOW_DAYS,
): Baseline | null {
  const from = now - days * DAY_MS
  let sum = 0
  let n = 0
  for (const point of series) {
    if (point.t >= from && point.t < now) {
      sum += point.value
      n += 1
    }
  }
  if (n < BASELINE_MIN_SAMPLES) return null
  return { mean: sum / n, n }
}

export interface Deviation {
  abs: number
  pct: number
}

export function deviation(value: number, mean: number): Deviation {
  const abs = value - mean
  return { abs, pct: mean === 0 ? 0 : (abs / mean) * 100 }
}

export interface BaselineFlag {
  metric: BaselineRule['metric']
  value: number
  mean: number
  deviation: Deviation
  direction: 'above' | 'below'
  rule: BaselineRule
}

export function checkRule(rule: BaselineRule, value: number, mean: number): BaselineFlag | null {
  const dev = deviation(value, mean)
  const size = rule.kind === 'percent' ? Math.abs(dev.pct) : Math.abs(dev.abs)
  // Compare with a tiny tolerance so 20.0% computed as 19.999999 still counts.
  if (size + 1e-9 < rule.threshold) return null
  const direction = dev.abs >= 0 ? 'above' : 'below'
  if (rule.direction === 'up' && direction !== 'above') return null
  if (rule.direction === 'down' && direction !== 'below') return null
  return { metric: rule.metric, value, mean, deviation: dev, direction, rule }
}

/** All personal-baseline flags for the current values. */
export function baselineFlags(
  current: Partial<Record<BaselineRule['metric'], number>>,
  history: Partial<Record<BaselineRule['metric'], readonly Point[]>>,
  now: number,
): BaselineFlag[] {
  const flags: BaselineFlag[] = []
  for (const rule of BASELINE_RULES) {
    const value = current[rule.metric]
    const series = history[rule.metric]
    if (value === undefined || !series) continue
    const base = rollingBaseline(series, now)
    if (!base) continue
    const flag = checkRule(rule, value, base.mean)
    if (flag) flags.push(flag)
  }
  return flags
}
