import type { SourceId } from './sources'

export type EnvId = 'iss' | 'moon' | 'transit' | 'mars' | 'clinic'

export interface Environment {
  id: EnvId
  name: string
  short: string
  /** One-way signal delay to Earth, seconds. */
  linkOneWayS: number
  linkNote: string
  /** Who answers a medical question, and how. */
  support: string
  evacPossible: boolean
  evacuation: string
  gravity: string
  microgravity: boolean
  /** Dose rate, mSv per day. */
  doseRateMsvDay: number
  doseNote: string
  doseSource: SourceId
  /** True when our research has no verified figure and the value is a labelled placeholder. */
  doseIsReference: boolean
  /** Who is at the far end of the link. Earth for a spacecraft, a doctor for a remote clinic. */
  linkTarget?: string
  /** Simulated cabin CO2 partial pressure, mmHg. */
  co2HourMean: number
  co2WeekMean: number
}

export const ENVIRONMENTS: Record<EnvId, Environment> = {
  iss: {
    id: 'iss',
    name: 'ISS, low Earth orbit',
    short: 'ISS',
    linkOneWayS: 0,
    linkNote: 'Live voice and video with Mission Control.',
    support: 'A flight surgeon can guide you in real time.',
    evacPossible: true,
    evacuation: 'Return to Earth possible within hours',
    gravity: '0 g',
    microgravity: true,
    // TODO: verify — our research found no confirmed ISS dose rate; shown as a reference value.
    doseRateMsvDay: 0.5,
    doseNote: 'Low. Reference value, not a verified figure.',
    doseSource: 'radiation',
    doseIsReference: true,
    co2HourMean: 2.1,
    co2WeekMean: 2.3,
  },
  moon: {
    id: 'moon',
    name: 'Lunar surface and Gateway',
    short: 'Moon',
    linkOneWayS: 1.3,
    linkNote: 'About 1.3 s each way. Conversation still works.',
    support: 'A flight surgeon can guide you with a short lag.',
    evacPossible: true,
    evacuation: 'Return to Earth takes days',
    gravity: '1/6 g on the surface',
    microgravity: false,
    doseRateMsvDay: 0.5,
    doseNote: 'About 0.5 mSv/day on the lunar surface.',
    doseSource: 'radiation',
    doseIsReference: false,
    co2HourMean: 2.0,
    co2WeekMean: 2.2,
  },
  transit: {
    id: 'transit',
    name: 'Mars transit',
    short: 'Mars transit',
    linkOneWayS: 14 * 60 + 32,
    linkNote: 'Simulated position. Real range is 3 to 22 min each way, with a 2–3 week blackout at solar conjunction.',
    support: 'Earth cannot answer in time. Act on the onboard guide first, then report.',
    evacPossible: false,
    evacuation: 'No evacuation possible',
    gravity: '0 g',
    microgravity: true,
    doseRateMsvDay: 1.8,
    doseNote: 'About 1.8 mSv/day, measured by Curiosity RAD in transit.',
    doseSource: 'radTransit',
    doseIsReference: false,
    co2HourMean: 2.1,
    co2WeekMean: 2.3,
  },
  mars: {
    id: 'mars',
    name: 'Mars surface',
    short: 'Mars surface',
    linkOneWayS: 18 * 60 + 24,
    linkNote: 'Simulated position. Real range is 3 to 22 min each way, with a 2–3 week blackout at solar conjunction.',
    support: 'Earth cannot answer in time. Act on the onboard guide first, then report.',
    evacPossible: false,
    evacuation: 'No evacuation possible',
    gravity: '3/8 g',
    microgravity: false,
    // TODO: verify — NASA planning value for the surface; lower than in transit.
    doseRateMsvDay: 0.5,
    doseNote: 'About 0.5 mSv/day planning value. Lower than in transit. Reference value.',
    doseSource: 'radiation',
    doseIsReference: true,
    co2HourMean: 2.2,
    co2WeekMean: 2.4,
  },
  /**
   * The same tool on Earth: a paramedic in a remote village with no doctor nearby.
   * Every figure in this preset is illustrative, chosen by the team, not measured.
   */
  clinic: {
    id: 'clinic',
    name: 'Remote clinic on Earth',
    short: 'Remote clinic',
    linkOneWayS: 90 * 60,
    linkNote: 'Illustrative figure: no mobile coverage, the nearest doctor answers by radio relay in about 90 minutes.',
    support: 'The district doctor cannot answer in time. Act on the guide first, then report.',
    evacPossible: true,
    evacuation: 'Hospital transfer takes hours (illustrative)',
    gravity: '1 g',
    microgravity: false,
    doseRateMsvDay: 0,
    doseNote: 'Background radiation only. Not tracked in this preset.',
    doseSource: 'radiation',
    doseIsReference: true,
    linkTarget: 'the doctor',
    co2HourMean: 0.7,
    co2WeekMean: 0.7,
  },
}

export const ENV_ORDER: EnvId[] = ['iss', 'moon', 'transit', 'mars', 'clinic']

/** Leg bone loss in microgravity, percent per month (Stavnichuk et al. 2020). */
export const BONE_LOSS_PCT_PER_MONTH = 0.8

export function boneLossEstimate(env: Environment, missionDayNumber: number): { pct: number; isReference: boolean } {
  if (env.id === 'clinic') return { pct: 0, isReference: false }
  const pct = BONE_LOSS_PCT_PER_MONTH * (missionDayNumber / 30)
  // No human data exists for partial gravity: the microgravity rate is shown as an upper-bound reference.
  return { pct, isReference: !env.microgravity }
}
