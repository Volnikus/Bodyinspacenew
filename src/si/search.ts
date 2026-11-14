import { KB, TOPIC_PHRASES, type Intent, type KbEntry } from './kb'

export function normalize(text: string): string {
  return ` ${text
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9%\- ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `
}

/** Topics mentioned in a question. A longer phrase claims its words first ("blood pressure" beats "blood"). */
export function findTopics(question: string): string[] {
  const text = normalize(question)
  const matches: { topic: string; start: number; end: number }[] = []
  for (const [topic, phrases] of Object.entries(TOPIC_PHRASES)) {
    for (const phrase of phrases) {
      const needle = ` ${phrase} `
      let from = 0
      for (;;) {
        const at = text.indexOf(needle, from)
        if (at === -1) break
        matches.push({ topic, start: at + 1, end: at + 1 + phrase.length })
        from = at + 1
      }
    }
  }
  matches.sort((a, b) => b.end - b.start - (a.end - a.start))
  const taken: { start: number; end: number }[] = []
  const topics: string[] = []
  for (const match of matches) {
    if (taken.some((t) => match.start < t.end && match.end > t.start)) continue
    taken.push(match)
    if (!topics.includes(match.topic)) topics.push(match.topic)
  }
  return topics
}

export function findIntent(question: string): Intent | null {
  const text = normalize(question)
  if (/ what (should|do|can) (i|we) do | what now | what to do | how (do|can) (i|we) (fix|lower|raise|improve|treat) /.test(text)) return 'do'
  if (/ how (do|to|can|should) | measure | measuring | take my | check my /.test(text)) return 'how'
  if (/ why | matter | matters | important | reason /.test(text)) return 'why'
  if (/ what (is|are|does|s) | whats | mean | means | define | explain | tell me about /.test(text)) return 'what'
  return null
}

/** True when the question is about the person asking ("my", "am I"). */
export function isPersonal(question: string): boolean {
  return / (my|mine|am i|i am|im|me) /.test(normalize(question))
}

/** Questions KOMEK must not answer: diagnosis and medication. */
export function isOutOfScope(question: string): boolean {
  return / (diagnos\w*|do i have|have i got|prescri\w*|pills?|medication|medicine|drugs?|dosage|antibiotics?|painkillers?|should i take|can i take|how much \w+ should) /.test(
    normalize(question),
  )
}

/** Best knowledge-base entry for a question, or null when nothing matches. */
export function searchKb(question: string): KbEntry | null {
  const topics = findTopics(question)
  if (topics.length === 0) return null
  const intent = findIntent(question) ?? 'what'
  let best: KbEntry | null = null
  let bestScore = 0
  for (const entry of KB) {
    const overlap = entry.topics.filter((t) => topics.includes(t)).length
    if (overlap === 0) continue
    // Earlier topics in the question matter more.
    const position = Math.min(...entry.topics.map((t) => topics.indexOf(t)).filter((i) => i >= 0))
    const score = overlap * 3 + (entry.intent === intent ? 2 : 0) + (entry.intent === 'what' ? 0.5 : 0) - position * 0.4
    if (score > bestScore) {
      best = entry
      bestScore = score
    }
  }
  return best
}
