import { ZONE_CONTENT, actionsFor, genericActions } from '../data/content'
import type { CrewMember } from '../data/crew'
import type { Environment } from '../data/environments'
import { METRIC_INFO, formatMetric } from '../data/metrics'
import type { SourceId } from '../data/sources'
import { EXERCISE } from '../data/thresholds'
import type { Assessment } from '../engine/assess'
import type { Finding, Level, NumericMetricKey, OrganId, ZoneId } from '../engine/types'
import type { UpcomingTask } from '../state/selectors'
import { SEC, durationText } from '../state/time'
import { TOPIC_ZONE } from './kb'
import { findIntent, findTopics, isOutOfScope, isPersonal, normalize, searchKb } from './search'

/**
 * KOMEK's "SI core": deterministic rules plus a keyword search over the project's
 * knowledge base. It works offline, never diagnoses and never prescribes. Anything
 * it cannot answer from checked material is logged for the flight surgeon.
 */

export interface KomekAction {
  label: string
  /** Screen to open. */
  route?: string
  /** Built-in action. */
  run?: 'queue-status' | 'select-crew'
  crewId?: string
}

export interface KomekReply {
  text: string
  sourceId?: SourceId
  actions?: KomekAction[]
  level?: Level
  /** Set when the question is forwarded to the flight surgeon. */
  forward?: string
}

export interface KomekContext {
  member: CrewMember
  assessment: Assessment
  env: Environment
  tasks: UpcomingTask[]
  exerciseToday: number
}

const RANK: Record<Level, number> = { ok: 0, caution: 1, alert: 2 }
const first = (name: string) => name.split(' ')[0]

export function allFindings(a: Assessment): Finding[] {
  return Object.values(a.organs)
    .flatMap((o) => o.findings)
    .sort((x, y) => RANK[y.level] - RANK[x.level])
}

/** "It reaches Earth in 14 min 32 s. The earliest reply is in 29 min 4 s." */
export function linkSentence(env: Environment): string {
  if (env.linkOneWayS === 0) return 'Mission Control is live, so a flight surgeon can answer right away.'
  const oneWay = env.linkOneWayS * SEC
  return `A message reaches ${env.linkTarget ?? 'Earth'} in ${durationText(oneWay)}. The earliest reply is in ${durationText(oneWay * 2)}.`
}

export function explainStatus(ctx: KomekContext): KomekReply {
  const { assessment: a, member } = ctx
  const findings = allFindings(a)
  const score = `${first(member.name)}, NEWS2 is ${a.news2.total}: ${a.news2.label.toLowerCase()}.`
  if (findings.length === 0) {
    const next = ctx.tasks.find((t) => t.inMs > 0)
    return {
      text: `${score} Every zone is in your normal range.${next ? ` Next: ${next.def.title.toLowerCase()} in ${durationText(next.inMs)}.` : ''}`,
      sourceId: 'spaceNews2',
      level: 'ok',
    }
  }
  const top = findings.slice(0, 2)
  const actions = actionsFor(top, a.metrics)
  const urgent = a.news2.level === 'alert' || a.news2.singleRed
  const drift = a.baseline.length > 0 && a.news2.level === 'ok' ? ' Space-NEWS2 also checks you against your own normal.' : ''
  return {
    text: `${score}${drift} ${top.map((f) => f.text).join(' ')} ${urgent ? 'Open the SOS guide now.' : (actions[0] ?? '')}`.trim(),
    sourceId: top[0].sourceId as SourceId,
    level: a.overall,
    actions: urgent
      ? [{ label: 'Open SOS guide', route: 'sos' }]
      : [{ label: 'See why', route: `organ/${top[0].organ}` }],
  }
}

export function whatToMeasure(ctx: KomekContext): KomekReply {
  const lines: string[] = []
  const flagged = allFindings(ctx.assessment).find((f) => f.kind !== 'threshold' && f.level !== 'ok')
  if (flagged) {
    const info = METRIC_INFO[flagged.metric as NumericMetricKey]
    if (info) lines.push(`First, rest 5 minutes and measure ${info.label.toLowerCase()} again: it is flagged.`)
  }
  const overdue = ctx.tasks.filter((t) => t.inMs < 0)
  for (const task of overdue.slice(0, 2)) lines.push(`Overdue: ${task.def.title.toLowerCase()} (${durationText(-task.inMs)} late).`)
  const next = ctx.tasks.find((t) => t.inMs >= 0)
  if (next) lines.push(`Next: ${next.def.title.toLowerCase()} in ${durationText(next.inMs)}.`)
  if (ctx.exerciseToday < EXERCISE.planMin) lines.push(`Exercise: ${ctx.exerciseToday} of ${EXERCISE.planMin} min done.`)
  if (lines.length === 0) lines.push('Nothing is due right now. Everything for today is logged.')
  const target = overdue[0] ?? next
  return {
    text: lines.join(' '),
    actions: [{ label: 'Log a measurement', route: target?.def.route ?? 'measure' }],
  }
}

export function talkToSurgeon(ctx: KomekContext): KomekReply {
  return {
    text:
      ctx.env.linkOneWayS === 0
        ? 'Mission Control is live. Call the flight surgeon on the voice loop. I can send your status summary alongside.'
        : `I can queue your status for the flight surgeon. ${linkSentence(ctx.env)} Until then, follow the onboard guide and I’ll stay with you.`,
    sourceId: 'commDelay',
    actions: [{ label: 'Queue status report', run: 'queue-status' }],
  }
}

