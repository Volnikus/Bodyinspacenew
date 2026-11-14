export type Level = 'ok' | 'caution' | 'alert'

const RANK: Record<Level, number> = { ok: 0, caution: 1, alert: 2 }

export function worst(...levels: Level[]): Level {
  return levels.reduce<Level>((a, b) => (RANK[b] > RANK[a] ? b : a), 'ok')
}

/** ACVPU: Alert, new Confusion, responds to Voice, responds to Pain, Unresponsive. */
export type Consciousness = 'A' | 'C' | 'V' | 'P' | 'U'

export type OrganId = 'brain' | 'eyes' | 'heart' | 'lungs' | 'blood' | 'bones' | 'skin'
export type EnvZoneId = 'air' | 'radiation'
export type ZoneId = OrganId | EnvZoneId

/** Everything a crew member can measure or log. NEWS2 uses the first eight fields. */
export interface Metrics {
  rr: number
  spo2: number
  onO2: boolean
  sbp: number
  dbp: number
  hr: number
  consciousness: Consciousness
  temp: number
  /** Fasting glucose, mg/dL. */
  glucose: number
  sleepH: number
  phq9: number
  phq9Item9: number
  exerciseMin: number
  reactionMs: number
  amslerDistortion: boolean
  visionWorse: boolean
  headache: boolean
}

export type MetricKey = keyof Metrics
export type NumericMetricKey = {
  [K in MetricKey]: Metrics[K] extends number ? K : never
}[MetricKey]

export type ReadingSource = 'simulated' | 'manual' | 'tablet'

export interface Reading {
  crewId: string
  /** Mission time, ms. */
  t: number
  m: Partial<Metrics>
  source: ReadingSource
}

export interface Point {
  t: number
  value: number
}

export type FindingKind = 'news2' | 'threshold' | 'baseline' | 'hint'

export interface Finding {
  organ: OrganId
  metric: MetricKey
  level: Level
  kind: FindingKind
  /** One plain-language sentence. */
  text: string
  sourceId: string
  /** True when the rule is the team's own design rather than a published threshold. */
  teamDefined?: boolean
}

export interface OrganStatus {
  level: Level
  findings: Finding[]
}
