import { BP, CO2, EXERCISE, GLUCOSE, PHQ9, RADIATION, SLEEP } from '../data/thresholds'
import type { Level } from './types'

/** Result of a threshold check outside NEWS2. */
export interface Check {
  level: Level
  text: string
  sourceId: string
  teamDefined?: boolean
}

const ok = (text: string, sourceId: string): Check => ({ level: 'ok', text, sourceId })

/** Blood pressure, mmHg (AHA 2025 categories; low limit from NEWS2). */
export function bpCheck(sbp: number, dbp: number): Check {
  const reading = `${Math.round(sbp)}/${Math.round(dbp)} mmHg`
  if (sbp <= BP.lowSysAtOrBelow) {
    return { level: 'alert', text: `Blood pressure ${reading} is critically low.`, sourceId: 'news2' }
  }
  if (sbp > BP.crisisSysAbove || dbp > BP.crisisDiaAbove) {
    return { level: 'alert', text: `Blood pressure ${reading} is above 180/120.`, sourceId: 'aha2025' }
  }
  if (sbp >= BP.stage2Sys || dbp >= BP.stage2Dia) {
    return { level: 'caution', text: `Blood pressure ${reading} is in the stage 2 range (140/90 or more).`, sourceId: 'aha2025' }
  }
  if (sbp >= BP.stage1Sys || dbp >= BP.stage1Dia) {
    return { level: 'caution', text: `Blood pressure ${reading} is in the stage 1 range (130–139 / 80–89).`, sourceId: 'aha2025' }
  }
  return ok(`Blood pressure ${reading}.`, 'aha2025')
}

/** Fasting glucose, mg/dL (ADA). */
export function glucoseCheck(glucose: number, alteredConsciousness = false): Check {
  const reading = `${Math.round(glucose)} mg/dL`
  if (glucose < GLUCOSE.level2Below || (glucose < GLUCOSE.level1Below && alteredConsciousness)) {
    return { level: 'alert', text: `Glucose ${reading} is dangerously low.`, sourceId: 'ada' }
  }
  if (glucose < GLUCOSE.level1Below) {
    return { level: 'caution', text: `Glucose ${reading} is low (below 70).`, sourceId: 'ada' }
  }
  if (glucose <= GLUCOSE.fastingNormalMax) return ok(`Fasting glucose ${reading}.`, 'ada')
  if (glucose <= GLUCOSE.fastingAttentionMax) {
    return { level: 'caution', text: `Fasting glucose ${reading} is above the normal range (70–99).`, sourceId: 'ada' }
  }
  // TODO: verify — our brief gives no action band above 125 mg/dL; shown as a reference value.
  return {
    level: 'caution',
    text: `Fasting glucose ${reading} is well above the normal range (70–99).`,
    sourceId: 'ada',
    teamDefined: true,
  }
}

/** Sleep. `nights` is hours per night, oldest first; the last entry is last night. */
export function sleepCheck(nights: readonly number[]): Check {
  if (nights.length === 0) return ok('No sleep logged yet.', 'ochmoSleep')
  const last = nights[nights.length - 1]
  const recent = nights.slice(-SLEEP.shortNightsInRow)
  const shortRun = recent.length === SLEEP.shortNightsInRow && recent.every((h) => h < SLEEP.shortNight)
  if (shortRun) {
    return {
      level: 'alert',
      text: `${SLEEP.shortNightsInRow} nights in a row under ${SLEEP.shortNight} h of sleep.`,
      sourceId: 'ochmoSleep',
      teamDefined: true,
    }
  }
  if (last < SLEEP.normalMin) {
    return { level: 'caution', text: `${last.toFixed(1)} h of sleep last night (aim for 7–9).`, sourceId: 'ochmoSleep' }
  }
  return ok(`${last.toFixed(1)} h of sleep last night.`, 'ochmoSleep')
}

/** PHQ-9 mood questionnaire. Item 9 always escalates privately. */
export function phq9Check(total: number, item9: number): Check {
  if (item9 > 0) {
    return { level: 'alert', text: 'Mood check needs a private talk with the flight surgeon now.', sourceId: 'phq9' }
  }
  if (total >= PHQ9.moderateFrom) {
    return { level: 'alert', text: `Mood check score ${total}: ask for a private psychological conference.`, sourceId: 'phq9' }
  }
  if (total >= PHQ9.mildFrom) {
    return { level: 'caution', text: `Mood check score ${total}: mild symptoms.`, sourceId: 'phq9' }
  }
  return ok(`Mood check score ${total}.`, 'phq9')
}

/** Vision self-check for SANS screening. */
export function visionCheck(distortion: boolean, acuityWorse: boolean, headache: boolean): Check {
  if (acuityWorse && headache) {
    return { level: 'alert', text: 'Worse vision together with headache.', sourceId: 'sans' }
  }
  if (distortion || acuityWorse) {
    return { level: 'caution', text: 'New change on the vision self-check.', sourceId: 'sans' }
  }
  return ok('No change on the vision self-check.', 'sans')
}

/** Exercise countermeasure. `weekAvgMin` is the 7-day average in minutes per day. */
export function exerciseCheck(weekAvgMin: number): Check {
  const share = weekAvgMin / EXERCISE.planMin
  if (share < EXERCISE.attentionBelowShare) {
    return {
      level: 'caution',
      text: `Exercise averages ${Math.round(weekAvgMin)} of ${EXERCISE.planMin} planned min/day.`,
      sourceId: 'boneLoss',
      teamDefined: true,
    }
  }
  return ok(`Exercise averages ${Math.round(weekAvgMin)} of ${EXERCISE.planMin} planned min/day.`, 'boneLoss')
}

/** Cabin CO2 partial pressure, mmHg (NASA-STD-3001). */
export function co2Check(hourMean: number, weekMean: number): Check {
  if (hourMean > CO2.hourMeanAbove) {
    return { level: 'alert', text: `Cabin CO2 ${hourMean.toFixed(1)} mmHg is above the 1-hour limit of 3.`, sourceId: 'co2' }
  }
  if (weekMean > CO2.weekMeanAbove) {
    return { level: 'caution', text: `Cabin CO2 7-day mean ${weekMean.toFixed(1)} mmHg is above 2.5.`, sourceId: 'co2' }
  }
  return ok(`Cabin CO2 ${hourMean.toFixed(1)} mmHg.`, 'co2')
}

export interface RadiationState {
  /** Dose accumulated on this mission plus earlier career dose, mSv. */
  careerMsv: number
  /** Dose from the current solar particle event, mSv. */
  eventMsv: number
  solarEvent: boolean
}

/** Radiation dose against NASA limits (250 mSv per event, 600 mSv career). */
export function radiationCheck(state: RadiationState): Check {
  if (state.eventMsv >= RADIATION.perEventLimit) {
    return { level: 'alert', text: `Solar event dose ${Math.round(state.eventMsv)} mSv has reached the 250 mSv limit.`, sourceId: 'radiation' }
  }
  if (state.careerMsv >= RADIATION.careerLimit) {
    return { level: 'alert', text: `Career dose ${Math.round(state.careerMsv)} mSv has reached the 600 mSv limit.`, sourceId: 'radiation' }
  }
  if (state.solarEvent) {
    return { level: 'caution', text: 'Solar event detected. Go to the storm shelter.', sourceId: 'donki' }
  }
  return ok(`Career dose ${Math.round(state.careerMsv)} of ${RADIATION.careerLimit} mSv.`, 'radiation')
}
