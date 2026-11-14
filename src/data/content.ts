import type { Finding, Level, MetricKey, Metrics, ZoneId } from '../engine/types'
import type { SourceId } from './sources'

/**
 * All explanatory text in one place so it is easy to review and correct.
 *
 * Numbers in "why it matters" come from the cited sources. The measuring steps and
 * the "what to do" actions are a team-designed training flow built from those
 * sources; they are not clinical instructions and no physician has reviewed them.
 */

export interface Fact {
  text: string
  sourceId: SourceId
}

export interface ZoneContent {
  title: string
  /** What this part of the body does, in one or two sentences. */
  what: string
  /** How to measure, 3–5 short steps written for microgravity. */
  how: string[]
  howNote?: string
  /** Why it matters in space. Every number carries its source. */
  why: Fact[]
  /** Shown when nothing is flagged. */
  okActions: string[]
}

export const ZONE_CONTENT: Record<ZoneId, ZoneContent> = {
  heart: {
    title: 'Heart',
    what: 'Pumps blood to every organ. Without gravity, fluid shifts toward the head and the heart works under different loads.',
    how: [
      'Hold still: slide your feet into the foot loops or strap into a seat.',
      'Rest quietly for 5 minutes. No talking.',
      'Wrap the cuff on your bare upper arm and keep that arm level with your chest.',
      'Take 2 readings, 1 minute apart.',
      'Read your pulse from the oximeter or the cuff, then log everything.',
    ],
    howNote: 'Use the cuff for blood pressure. Smartwatch readings are not reliable enough.',
    why: [
      { text: 'In flight, resting heart rate runs about 3 bpm higher and the heart reacts less flexibly to change.', sourceId: 'hrShift' },
      { text: 'Physicians rank chest pain and heart attack first among sudden life-threatening events on a Mars mission.', sourceId: 'medea' },
    ],
    okActions: ['Nothing to do now.', 'Keep measuring vitals three times a day so your personal baseline stays accurate.'],
  },
  lungs: {
    title: 'Lungs',
    what: 'Bring oxygen into the blood and carry carbon dioxide out. They depend on the air the cabin provides.',
    how: [
      'Sit or float still for 1 minute.',
      'Breathing rate: count breaths for 15 seconds and multiply by 4.',
      'Oxygen saturation: warm your finger, clip on the oximeter and keep the hand still.',
      'Wait for a steady number, then log both values.',
    ],
    why: [
      { text: 'Cabin air holds far more CO2 than air on Earth. NASA limits the 1-hour average to 3 mmHg.', sourceId: 'co2' },
      { text: 'A wearable such as the Canadian Space Agency Bio-Monitor tracks breathing rate and oxygen saturation continuously.', sourceId: 'bioMonitor' },
    ],
    okActions: ['Nothing to do now.', 'If you get a headache or feel short of breath, check the Cabin air zone first.'],
  },
  brain: {
    title: 'Brain & mind',
    what: 'Runs attention, mood, sleep and reaction speed. Isolation and a broken day-night rhythm wear it down slowly.',
    how: [
      'Sleep: every morning, log the hours you slept.',
      'Reaction: run the 1-minute reaction test on this tablet at the same time each day.',
      'Mood: answer the 9-question check once a week. Your answers stay private.',
      'Checking a crewmate: speak to them, then tap the shoulder. Note if they are alert, confused, or not responding.',
    ],
    why: [
      { text: 'Station crews sleep about 6 hours a night instead of the 8.5 hours scheduled.', sourceId: 'barger2014' },
      { text: 'In the 520-day Mars-500 isolation study, 4 of 6 crew members developed lasting sleep or activity problems.', sourceId: 'mars500' },
    ],
    okActions: ['Nothing to do now.', 'Keep the same sleep window every night.'],
  },
  eyes: {
    title: 'Eyes',
    what: 'In microgravity, fluid shifting toward the head presses on the back of the eye. Vision can change without pain.',
    how: [
      'Hold the tablet at arm’s length in normal cabin light.',
      'Cover one eye and look at the dot in the centre of the grid.',
      'Mark any lines that look wavy, blurred or missing.',
      'Repeat with the other eye.',
    ],
    howNote: 'The grid is a screening check only. Eye scans (OCT, ultrasound) are read by specialists.',
    why: [
      { text: 'About 70% of crew on long missions show signs of spaceflight-associated neuro-ocular syndrome (SANS).', sourceId: 'sans' },
    ],
    okActions: ['Nothing to do now.', 'Repeat the grid check once a week.'],
  },
  blood: {
    title: 'Blood',
    what: 'Carries oxygen, sugar and immune cells. Lab samples show how the body copes with flight.',
    how: [
      'Measure before breakfast.',
      'Clean the fingertip and let it dry.',
      'Prick the side of the fingertip and touch the drop to the test strip.',
      'Log the number in mg/dL.',
    ],
    howNote: 'Team-written steps. Public sources do not confirm which glucose meter is flown.',
    why: [
      { text: 'Dormant herpes viruses reactivate in about 61% of station crew, a sign of immune stress in flight.', sourceId: 'immune' },
      { text: 'Real blood counts from the Inspiration4 crew, before and after flight, are open in NASA OSDR (OSD-569, OSD-575).', sourceId: 'osd569' },
    ],
    okActions: ['Nothing to do now.', 'Next fasting glucose check: tomorrow morning.'],
  },
  bones: {
    title: 'Bones & muscles',
    what: 'On Earth they carry your weight all day. In microgravity they carry nothing, so the body starts to give them up.',
    how: [
      'Log every exercise session: resistance, treadmill and cycle.',
      'Aim for about 2 hours a day in total.',
      'Bone density cannot be measured on board. The estimate here is calculated from time in flight.',
    ],
    why: [
      { text: 'Leg bones lose about 0.8% of their density every month in microgravity. Recovery takes 2 to 5 years.', sourceId: 'boneLoss' },
      { text: 'Station crews eat only about 80% of the 3,035 kcal a day that NASA plans for them.', sourceId: 'nutrition' },
    ],
    okActions: ['Nothing to do now.', 'Finish today’s exercise plan.'],
  },
  skin: {
    title: 'Temperature',
    what: 'Body temperature shows infection, overheating or cold stress. In flight the body sheds heat less easily.',
    how: [
      'Use the oral or ear thermometer. Skin sensors do not show core temperature.',
      'Measure at rest, not right after exercise.',
      'Wait for the signal, then log the number.',
    ],
    why: [
      { text: 'In flight, resting core temperature settles about 1 °C higher than on Earth, and about 1.4 °C higher during exercise.', sourceId: 'stahn2017' },
    ],
    okActions: ['Nothing to do now.', 'Readings near 38 °C at rest can be normal in flight.'],
  },
  air: {
    title: 'Cabin air',
    what: 'Every breath comes from the life-support system. When CO2 builds up, the whole crew feels it.',
    how: [
      'CO2 is read from the cabin atmosphere sensors and shown here.',
      'Look at both the 1-hour and the 7-day average.',
      'Ask the crew about headache or blurred vision.',
    ],
    why: [
      { text: 'NASA limits cabin CO2 to a 1-hour average of 3 mmHg and watches for a 7-day average above 2.5 mmHg. Indoor air on Earth is about 0.6 to 0.8 mmHg.', sourceId: 'co2' },
    ],
    okActions: ['Nothing to do now.', 'Headache together with rising CO2 is the signal to ventilate and report.'],
  },
  radiation: {
    title: 'Radiation',
    what: 'Beyond Earth’s magnetic field the crew is exposed to cosmic rays all the time and to solar storms without warning.',
    how: [
      'Keep your personal dosimeter on you at all times.',
      'The dose here adds up from the mission dose rate.',
      'Solar events come from the NASA DONKI space-weather feed.',
    ],
    why: [
      { text: 'NASA’s limits are 600 mSv over a career and 250 mSv from a single solar event.', sourceId: 'radiation' },
      { text: 'In transit to Mars, the Curiosity rover’s detector measured about 1.8 mSv a day.', sourceId: 'radTransit' },
    ],
    okActions: ['Nothing to do now.', 'Know your route to the storm shelter.'],
  },
}

