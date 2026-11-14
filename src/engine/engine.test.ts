import { describe, expect, it } from 'vitest'
import { assess } from './assess'
import { baselineFlags, checkRule, rollingBaseline } from './baseline'
import { bpCheck, co2Check, exerciseCheck, glucoseCheck, phq9Check, radiationCheck, sleepCheck, visionCheck } from './extras'
import type { Metrics, Reading } from './types'
import { BASELINE_RULES } from '../data/thresholds'

const DAY = 24 * 60 * 60 * 1000
const HOUR = 60 * 60 * 1000

describe('personal baseline', () => {
  const now = 10 * DAY
  const flat = (value: number, count = 8) =>
    Array.from({ length: count }, (_, i) => ({ t: now - (i + 1) * 12 * HOUR, value }))

  it('averages only the 7 days before now and excludes the current reading', () => {
    const series = [
      { t: now - 8 * DAY, value: 200 }, // too old
      { t: now - 6 * DAY, value: 70 },
      { t: now - 3 * DAY, value: 80 },
      { t: now - 1 * DAY, value: 90 },
      { t: now, value: 999 }, // the reading being judged
    ]
    expect(rollingBaseline(series, now)).toEqual({ mean: 80, n: 3 })
  })

  it('needs at least 3 samples', () => {
    expect(rollingBaseline(flat(70, 2), now)).toBeNull()
  })

  it('flags heart rate exactly 20% above baseline, not 19%', () => {
    const rule = BASELINE_RULES.find((r) => r.metric === 'hr')!
    expect(checkRule(rule, 96, 80)?.direction).toBe('above') // +20%
    expect(checkRule(rule, 95, 80)).toBeNull() // +18.75%
    expect(checkRule(rule, 64, 80)?.direction).toBe('below') // -20%
  })

  it('flags SpO2 only when it drops 3 points, never when it rises', () => {
    const rule = BASELINE_RULES.find((r) => r.metric === 'spo2')!
    expect(checkRule(rule, 95, 98)).not.toBeNull()
    expect(checkRule(rule, 96, 98)).toBeNull()
    expect(checkRule(rule, 100, 96)).toBeNull()
  })

  it('flags temperature 1.0 °C away from baseline', () => {
    const rule = BASELINE_RULES.find((r) => r.metric === 'temp')!
    expect(checkRule(rule, 38.6, 37.6)).not.toBeNull()
    expect(checkRule(rule, 38.5, 37.6)).toBeNull()
  })

  it('collects flags across metrics', () => {
    const flags = baselineFlags({ hr: 100, rr: 16 }, { hr: flat(78), rr: flat(16) }, now)
    expect(flags.map((f) => f.metric)).toEqual(['hr'])
    expect(Math.round(flags[0].deviation.pct)).toBe(28)
  })
})

describe('thresholds outside NEWS2', () => {
  it('blood pressure (AHA 2025)', () => {
    expect(bpCheck(118, 76).level).toBe('ok')
    expect(bpCheck(129, 79).level).toBe('ok')
    expect(bpCheck(130, 79).level).toBe('caution')
    expect(bpCheck(125, 80).level).toBe('caution')
    expect(bpCheck(140, 85).text).toContain('stage 2')
    expect(bpCheck(180, 120).level).toBe('caution')
    expect(bpCheck(181, 100).level).toBe('alert')
    expect(bpCheck(150, 121).level).toBe('alert')
    expect(bpCheck(90, 60).level).toBe('alert')
    expect(bpCheck(91, 60).level).toBe('ok')
  })

  it('fasting glucose (ADA)', () => {
    expect(glucoseCheck(53).level).toBe('alert')
    expect(glucoseCheck(54).level).toBe('caution')
    expect(glucoseCheck(69).level).toBe('caution')
    expect(glucoseCheck(69, true).level).toBe('alert')
    expect(glucoseCheck(70).level).toBe('ok')
    expect(glucoseCheck(99).level).toBe('ok')
    expect(glucoseCheck(100).level).toBe('caution')
    expect(glucoseCheck(125).teamDefined).toBeUndefined()
    expect(glucoseCheck(126).teamDefined).toBe(true)
  })

  it('sleep', () => {
    expect(sleepCheck([7.5, 8, 7]).level).toBe('ok')
    expect(sleepCheck([8, 8, 6.9]).level).toBe('caution')
    expect(sleepCheck([5.9, 5.5, 5.8]).level).toBe('alert')
    expect(sleepCheck([5.9, 6.0, 5.8]).level).toBe('caution')
    expect(sleepCheck([]).level).toBe('ok')
  })

  it('PHQ-9', () => {
    expect(phq9Check(4, 0).level).toBe('ok')
    expect(phq9Check(5, 0).level).toBe('caution')
    expect(phq9Check(9, 0).level).toBe('caution')
    expect(phq9Check(10, 0).level).toBe('alert')
    expect(phq9Check(2, 1).level).toBe('alert')
  })

  it('vision self-check', () => {
    expect(visionCheck(false, false, true).level).toBe('ok')
    expect(visionCheck(true, false, false).level).toBe('caution')
    expect(visionCheck(false, true, true).level).toBe('alert')
  })

  it('exercise', () => {
    expect(exerciseCheck(60).level).toBe('ok')
    expect(exerciseCheck(59).level).toBe('caution')
  })

  it('cabin CO2 (NASA-STD-3001)', () => {
    expect(co2Check(2.0, 2.5).level).toBe('ok')
    expect(co2Check(2.0, 2.6).level).toBe('caution')
    expect(co2Check(3.0, 2.0).level).toBe('ok')
    expect(co2Check(3.1, 2.0).level).toBe('alert')
  })

  it('radiation limits', () => {
    expect(radiationCheck({ careerMsv: 160, eventMsv: 0, solarEvent: false }).level).toBe('ok')
    expect(radiationCheck({ careerMsv: 160, eventMsv: 5, solarEvent: true }).level).toBe('caution')
    expect(radiationCheck({ careerMsv: 160, eventMsv: 250, solarEvent: true }).level).toBe('alert')
    expect(radiationCheck({ careerMsv: 600, eventMsv: 0, solarEvent: false }).level).toBe('alert')
  })
})

