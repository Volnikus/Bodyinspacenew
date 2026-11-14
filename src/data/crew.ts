/**
 * Fictional crew. Names, roles and every number here are invented for the simulation;
 * they do not describe real people. Baselines already include in-flight shifts
 * (resting core temperature about +1 °C, heart rate about +3 bpm, sleep around 6–7 h).
 */
export interface CrewMember {
  id: string
  name: string
  initials: string
  role: string
  base: {
    hr: number
    sbp: number
    dbp: number
    rr: number
    spo2: number
    temp: number
    glucose: number
    sleepH: number
    exerciseMin: number
    reactionMs: number
  }
  /** Career dose before this mission, mSv (simulated). */
  priorCareerMsv: number
}

export const CREW: CrewMember[] = [
  {
    id: 'okafor',
    name: 'Mira Okafor',
    initials: 'MO',
    role: 'Commander',
    base: { hr: 64, sbp: 114, dbp: 72, rr: 14, spo2: 98, temp: 37.5, glucose: 88, sleepH: 7.3, exerciseMin: 118, reactionMs: 265 },
    priorCareerMsv: 41,
  },
  {
    id: 'seitkali',
    name: 'Daniyar Seitkali',
    initials: 'DS',
    role: 'Pilot',
    base: { hr: 71, sbp: 118, dbp: 76, rr: 15, spo2: 97, temp: 37.6, glucose: 91, sleepH: 7.1, exerciseMin: 112, reactionMs: 250 },
    priorCareerMsv: 12,
  },
  {
    id: 'ferreira',
    name: 'Lucia Ferreira',
    initials: 'LF',
    role: 'Crew medical officer',
    base: { hr: 68, sbp: 112, dbp: 70, rr: 14, spo2: 98, temp: 37.9, glucose: 86, sleepH: 6.2, exerciseMin: 110, reactionMs: 280 },
    priorCareerMsv: 27,
  },
  {
    id: 'lindqvist',
    name: 'Tomas Lindqvist',
    initials: 'TL',
    role: 'Mission specialist',
    base: { hr: 75, sbp: 122, dbp: 78, rr: 16, spo2: 97, temp: 37.6, glucose: 95, sleepH: 7.4, exerciseMin: 52, reactionMs: 272 },
    priorCareerMsv: 0,
  },
]

export const crewById = (id: string): CrewMember => CREW.find((c) => c.id === id) ?? CREW[0]
