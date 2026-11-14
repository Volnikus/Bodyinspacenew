import type { SourceId } from './sources'

/**
 * SOS guide. A team-designed training flow.
 *
 * The cardiac-arrest branch follows the structure of ISS procedure 1.102 (CPR with AED)
 * in the public 2016 ISS Medical Checklist. The chest-pain branch is assembled by the
 * team from the kit contents listed in that checklist, because the public version has
 * no step-by-step chest-pain procedure. Drug names appear only to show where things
 * are in the kit; they are not a prescription.
 */

export type SosWidget = 'vitals' | 'pulse-check' | 'cpr' | 'recheck' | 'kit'

export interface SosStep {
  id: string
  /** One big instruction. */
  title: string
  detail: string
  /** Text written to the incident log when the step is done. */
  log: string
  widget?: SosWidget
  sourceId: SourceId
}

/** Branch A: the crewmate responds and has chest pain. */
export const BRANCH_A: SosStep[] = [
  {
    id: 'a-restrain',
    title: 'Hold them still',
    detail: 'Strap the crew member to the Crew Medical Restraint System or into a seat. Stay with them and keep them calm.',
    log: 'Patient restrained and at rest',
    sourceId: 'issChecklist',
  },
  {
    id: 'a-help',
    title: 'Call the crew. Bring the kit.',
    detail: 'Send one person for the medical kit and the AED. Keep the AED within reach in case the patient stops responding.',
    log: 'Crew called, medical kit and AED brought',
    sourceId: 'issChecklist',
  },
  {
    id: 'a-vitals',
    title: 'Measure vital signs',
    detail: 'Pulse, blood pressure, breathing rate, oxygen saturation, temperature. The wearable feed is shown above.',
    log: 'Vital signs measured',
    widget: 'vitals',
    sourceId: 'news2',
  },
  {
    id: 'a-ecg',
    title: 'Record an ECG if you can',
    detail: 'If the kit has an ECG, attach the electrodes and save a recording for the flight surgeon. If not, skip this step.',
    log: 'ECG recorded or skipped',
    sourceId: 'issChecklist',
  },
  {
    id: 'a-oxygen',
    title: 'Check oxygen',
    detail: 'If oxygen saturation is low, give oxygen through the mask from the medical kit and keep the oximeter on.',
    log: 'Oxygen saturation checked, oxygen by mask if low',
    widget: 'vitals',
    sourceId: 'issChecklist',
  },
  {
    id: 'a-kit',
    title: 'Get the cardiac medication ready',
    detail: 'Find the packs now so nothing is lost later. Give a drug only under the flight surgeon’s standing orders.',
    log: 'Cardiac medication located (aspirin, nitroglycerin)',
    widget: 'kit',
    sourceId: 'issChecklist',
  },
  {
    id: 'a-recheck',
    title: 'Measure again every 5 minutes',
    detail: 'Stay with the patient. If they stop responding, switch to CPR at once.',
    log: 'Repeat vital signs taken',
    widget: 'recheck',
    sourceId: 'news2',
  },
]

/** Branch B: the crewmate does not respond. */
export const BRANCH_B: SosStep[] = [
  {
    id: 'b-help',
    title: 'Shout for the crew. Get the AED.',
    detail: 'One person brings the AED and the medical kit. You stay with the patient.',
    log: 'Crew called, AED requested',
    sourceId: 'issChecklist',
  },
  {
    id: 'b-pulse',
    title: 'Check breathing and pulse for 10 seconds',
    detail: 'Feel for a pulse at the neck. Watch the chest. Do not take longer than 10 seconds.',
    log: 'Breathing and pulse checked: none',
    widget: 'pulse-check',
    sourceId: 'issChecklist',
  },
  {
    id: 'b-restrain',
    title: 'Strap the patient down',
    detail:
      'Fix the patient flat on the Crew Medical Restraint System. No restraint nearby? Use the Evetts-Russomano method: wrap your legs around the patient’s torso and compress against your own hold.',
    log: 'Patient restrained for CPR',
    sourceId: 'cprMicrog',
  },
  {
    id: 'b-cpr',
    title: 'Start CPR: 30 compressions, 2 breaths',
    detail: 'Push hard on the centre of the chest in time with the beat. After 5 cycles, attach the AED and follow its voice.',
    log: 'CPR in progress',
    widget: 'cpr',
    sourceId: 'issChecklist',
  },
]

export const CPR = {
  /** Compressions per minute. Guidelines ask for 100 to 120; metronomes improve rhythm in microgravity. */
  bpm: 110,
  compressionsPerCycle: 30,
  /** Seconds allowed for the 2 breaths before compressions resume (team-chosen training timing). */
  breathPauseS: 5,
  cyclesBeforeAed: 5,
} as const

/** All three must be true before resuscitation may stop (ISS procedure 1.102, public 2016 version). */
export const STOP_CRITERIA = [
  { id: 'duration', text: 'At least 45 minutes of resuscitation', minutes: 45 },
  { id: 'drug', text: 'At least 10 minutes since the last drug was given' },
  { id: 'pulse', text: 'Still no pulse and no breathing' },
] as const

export const KIT_ITEMS = [
  { name: 'Aspirin 325 mg', where: 'White medication pack' },
  { name: 'Nitroglycerin 0.4 mg', where: 'Purple pack, labelled Cardiac' },
  { name: 'Oxygen with mask', where: 'Medical kit, respiratory support' },
] as const

export const RECHECK_MINUTES = 5 // TODO: verify — interval chosen by the team; our sources give no number.

export const SOS_FOOTNOTE = 'Based on the public ISS Medical Checklist (2016). Team-designed flow, for training only.'
