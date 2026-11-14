/**
 * Every medical threshold in the app lives here so it is easy to review and correct.
 * Values come from the published sources named beside them. Anything the team had to
 * choose itself is marked `teamDefined` and shown in the UI as a "reference value".
 */

export interface Band {
  /** Inclusive upper bound of the band. */
  max: number
  score: 0 | 1 | 2 | 3
}

/**
 * NEWS2 (Royal College of Physicians), SpO2 Scale 1.
 * Source: https://www.rcp.ac.uk/improving-care/resources/national-early-warning-score-news-2/
 */
export const NEWS2_BANDS = {
  rr: [
    { max: 8, score: 3 },
    { max: 11, score: 1 },
    { max: 20, score: 0 },
    { max: 24, score: 2 },
    { max: Infinity, score: 3 },
  ],
  spo2: [
    { max: 91, score: 3 },
    { max: 93, score: 2 },
    { max: 95, score: 1 },
    { max: Infinity, score: 0 },
  ],
  sbp: [
    { max: 90, score: 3 },
    { max: 100, score: 2 },
    { max: 110, score: 1 },
    { max: 219, score: 0 },
    { max: Infinity, score: 3 },
  ],
  hr: [
    { max: 40, score: 3 },
    { max: 50, score: 1 },
    { max: 90, score: 0 },
    { max: 110, score: 1 },
    { max: 130, score: 2 },
    { max: Infinity, score: 3 },
  ],
  temp: [
    { max: 35.0, score: 3 },
    { max: 36.0, score: 1 },
    { max: 38.0, score: 0 },
    { max: 39.0, score: 1 },
    { max: Infinity, score: 2 },
  ],
} as const satisfies Record<string, readonly Band[]>

export const NEWS2_ON_OXYGEN_SCORE = 2
export const NEWS2_NOT_ALERT_SCORE = 3

/** Aggregate score bands. */
export const NEWS2_AGGREGATE = { mediumFrom: 5, highFrom: 7 } as const

/** Blood pressure, mmHg. AHA 2025 guideline categories + NEWS2 low-pressure limit. */
export const BP = {
  stage1Sys: 130,
  stage1Dia: 80,
  stage2Sys: 140,
  stage2Dia: 90,
  crisisSysAbove: 180,
  crisisDiaAbove: 120,
  lowSysAtOrBelow: 90,
} as const

/** Fasting glucose, mg/dL. ADA hypoglycemia levels and fasting ranges. */
export const GLUCOSE = {
  level2Below: 54,
  level1Below: 70,
  fastingNormalMax: 99,
  fastingAttentionMax: 125,
} as const

/** Sleep, hours per night. NASA OCHMO sleep brief; ISS crews average about 6 h. */
export const SLEEP = {
  normalMin: 7,
  normalMax: 9,
  shortNight: 6,
  // TODO: verify — "several nights in a row" has no sourced number; the team uses 3.
  shortNightsInRow: 3,
} as const

/** PHQ-9 total score bands (Kroenke et al.). Any answer above 0 on item 9 escalates privately. */
export const PHQ9 = { mildFrom: 5, moderateFrom: 10 } as const

/** Cabin CO2 partial pressure, mmHg. NASA-STD-3001 / OCHMO-TB-004. */
export const CO2 = { weekMeanAbove: 2.5, hourMeanAbove: 3 } as const

/** Radiation limits, mSv. NASA OCHMO radiation protection brief. */
export const RADIATION = { perEventLimit: 250, careerLimit: 600 } as const

/** Exercise plan, minutes per day (about 2 h/day on ISS countermeasure devices). */
export const EXERCISE = {
  planMin: 120,
  // TODO: verify — the share of the plan that triggers a reminder is the team's choice.
  attentionBelowShare: 0.5,
} as const

export interface BaselineRule {
  metric: 'hr' | 'rr' | 'sbp' | 'temp' | 'spo2' | 'reactionMs'
  kind: 'percent' | 'absolute'
  threshold: number
  direction: 'up' | 'down' | 'both'
}

/**
 * Personal-baseline drift rules (the team's own adaptation, part of Space-NEWS2).
 * A reading is compared with that crew member's own rolling 7-day mean.
 * Only the heart-rate figure (20%) comes from our project brief; the rest are
 * TODO: verify — team-defined reference values.
 */
export const BASELINE_WINDOW_DAYS = 7
export const BASELINE_MIN_SAMPLES = 3
export const BASELINE_RULES: readonly BaselineRule[] = [
  { metric: 'hr', kind: 'percent', threshold: 20, direction: 'both' },
  { metric: 'rr', kind: 'percent', threshold: 20, direction: 'both' },
  { metric: 'sbp', kind: 'percent', threshold: 20, direction: 'both' },
  { metric: 'temp', kind: 'absolute', threshold: 1.0, direction: 'both' },
  { metric: 'spo2', kind: 'absolute', threshold: 3, direction: 'down' },
  { metric: 'reactionMs', kind: 'percent', threshold: 20, direction: 'up' },
]

/** In-flight shifts used only for on-screen hints. They never change the NEWS2 score. */
export const SPACE_SHIFT = {
  /** Resting core temperature, °C (Stahn et al., Sci Rep 2017). */
  tempC: 1.0,
  /** Resting heart rate, bpm (Frontiers in Physiology 2024). */
  hrBpm: 3,
  /** Average sleep on ISS, hours (Barger et al. 2014). */
  sleepH: 6,
} as const
