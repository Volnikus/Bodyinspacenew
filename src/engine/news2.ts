import {
  NEWS2_AGGREGATE,
  NEWS2_BANDS,
  NEWS2_NOT_ALERT_SCORE,
  NEWS2_ON_OXYGEN_SCORE,
  type Band,
} from '../data/thresholds'
import type { Consciousness, Level } from './types'

export interface News2Input {
  rr: number
  spo2: number
  onO2: boolean
  sbp: number
  hr: number
  consciousness: Consciousness
  temp: number
}

export type News2Param = 'rr' | 'spo2' | 'o2' | 'sbp' | 'hr' | 'consciousness' | 'temp'
export type News2Band = 'low' | 'low-medium' | 'medium' | 'high'

export interface News2Result {
  parts: Record<News2Param, number>
  total: number
  /** Parameters that score 3 on their own. */
  redParams: News2Param[]
  singleRed: boolean
  band: News2Band
  level: Level
  /** Short clinical-risk label for the band. */
  label: string
  /** What the band calls for. */
  response: string
}

export function scoreBand(bands: readonly Band[], value: number): number {
  for (const band of bands) {
    if (value <= band.max) return band.score
  }
  return bands[bands.length - 1].score
}

const whole = (n: number) => Math.round(n)
const oneDecimal = (n: number) => Math.round(n * 10) / 10

const BAND_TEXT: Record<News2Band, { level: Level; label: string; response: string }> = {
  low: { level: 'ok', label: 'Low risk', response: 'Keep routine checks.' },
  'low-medium': {
    level: 'caution',
    label: 'One vital sign in the red',
    response: 'Urgent assessment: re-measure now and review with the crew medical officer.',
  },
  medium: {
    level: 'caution',
    label: 'Medium risk',
    response: 'Urgent assessment: re-measure, rest, and report to the flight surgeon.',
  },
  high: {
    level: 'alert',
    label: 'High risk',
    response: 'Emergency: start the SOS guide and stay with the crewmate.',
  },
}

/** Official NEWS2 score (SpO2 Scale 1). No space adjustment is applied here. */
export function news2(input: News2Input): News2Result {
  const parts: Record<News2Param, number> = {
    rr: scoreBand(NEWS2_BANDS.rr, whole(input.rr)),
    spo2: scoreBand(NEWS2_BANDS.spo2, whole(input.spo2)),
    o2: input.onO2 ? NEWS2_ON_OXYGEN_SCORE : 0,
    sbp: scoreBand(NEWS2_BANDS.sbp, whole(input.sbp)),
    hr: scoreBand(NEWS2_BANDS.hr, whole(input.hr)),
    consciousness: input.consciousness === 'A' ? 0 : NEWS2_NOT_ALERT_SCORE,
    temp: scoreBand(NEWS2_BANDS.temp, oneDecimal(input.temp)),
  }

  const total = Object.values(parts).reduce((sum, score) => sum + score, 0)
  const redParams = (Object.keys(parts) as News2Param[]).filter((key) => parts[key] === 3)
  const singleRed = redParams.length > 0

  let band: News2Band = 'low'
  if (total >= NEWS2_AGGREGATE.highFrom) band = 'high'
  else if (total >= NEWS2_AGGREGATE.mediumFrom) band = 'medium'
  else if (singleRed) band = 'low-medium'

  return { parts, total, redParams, singleRed, band, ...BAND_TEXT[band] }
}

/** Colour level of a single NEWS2 parameter score. */
export function partLevel(score: number): Level {
  if (score >= 3) return 'alert'
  if (score >= 1) return 'caution'
  return 'ok'
}
