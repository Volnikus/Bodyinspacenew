import { describe, expect, it } from 'vitest'
import { news2, partLevel, type News2Input } from './news2'

const normal: News2Input = { rr: 16, spo2: 98, onO2: false, sbp: 120, hr: 70, consciousness: 'A', temp: 37.0 }
const score = (patch: Partial<News2Input>) => news2({ ...normal, ...patch })

describe('NEWS2 parameter boundaries (RCP Scale 1)', () => {
  it.each([
    [8, 3], [9, 1], [11, 1], [12, 0], [20, 0], [21, 2], [24, 2], [25, 3],
  ])('respiratory rate %i → %i', (rr, expected) => {
    expect(score({ rr }).parts.rr).toBe(expected)
  })

  it.each([
    [91, 3], [92, 2], [93, 2], [94, 1], [95, 1], [96, 0], [100, 0],
  ])('SpO2 %i → %i', (spo2, expected) => {
    expect(score({ spo2 }).parts.spo2).toBe(expected)
  })

  it('supplemental oxygen scores 2, room air scores 0', () => {
    expect(score({ onO2: true }).parts.o2).toBe(2)
    expect(score({ onO2: false }).parts.o2).toBe(0)
  })

  it.each([
    [90, 3], [91, 2], [100, 2], [101, 1], [110, 1], [111, 0], [219, 0], [220, 3],
  ])('systolic pressure %i → %i', (sbp, expected) => {
    expect(score({ sbp }).parts.sbp).toBe(expected)
  })

  it.each([
    [40, 3], [41, 1], [50, 1], [51, 0], [90, 0], [91, 1], [110, 1], [111, 2], [130, 2], [131, 3],
  ])('pulse %i → %i', (hr, expected) => {
    expect(score({ hr }).parts.hr).toBe(expected)
  })

  it.each([
    ['A', 0], ['C', 3], ['V', 3], ['P', 3], ['U', 3],
  ] as const)('consciousness %s → %i', (consciousness, expected) => {
    expect(score({ consciousness }).parts.consciousness).toBe(expected)
  })

  it.each([
    [35.0, 3], [35.1, 1], [36.0, 1], [36.1, 0], [38.0, 0], [38.1, 1], [39.0, 1], [39.1, 2], [40.5, 2],
  ])('temperature %f → %i', (temp, expected) => {
    expect(score({ temp }).parts.temp).toBe(expected)
  })

  it('rounds temperature to one decimal before banding', () => {
    expect(score({ temp: 38.04 }).parts.temp).toBe(0)
    expect(score({ temp: 38.05 }).parts.temp).toBe(1)
  })
})

describe('NEWS2 aggregate bands', () => {
  it('all-normal vitals score 0, low risk', () => {
    const result = score({})
    expect(result.total).toBe(0)
    expect(result.band).toBe('low')
    expect(result.level).toBe('ok')
    expect(result.singleRed).toBe(false)
  })

  it('total 4 without a red parameter stays low risk', () => {
    const result = score({ rr: 22, onO2: true }) // 2 + 2
    expect(result.total).toBe(4)
    expect(result.band).toBe('low')
  })

  it('a single parameter scoring 3 forces urgent assessment even when the total is under 5', () => {
    const result = score({ hr: 135 })
    expect(result.total).toBe(3)
    expect(result.singleRed).toBe(true)
    expect(result.redParams).toEqual(['hr'])
    expect(result.band).toBe('low-medium')
    expect(result.level).toBe('caution')
  })

  it('total 5 and 6 are medium risk', () => {
    expect(score({ rr: 22, onO2: true, hr: 95 }).total).toBe(5)
    expect(score({ rr: 22, onO2: true, hr: 95 }).band).toBe('medium')
    expect(score({ rr: 22, onO2: true, hr: 115 }).total).toBe(6)
    expect(score({ rr: 22, onO2: true, hr: 115 }).band).toBe('medium')
  })

  it('total 7 or more is high risk', () => {
    const result = score({ rr: 22, onO2: true, hr: 135 }) // 2 + 2 + 3
    expect(result.total).toBe(7)
    expect(result.band).toBe('high')
    expect(result.level).toBe('alert')
  })

  it('chest-pain collapse scenario scores high', () => {
    const result = news2({ rr: 26, spo2: 90, onO2: false, sbp: 88, hr: 134, consciousness: 'U', temp: 36.4 })
    expect(result.total).toBe(15)
    expect(result.redParams.sort()).toEqual(['consciousness', 'hr', 'rr', 'sbp', 'spo2'])
    expect(result.band).toBe('high')
  })
})

describe('parameter colour level', () => {
  it('maps score to level', () => {
    expect(partLevel(0)).toBe('ok')
    expect(partLevel(1)).toBe('caution')
    expect(partLevel(2)).toBe('caution')
    expect(partLevel(3)).toBe('alert')
  })
})