type ActionRule = Partial<Record<Exclude<Level, 'ok'>, string[] | ((m: Partial<Metrics>) => string[])>>

/** What to do for each flagged measurement. Team-designed training guidance. */
const ACTIONS: Partial<Record<MetricKey, ActionRule>> = {
  hr: {
    caution: ['Rest for 5 minutes, then measure again.', 'Compare the new reading with your own 7-day normal on the chart.'],
    alert: ['A pulse of 40 or less, or 131 or more, needs urgent assessment.', 'Stay with the crew member and open the SOS guide.'],
  },
  sbp: {
    caution: ['Rest for 5 minutes with your feet in the foot loops.', 'Take 2 readings, 1 minute apart.'],
    alert: ['Critical blood pressure. Open the SOS guide.', 'Queue a report for the flight surgeon.'],
  },
  dbp: {
    caution: ['Rest for 5 minutes with your feet in the foot loops.', 'Take 2 readings, 1 minute apart.'],
    alert: ['Critical blood pressure. Open the SOS guide.', 'Queue a report for the flight surgeon.'],
  },
  rr: {
    caution: ['Count again: 15 seconds, multiply by 4.', 'Check the Cabin air zone for CO2.'],
    alert: ['Breathing of 8 or less, or 25 or more per minute, is urgent.', 'Open the SOS guide.'],
  },
  spo2: {
    caution: ['Warm the finger and repeat the reading.', 'Check cabin oxygen and CO2.'],
    alert: ['Oxygen saturation of 91% or less is urgent.', 'Open the SOS guide and get oxygen with a mask ready from the medical kit.'],
  },
  onO2: { caution: ['Keep logging oxygen saturation while on oxygen.'] },
  consciousness: {
    alert: ['New confusion or no response is an emergency.', 'A crewmate opens the SOS guide now.'],
  },
  temp: {
    caution: [
      'Measure again at rest with the oral or ear thermometer.',
      'Fever together with other symptoms: report to the flight surgeon.',
    ],
    alert: ['A temperature of 35.0 °C or less needs urgent assessment.', 'Measure again and open the SOS guide.'],
  },
  glucose: {
    caution: (m) =>
      (m.glucose ?? 100) < 70
        ? ['Low glucose. Follow the 15-15 rule: take 15 g of fast carbohydrate.', 'Check again after 15 minutes.']
        : ['Make sure this was a fasting reading.', 'Repeat tomorrow morning and flag it for the flight surgeon.'],
    alert: [
      'Dangerously low glucose. Follow the 15-15 rule now: 15 g of fast carbohydrate, check again after 15 minutes.',
      'If the crew member is confused or not responding, open the SOS guide.',
    ],
  },
  sleepH: {
    caution: ['Check light, noise and your schedule before tonight’s sleep.', 'Keep logging so the flight surgeon sees the trend.'],
    alert: ['Several short nights in a row. Raise it at your next private medical conference.', 'Protect tonight’s sleep window: check light, noise and schedule.'],
  },
  phq9: {
    caution: ['Mild symptoms. Repeat the mood check next week and mention it at your private medical conference.'],
    alert: ['Ask for a private conference with the flight surgeon or psychologist.', 'Your answers are private. They are not shown to the rest of the crew.'],
  },
  amslerDistortion: {
    caution: ['Repeat the grid check tomorrow in the same light.', 'Ask for an eye scan (OCT or ultrasound) at the next scheduled slot.'],
    alert: ['Worse vision together with headache: report to the flight surgeon today.', 'Request an unscheduled eye scan.'],
  },
  exerciseMin: {
    caution: ['You are well under the exercise plan this week.', 'Add resistance or treadmill time today and aim for the full 120 minutes.'],
  },
  reactionMs: {
    caution: [
      'Slower than your own normal. Check last night’s sleep and test again after rest.',
      'Flag it for your private medical conference. Always re-test before a spacewalk.',
    ],
  },
}