/** The "?" button on a body zone: what it does, how this crew member is doing, why it matters. */
export function aboutZone(zone: ZoneId, ctx: KomekContext): KomekReply {
  const content = ZONE_CONTENT[zone]
  const organ = zone === 'air' || zone === 'radiation' ? null : ctx.assessment.organs[zone as OrganId]
  const flagged = organ?.findings.filter((f) => f.level !== 'ok') ?? []
  const status = organ ? (flagged.length > 0 ? flagged.map((f) => f.text).join(' ') : 'Yours is in the normal range right now.') : ''
  return {
    text: `${content.what} ${status} ${content.why[0].text}`.replace(/\s+/g, ' ').trim(),
    sourceId: content.why[0].sourceId,
    level: organ?.level,
    actions: [{ label: `Open ${content.title}`, route: `organ/${zone}` }],
  }
}

const FALLBACK = 'I don’t have verified guidance for this. Logging it for your flight surgeon.'

/** Answers one typed or tapped question. */
export function reply(question: string, ctx: KomekContext): KomekReply {
  const text = normalize(question)

  if (/ explain my status | my status | how am i | am i ok | am i okay | how am i doing /.test(text)) return explainStatus(ctx)
  if (/ what should i measure | measure now | what is due | whats due | what next | my tasks /.test(text)) return whatToMeasure(ctx)
  if (/ talk to (the )?(flight )?(surgeon|doctor) | call (the )?(flight )?(surgeon|doctor|earth|mission control) | contact earth /.test(text)) return talkToSurgeon(ctx)

  if (isOutOfScope(question)) {
    return {
      text: `I can’t diagnose or recommend medication. I can show what your readings mean and the steps in the onboard guide. Logging your question for the flight surgeon. ${linkSentence(ctx.env)}`,
      forward: question,
    }
  }

  const topics = findTopics(question)
  const intent = findIntent(question)

  // Questions about the link to Earth depend on where the mission is.
  if (topics[0] === 'earth' || topics[0] === 'surgeon') {
    return { text: `${linkSentence(ctx.env)} ${ctx.env.support}`, sourceId: 'commDelay' }
  }
  if (topics[0] === 'evac') {
    return { text: `${ctx.env.evacuation} in ${ctx.env.name}. ${ctx.env.support}`, sourceId: 'eimo' }
  }

  const entry = searchKb(question)
  if (!entry) return { text: `${FALLBACK} ${linkSentence(ctx.env)}`, forward: question }

  // Personal questions get the crew member's own numbers first.
  const zoneInfo = TOPIC_ZONE[topics[0]]
  let personal = ''
  let level: Level | undefined
  if (zoneInfo && (isPersonal(question) || intent === 'do')) {
    const a = ctx.assessment
    const key = zoneInfo.metrics[0] as NumericMetricKey | undefined
    const value = key ? a.metrics[key] : undefined
    if (key && typeof value === 'number') personal = `Your ${METRIC_INFO[key].label.toLowerCase()} is ${formatMetric(key, value)} ${METRIC_INFO[key].unit}. `
    const mine = [...allFindings(a), ...a.hints].filter((f) => zoneInfo.metrics.includes(f.metric))
    if (mine.length > 0) {
      personal += `${mine.map((f) => f.text).join(' ')} `
      level = mine.reduce<Level>((worst, f) => (RANK[f.level] > RANK[worst] ? f.level : worst), 'ok')
    } else if (key) {
      personal += 'That is inside your normal range. '
    }
    if (intent === 'do') {
      const flagged = mine.filter((f) => f.level !== 'ok')
      const steps = flagged.length > 0 ? actionsFor(flagged, a.metrics) : key ? genericActions(key, a.metrics) : []
      if (steps.length > 0) {
        return {
          text: `${personal}${flagged.length > 0 ? '' : 'If it gets flagged: '}${steps.join(' ')}`,
          sourceId: entry.sourceId,
          level,
          actions: [{ label: entry.routeLabel ?? 'Open zone', route: `organ/${zoneInfo.zone}` }],
        }
      }
    }
  }

  return {
    text: `${personal}${entry.answer}`,
    sourceId: entry.sourceId,
    level,
    actions: entry.route ? [{ label: entry.routeLabel ?? 'Open', route: entry.route }] : undefined,
  }
}

/** Short message when a zone's status gets worse. */
export function statusAlert(member: CrewMember, a: Assessment, findings: Finding[], isSelected: boolean): KomekReply {
  const top = [...findings].sort((x, y) => RANK[y.level] - RANK[x.level]).slice(0, 2)
  const said = top.map((f) => f.text).join(' ')
  const step = actionsFor(top, a.metrics)[0] ?? ''
  return {
    text: isSelected ? `${said} ${step} Tap to see why.` : `${member.name}: ${said}`,
    sourceId: top[0].sourceId as SourceId,
    level: top[0].level,
    actions: isSelected
      ? [{ label: 'See why', route: `organ/${top[0].organ}` }]
      : [{ label: `Show ${first(member.name)}`, run: 'select-crew', crewId: member.id, route: `organ/${top[0].organ}` }],
  }
}

/** The one message that must never be missed. */
export function sosAlert(member: CrewMember, a: Assessment, env: Environment): KomekReply {
  const wait = env.linkOneWayS === 0 ? 'Call Mission Control as you go.' : `Earth’s earliest reply is ${durationText(env.linkOneWayS * 2 * SEC)} away.`
  return {
    text: `${member.name}: NEWS2 ${a.news2.total}, ${a.news2.label.toLowerCase()}. Open the SOS guide now. ${wait}`,
    sourceId: 'news2',
    level: 'alert',
    actions: [{ label: 'Open SOS guide', route: 'sos', run: 'select-crew', crewId: member.id }],
  }
}