describe('Space-NEWS2 assessment', () => {
  const now = 20 * DAY
  const base: Partial<Metrics> = { rr: 15, spo2: 98, onO2: false, sbp: 118, dbp: 76, hr: 72, consciousness: 'A', temp: 37.6 }
  const history = (patch: Partial<Metrics> = {}): Reading[] =>
    Array.from({ length: 14 }, (_, i) => ({
      crewId: 'c1',
      t: now - (14 - i) * 12 * HOUR,
      m: { ...base, ...patch },
      source: 'simulated' as const,
    }))
  const withNow = (m: Partial<Metrics>): Reading[] => [...history(), { crewId: 'c1', t: now, m, source: 'manual' }]

  it('returns null without a full set of vitals', () => {
    expect(assess([{ crewId: 'c1', t: now, m: { hr: 70 }, source: 'manual' }], now)).toBeNull()
  })

  it('healthy crew member is green everywhere', () => {
    const result = assess(history(), now)!
    expect(result.news2.total).toBe(0)
    expect(result.level).toBe('ok')
    expect(result.overall).toBe('ok')
    expect(result.organs.heart.level).toBe('ok')
  })

  it('personal-baseline drift lifts a NEWS2 score of 0 to caution', () => {
    const result = assess(withNow({ hr: 89 }), now)! // +24% over 72, still NEWS2 0
    expect(result.news2.total).toBe(0)
    expect(result.news2.level).toBe('ok')
    expect(result.level).toBe('caution')
    expect(result.organs.heart.level).toBe('caution')
    expect(result.organs.heart.findings[0].text).toBe('Heart rate is 24% above your 7-day normal (89 vs 72 bpm).')
    expect(result.organs.heart.findings[0].teamDefined).toBe(true)
  })

  it('in-flight temperature gets a hint and keeps the official score', () => {
    const result = assess(withNow({ temp: 38.2 }), now)!
    expect(result.news2.parts.temp).toBe(1)
    expect(result.organs.skin.level).toBe('caution')
    expect(result.hints.some((h) => h.metric === 'temp')).toBe(true)
  })

  it('a red vital sign turns its body zone red', () => {
    const result = assess(withNow({ hr: 134, spo2: 90 }), now)!
    expect(result.organs.heart.level).toBe('alert')
    expect(result.organs.lungs.level).toBe('alert')
    expect(result.news2.band).toBe('medium')
    expect(result.overall).toBe('alert')
  })

  it('zones outside NEWS2 affect the overall status but not the score', () => {
    const result = assess(withNow({ glucose: 50 }), now)!
    expect(result.news2.total).toBe(0)
    expect(result.organs.blood.level).toBe('alert')
    expect(result.level).toBe('ok')
    expect(result.overall).toBe('alert')
  })

  it('ignores readings later than now', () => {
    const readings = [...withNow({ hr: 72 }), { crewId: 'c1', t: now + HOUR, m: { hr: 150 }, source: 'simulated' as const }]
    expect(assess(readings, now)!.metrics.hr).toBe(72)
  })
})