/** Generic advice for one measurement when it is flagged (used by the assistant). */
export function genericActions(metric: MetricKey, m: Partial<Metrics> = {}): string[] {
  const rule = ACTIONS[metric]?.caution
  return typeof rule === 'function' ? rule(m) : (rule ?? [])
}

/** Actions for the flagged findings of a body zone, most serious first, without repeats. */
export function actionsFor(findings: readonly Finding[], m: Partial<Metrics>): string[] {
  const rank: Record<Level, number> = { ok: 0, caution: 1, alert: 2 }
  const sorted = [...findings].filter((f) => f.level !== 'ok').sort((a, b) => rank[b.level] - rank[a.level])
  const out: string[] = []
  for (const finding of sorted) {
    const rule = ACTIONS[finding.metric]?.[finding.level as 'caution' | 'alert']
    const lines = typeof rule === 'function' ? rule(m) : (rule ?? [])
    for (const line of lines) if (!out.includes(line)) out.push(line)
  }
  return out.slice(0, 4)
}

export const AIR_ACTIONS: Record<Exclude<Level, 'ok'>, string[]> = {
  caution: ['The 7-day CO2 average is above 2.5 mmHg.', 'Increase ventilation in the module and report it to Mission Control.'],
  alert: ['CO2 is above the 3 mmHg 1-hour limit.', 'Headache with high CO2: ventilate the module now and report.'],
}

export const RADIATION_ACTIONS: Record<Exclude<Level, 'ok'>, string[]> = {
  caution: ['Solar event detected. Go to the storm shelter.', 'Stay there until the all-clear. The shelter roughly halves the dose from a solar storm.'],
  alert: ['Dose limit reached. Stay in the storm shelter.', 'Queue a report for the flight surgeon.'],
}

export const GUIDANCE_NOTE = 'Team-designed training guidance built from the cited sources. Not reviewed by a physician.'
