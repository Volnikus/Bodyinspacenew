import { ZONE_CONTENT } from '../data/content'
import type { SourceId } from '../data/sources'
import type { MetricKey, ZoneId } from '../engine/types'

/**
 * KOMEK's knowledge base. Every answer is written here or assembled from
 * `src/data/content.ts`; nothing is generated at run time. If a question does not
 * match an entry, KOMEK says so and logs the question for the flight surgeon.
 */

export type Intent = 'what' | 'how' | 'why' | 'do'

export interface KbEntry {
  id: string
  topics: string[]
  intent: Intent
  answer: string
  sourceId: SourceId
  /** Screen to offer with the answer. */
  route?: string
  routeLabel?: string
}

/** Words and phrases that point to a topic. Longer phrases win over shorter ones. */
export const TOPIC_PHRASES: Record<string, string[]> = {
  hr: ['heart rate', 'heartrate', 'pulse', 'heartbeat', 'bpm', 'hr'],
  bp: ['blood pressure', 'bp', 'pressure', 'systolic', 'diastolic', 'cuff'],
  spo2: ['spo2', 'sp02', 'oxygen saturation', 'saturation', 'oximeter', 'oxygen level', 'oxygen'],
  rr: ['breathing rate', 'respiratory rate', 'respiration', 'breaths', 'breathing', 'breath'],
  temp: ['temperature', 'temp', 'fever', 'thermometer'],
  glucose: ['glucose', 'blood sugar', 'sugar', 'hypoglycemia'],
  sleep: ['sleep', 'slept', 'insomnia', 'tired', 'fatigue'],
  mood: ['mood', 'phq-9', 'phq9', 'phq', 'depression', 'sad', 'stress', 'lonely'],
  reaction: ['reaction time', 'reaction', 'pvt', 'attention'],
  vision: ['vision', 'eyes', 'eye', 'sans', 'amsler', 'sight', 'blurry', 'blurred'],
  bone: ['bone loss', 'bones', 'bone', 'muscles', 'muscle', 'exercise', 'workout'],
  blood: ['blood', 'immune', 'virus', 'lab'],
  co2: ['co2', 'carbon dioxide', 'cabin air', 'air', 'headache', 'ventilation'],
  radiation: ['radiation', 'dose', 'msv', 'solar', 'flare', 'storm shelter', 'shelter', 'cosmic'],
  spacenews2: ['space-news2', 'space news2', 'spacenews2'],
  news2: ['news2', 'news 2', 'early warning', 'score'],
  baseline: ['baseline', 'my normal', '7-day normal', 'personal normal'],
  earth: ['earth', 'delay', 'link', 'reply', 'mission control', 'signal', 'blackout'],
  evac: ['evacuation', 'evacuate', 'go home', 'rescue'],
  cpr: ['cpr', 'resuscitation', 'compressions', 'cardiac arrest', 'aed', 'defibrillator', 'unconscious', 'unresponsive', 'collapsed'],
  chest: ['chest pain', 'heart attack'],
  surgeon: ['flight surgeon', 'surgeon', 'doctor', 'physician'],
  komek: ['komek', 'who are you', 'your name'],
  data: ['simulated', 'real data', 'osdr', 'inspiration4'],
  eimo: ['eimo', 'earth-independent', 'earth independent'],
}

/** Which body zone and which measurements a topic belongs to. */
export const TOPIC_ZONE: Record<string, { zone: ZoneId; metrics: MetricKey[] }> = {
  hr: { zone: 'heart', metrics: ['hr'] },
  bp: { zone: 'heart', metrics: ['sbp', 'dbp'] },
  spo2: { zone: 'lungs', metrics: ['spo2'] },
  rr: { zone: 'lungs', metrics: ['rr'] },
  temp: { zone: 'skin', metrics: ['temp'] },
  glucose: { zone: 'blood', metrics: ['glucose'] },
  blood: { zone: 'blood', metrics: ['glucose'] },
  sleep: { zone: 'brain', metrics: ['sleepH'] },
  mood: { zone: 'brain', metrics: ['phq9'] },
  reaction: { zone: 'brain', metrics: ['reactionMs'] },
  vision: { zone: 'eyes', metrics: ['amslerDistortion'] },
  bone: { zone: 'bones', metrics: ['exerciseMin'] },
  co2: { zone: 'air', metrics: [] },
  radiation: { zone: 'radiation', metrics: [] },
}

