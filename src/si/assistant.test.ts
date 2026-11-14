import { describe, expect, it } from 'vitest'
import { CREW } from '../data/crew'
import { ENVIRONMENTS } from '../data/environments'
import { assess } from '../engine/assess'
import type { Reading } from '../engine/types'
import { NOW0, SIM_READINGS } from '../sim/simulator'
import { reply, type KomekContext } from './assistant'
import { findIntent, findTopics, isOutOfScope, searchKb } from './search'

const member = CREW.find((c) => c.id === 'seitkali')!
const live: Reading = { crewId: member.id, t: NOW0, m: { hr: 88, rr: 15, spo2: 97, sbp: 118, dbp: 76 }, source: 'simulated' }
const ctx: KomekContext = {
  member,
  assessment: assess([...SIM_READINGS[member.id], live], Infinity)!,
  env: ENVIRONMENTS.transit,
  tasks: [],
  exerciseToday: 45,
}

describe('knowledge-base search', () => {
  it('finds topics, longer phrases first', () => {
    expect(findTopics('What is blood pressure?')).toEqual(['bp'])
    expect(findTopics('what is spo2')).toEqual(['spo2'])
    expect(findTopics('my blood sugar')).toEqual(['glucose'])
    expect(findTopics('tell me a joke')).toEqual([])
  })

  it('detects intent', () => {
    expect(findIntent('how do I measure BP in zero-g?')).toBe('how')
    expect(findIntent('why is my temp high?')).toBe('why')
    expect(findIntent('what is SpO2?')).toBe('what')
    expect(findIntent('what should I do about my pulse')).toBe('do')
  })

  it('picks the matching entry', () => {
    expect(searchKb('what is SpO2?')?.id).toBe('what-spo2')
    expect(searchKb('how do I measure BP in zero-g?')?.id).toBe('how-bp')
    expect(searchKb('why does bone loss matter')?.id).toBe('why-bone')
    expect(searchKb('what is space-news2')?.id).toBe('what-spacenews2')
    expect(searchKb('who won the football')).toBeNull()
  })

  it('refuses diagnosis and medication questions', () => {
    expect(isOutOfScope('do I have a heart attack?')).toBe(true)
    expect(isOutOfScope('should I take aspirin')).toBe(true)
    expect(isOutOfScope('what is my heart rate')).toBe(false)
  })
})

describe('KOMEK replies', () => {
  it('answers from the knowledge base with a source', () => {
    const answer = reply('what is SpO2?', ctx)
    expect(answer.text).toContain('oxygen saturation')
    expect(answer.sourceId).toBe('news2')
    expect(answer.forward).toBeUndefined()
  })

  it('gives measuring steps written for microgravity', () => {
    expect(reply('how do I measure BP in zero-g?', ctx).text).toContain('foot loops')
  })

  it('explains the personal-baseline drift in the status', () => {
    const answer = reply('Explain my status', ctx)
    expect(answer.text).toContain('NEWS2 is 0')
    expect(answer.text).toContain('24% above your 7-day normal')
    expect(answer.level).toBe('caution')
  })

  it('uses the crew member’s own number for personal questions', () => {
    expect(reply('why is my heart rate high?', ctx).text).toContain('Your heart rate is 88 bpm')
  })

  it('states the Earth-link delay for the current environment', () => {
    const answer = reply('Talk to flight surgeon', ctx)
    expect(answer.text).toContain('14 min 32 s')
    expect(answer.text).toContain('29 min 4 s')
  })

  it('does not invent an answer: unknown questions go to the flight surgeon', () => {
    const answer = reply('can I grow potatoes on Mars?', ctx)
    expect(answer.text).toContain('I don’t have verified guidance for this')
    expect(answer.forward).toBe('can I grow potatoes on Mars?')
  })

  it('never diagnoses or prescribes', () => {
    const answer = reply('should I take aspirin for my chest?', ctx)
    expect(answer.text).toContain('can’t diagnose or recommend medication')
    expect(answer.forward).toBeDefined()
  })
})