const DEFINITIONS: KbEntry[] = [
  {
    id: 'what-news2',
    topics: ['news2'],
    intent: 'what',
    answer:
      'NEWS2 is an early warning score used in hospitals. Breathing rate, oxygen saturation, extra oxygen, systolic pressure, pulse, alertness and temperature each add points. 0 to 4 is low risk, 5 to 6 medium, 7 or more high. Any single sign scoring 3 needs urgent assessment.',
    sourceId: 'news2',
  },
  {
    id: 'what-spacenews2',
    topics: ['spacenews2'],
    intent: 'what',
    answer:
      'Space-NEWS2 is this team’s method. It keeps the official NEWS2 score unchanged, then adds two things: a check of every vital sign against your own 7-day normal, and notes about known in-flight shifts and your mission environment.',
    sourceId: 'spaceNews2',
  },
  {
    id: 'what-baseline',
    topics: ['baseline'],
    intent: 'what',
    answer:
      'Your baseline is the average of your own readings over the last 7 days. Space shifts what is normal, so I compare you with yourself. A heart rate 20% away from your baseline is flagged even when NEWS2 still scores 0.',
    sourceId: 'spaceNews2',
  },
  {
    id: 'what-hr',
    topics: ['hr'],
    intent: 'what',
    answer: 'Heart rate is how many times your heart beats in a minute. On NEWS2, 51 to 90 is normal. In flight it runs about 3 bpm higher than on Earth.',
    sourceId: 'news2',
  },
  {
    id: 'what-bp',
    topics: ['bp'],
    intent: 'what',
    answer:
      'Blood pressure is two numbers. Systolic is the pressure when the heart beats, diastolic when it rests between beats. Below 120/80 is normal. 130–139 or 80–89 is stage 1. Above 180/120, or a systolic of 90 or less, is critical.',
    sourceId: 'aha2025',
  },
  {
    id: 'what-spo2',
    topics: ['spo2'],
    intent: 'what',
    answer: 'SpO2 is oxygen saturation: how much oxygen your blood is carrying, read by a clip on the finger. 96% or more is normal. 91% or less is urgent.',
    sourceId: 'news2',
  },
  {
    id: 'what-rr',
    topics: ['rr'],
    intent: 'what',
    answer: 'Breathing rate is the number of breaths in a minute. 12 to 20 is normal. 8 or less, or 25 or more, is urgent.',
    sourceId: 'news2',
  },
  {
    id: 'what-temp',
    topics: ['temp'],
    intent: 'what',
    answer: 'NEWS2 counts 36.1 to 38.0 °C as normal. In flight your resting core temperature settles about 1 °C higher than on Earth, so readings near 38 °C can be adaptation rather than fever.',
    sourceId: 'stahn2017',
  },
  {
    id: 'what-glucose',
    topics: ['glucose'],
    intent: 'what',
    answer: 'Fasting glucose is the sugar in your blood before breakfast. 70 to 99 mg/dL is normal. Below 70 is low: take 15 g of fast carbohydrate and check again after 15 minutes. Below 54 is dangerous.',
    sourceId: 'ada',
  },
  {
    id: 'what-sleep',
    topics: ['sleep'],
    intent: 'what',
    answer: 'Aim for 7 to 9 hours. Station crews average about 6. Under 7 hours is flagged, and several nights under 6 in a row should go to your private medical conference.',
    sourceId: 'barger2014',
  },
  {
    id: 'what-mood',
    topics: ['mood'],
    intent: 'what',
    answer: 'The mood check is the PHQ-9: nine questions, scored 0 to 27. 0 to 4 is normal, 5 to 9 is mild. At 10 or more, ask for a private psychological conference. Your answers stay private.',
    sourceId: 'phq9',
  },
  {
    id: 'what-reaction',
    topics: ['reaction'],
    intent: 'what',
    answer: 'The reaction test measures how fast you respond to a signal. A slower time than your own normal is an early sign of fatigue. Station crews use a 3-minute version called PVT-B.',
    sourceId: 'cognition',
  },
  {
    id: 'what-vision',
    topics: ['vision'],
    intent: 'what',
    answer: 'SANS is spaceflight-associated neuro-ocular syndrome: fluid shifting toward the head changes the back of the eye. About 70% of long-mission crew show signs of it. The grid check screens for new distortion.',
    sourceId: 'sans',
  },
  {
    id: 'what-bone',
    topics: ['bone'],
    intent: 'what',
    answer: 'In microgravity your leg bones lose about 0.8% of their density every month, and recovery takes 2 to 5 years. About 2 hours of exercise a day is the countermeasure.',
    sourceId: 'boneLoss',
  },
  {
    id: 'what-blood',
    topics: ['blood'],
    intent: 'what',
    answer: 'Blood tests show how your body copes with flight. Dormant herpes viruses reactivate in about 61% of station crew. Real pre- and post-flight blood counts from the Inspiration4 crew are open in NASA OSDR.',
    sourceId: 'immune',
  },
  {
    id: 'what-co2',
    topics: ['co2'],
    intent: 'what',
    answer: 'Cabin CO2 is far higher than on Earth. NASA limits the 1-hour average to 3 mmHg and watches for a 7-day average above 2.5 mmHg. Headache with high CO2 means ventilate and report.',
    sourceId: 'co2',
    route: 'organ/air',
    routeLabel: 'Open Cabin air',
  },
  {
    id: 'what-radiation',
    topics: ['radiation'],
    intent: 'what',
    answer: 'Dose is measured in millisieverts (mSv). NASA’s limits are 600 mSv over a career and 250 mSv from one solar event. In transit to Mars the dose is about 1.8 mSv a day. When a solar event is reported, go to the storm shelter.',
    sourceId: 'radiation',
    route: 'organ/radiation',
    routeLabel: 'Open Radiation',
  },
  {
    id: 'what-cpr',
    topics: ['cpr'],
    intent: 'what',
    answer: 'On board, CPR is 30 compressions then 2 breaths, for 5 cycles, then follow the AED’s voice. Strap the patient down first, or use the Evetts-Russomano method developed in Brazil. The SOS guide runs the metronome and counts for you.',
    sourceId: 'cprMicrog',
    route: 'sos',
    routeLabel: 'Open SOS guide',
  },
  {
    id: 'what-chest',
    topics: ['chest'],
    intent: 'what',
    answer: 'Chest pain can be an emergency. Open the SOS guide now: it walks you through each step while your message travels to Earth.',
    sourceId: 'medea',
    route: 'sos',
    routeLabel: 'Open SOS guide',
  },
  {
    id: 'what-eimo',
    topics: ['eimo'],
    intent: 'what',
    answer: 'Earth-Independent Medical Operations is NASA’s concept for a crew that handles medical events on its own, with onboard decision support, because Earth is too far away to help in time.',
    sourceId: 'eimo',
  },
  {
    id: 'what-komek',
    topics: ['komek'],
    intent: 'what',
    answer: 'I’m KOMEK. The name means “help” in Kazakh. I’m a rule-based SI assistant: I work with no link to Earth and answer only from this project’s checked knowledge base. I don’t diagnose and I don’t prescribe.',
    sourceId: 'spaceNews2',
  },
  {
    id: 'what-data',
    topics: ['data'],
    intent: 'what',
    answer: 'The vital signs here are simulated, because open NASA data has no astronaut vital signs. The lab data is real: Inspiration4 blood tests from NASA OSDR studies OSD-569, OSD-575 and OSD-656.',
    sourceId: 'osdr',
  },
]

function zoneEntries(): KbEntry[] {
  const entries: KbEntry[] = []
  for (const [topic, { zone }] of Object.entries(TOPIC_ZONE)) {
    const content = ZONE_CONTENT[zone]
    entries.push({
      id: `how-${topic}`,
      topics: [topic],
      intent: 'how',
      answer: content.how.map((step, i) => `${i + 1}. ${step}`).join(' ') + (content.howNote ? ` ${content.howNote}` : ''),
      sourceId: content.why[0].sourceId,
      route: `organ/${zone}`,
      routeLabel: `Open ${content.title}`,
    })
    entries.push({
      id: `why-${topic}`,
      topics: [topic],
      intent: 'why',
      answer: content.why.map((fact) => fact.text).join(' '),
      sourceId: content.why[0].sourceId,
      route: `organ/${zone}`,
      routeLabel: `Open ${content.title}`,
    })
  }
  return entries
}

export const KB: KbEntry[] = [...DEFINITIONS, ...zoneEntries()]
