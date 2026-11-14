import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CREW, crewById } from '../data/crew'
import { ENVIRONMENTS } from '../data/environments'
import { ZONE_CONTENT } from '../data/content'
import { source } from '../data/sources'
import { taskKey } from '../data/tasks'
import { EXERCISE } from '../data/thresholds'
import type { Level, OrganId } from '../engine/types'
import { linkSentence, sosAlert, statusAlert, type KomekAction } from '../si/assistant'
import { activeSolarEvent, useDonki } from '../state/donki'
import { komekContext, useKomek, type KomekMessage } from '../state/komek'
import { go, useRoute } from '../state/route'
import { openTasks, useAllAssessments } from '../state/selectors'
import { useSos } from '../state/sos'
import { useApp } from '../state/store'
import { MIN, countdownText, durationText, missionDay } from '../state/time'
import { CloseIcon, SendIcon, SoundIcon } from './icons'
import { KomekSprite, type KomekMood } from './KomekSprite'
import { LEVEL_UI } from './level'

const RANK: Record<Level, number> = { ok: 0, caution: 1, alert: 2 }
const ORGANS: OrganId[] = ['brain', 'eyes', 'heart', 'lungs', 'blood', 'bones', 'skin']
const QUICK = ['Explain my status', 'What should I measure now?', 'Talk to flight surgeon']
let greeted = false

/** KOMEK's face in small places (panel header, SOS bar). */
export function KomekGlyph({ size = 40, level = 'ok' as Level, active = false }) {
  return <KomekSprite size={size} level={level} mood={active ? 'notice' : 'idle'} />
}

function runAction(action: KomekAction) {
  if (action.run === 'select-crew' && action.crewId) useApp.getState().selectCrew(action.crewId)
  if (action.run === 'queue-status') useKomek.getState().queueStatus()
  if (action.route !== undefined) {
    go(action.route)
    useKomek.getState().setOpen(false)
  }
  useKomek.getState().dismissToast()
}

function Bubble({ message }: { message: KomekMessage }) {
  if (message.from === 'crew') {
    return <div className="ml-10 self-end rounded-[16px] rounded-br-[2px] bg-link-deep px-3.5 py-2 text-[0.97rem]">{message.text}</div>
  }
  const flagged = message.level && message.level !== 'ok'
  return (
    <div
      className="mr-6 self-start rounded-[16px] rounded-bl-[2px] border bg-panel px-3.5 py-2.5 text-[0.97rem] leading-snug"
      style={{ borderColor: flagged ? LEVEL_UI[message.level!].color : 'var(--color-line-soft)' }}
    >
      {message.text}
      {message.sourceId && (
        <a href={source(message.sourceId).url} target="_blank" rel="noreferrer" className="mt-1 block text-[0.76rem] leading-snug text-link underline decoration-link/40 underline-offset-2">
          Source: {source(message.sourceId).label}
        </a>
      )}
      {message.actions && message.actions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {message.actions.map((action) => (
            <button
              key={action.label}
              className={`min-h-[46px] rounded-[12px] px-3.5 text-[0.95rem] font-semibold ${action.route === 'sos' ? 'bg-alert text-[#190308]' : 'border border-link text-link'}`}
              style={{ fontStretch: '88%' }}
              onClick={() => runAction(action)}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Speaks up when a status gets worse, when a task is due and when the environment changes. */
function useKomekWatcher() {
  const assessments = useAllAssessments()
  const envId = useApp((s) => s.envId)
  const selectedId = useApp((s) => s.selectedCrewId)
  const minute = Math.floor(useApp((s) => s.now) / MIN)
  const sosActive = useSos((s) => s.active)
  const [ready, setReady] = useState(false)
  const levels = useRef<Record<string, Level>>({})
  const bands = useRef<Record<string, string>>({})
  const lastSaid = useRef<Record<string, number>>({})
  const reminded = useRef<Set<string>>(new Set())
  const lastEnv = useRef(envId)

  // Opening lines, a moment after the dashboard has drawn.
  useEffect(() => {
    const { say } = useKomek.getState()
    if (!greeted) {
      greeted = true
      say({ text: 'KOMEK here, your onboard SI assistant. I work without a link to Earth and answer only from checked sources.' })
    }
    const timer = window.setTimeout(() => setReady(true), 1800)
    return () => window.clearTimeout(timer)
  }, [])

  // Status changes.
  useEffect(() => {
    if (!ready) return
    const { say } = useKomek.getState()
    const env = ENVIRONMENTS[useApp.getState().envId]
    const first = Object.keys(levels.current).length === 0
    const others: string[] = []

    for (const member of CREW) {
      const a = assessments[member.id]
      const isSelected = member.id === selectedId
      const worse = []
      for (const organ of ORGANS) {
        const key = `${member.id}:${organ}`
        const current = a.organs[organ].level
        const before = levels.current[key] ?? (first && !isSelected ? current : 'ok')
        if (RANK[current] > RANK[before]) worse.push(...a.organs[organ].findings.filter((f) => f.level === current))
        else if (current === 'ok' && before !== 'ok' && isSelected && !sosActive) {
          say({ text: `${ZONE_CONTENT[organ].title} is back in the normal range.`, level: 'ok' })
        }
        if (RANK[current] <= RANK[before]) levels.current[key] = current
      }
      if (first && !isSelected && a.overall !== 'ok') {
        const zones = ORGANS.filter((o) => a.organs[o].level !== 'ok').map((o) => ZONE_CONTENT[o].title.toLowerCase())
        others.push(`${member.name} (${zones.join(', ')})`)
      }

      const band = a.news2.band
      const wasHigh = bands.current[member.id] === 'high'
      bands.current[member.id] = band
      if (sosActive) {
        for (const organ of ORGANS) levels.current[`${member.id}:${organ}`] = a.organs[organ].level
        continue
      }
      if (band === 'high' && !wasHigh) {
        for (const organ of ORGANS) levels.current[`${member.id}:${organ}`] = a.organs[organ].level
        lastSaid.current[member.id] = Date.now()
        say(sosAlert(member, a, env), true)
      } else if (worse.length > 0 && Date.now() - (lastSaid.current[member.id] ?? 0) > 5000) {
        // Announce, then remember the new levels. Changes inside the quiet window are picked up next time.
        for (const organ of ORGANS) levels.current[`${member.id}:${organ}`] = a.organs[organ].level
        lastSaid.current[member.id] = Date.now()
        say(statusAlert(member, a, worse, isSelected), true)
      }
    }

    if (first) {
      if (others.length > 0) say({ text: `Also worth a look: ${others.join('; ')}.` })
      const ctx = komekContext()
      const next = ctx.tasks.find((t) => t.inMs > 0)
      const parts = []
      if (next) parts.push(`${next.def.title} in ${durationText(next.inMs)}.`)
      if (ctx.exerciseToday < EXERCISE.planMin) parts.push(`Exercise: ${ctx.exerciseToday} of ${EXERCISE.planMin} min done.`)
      if (parts.length > 0) say({ text: parts.join(' '), actions: [{ label: 'Log a measurement', route: 'measure' }] })
    }
  }, [assessments, ready, selectedId, sosActive])

  // Reminders: due within 10 minutes, or overdue.
  useEffect(() => {
    if (!ready || sosActive) return
    const app = useApp.getState()
    const day = missionDay(app.now)
    for (const task of openTasks(selectedId, app.now, app.tasksDone)) {
      const key = taskKey(selectedId, day, task.def.id)
      if (task.inMs > 0 && task.inMs <= 10 * MIN && !reminded.current.has(`${key}:due`)) {
        reminded.current.add(`${key}:due`)
        useKomek.getState().say({ text: `${task.def.title} due in ${durationText(task.inMs)}.`, actions: [{ label: 'Log it', route: task.def.route }] }, true)
      } else if (task.inMs < 0 && !reminded.current.has(`${key}:late`)) {
        reminded.current.add(`${key}:late`)
        useKomek.getState().say({ text: `${crewById(selectedId).name.split(' ')[0]}, ${task.def.nudge.charAt(0).toLowerCase()}${task.def.nudge.slice(1)}`, level: 'caution', actions: [{ label: 'Log it', route: task.def.route }] }, true)
      }
    }
  }, [minute, selectedId, ready, sosActive])

  // Space weather: load the NASA DONKI feed once, speak up when an event calls for the shelter.
  const donkiEvents = useDonki((s) => s.events)
  const donkiSimulated = useDonki((s) => s.simulated)
  const solarSaid = useRef<string | null>(null)
  useEffect(() => {
    void useDonki.getState().load()
  }, [])
  useEffect(() => {
    if (!ready) return
    const event = activeSolarEvent({ events: donkiEvents, simulated: donkiSimulated })
    if (!event) {
      solarSaid.current = null
      return
    }
    if (solarSaid.current === event.id) return
    solarSaid.current = event.id
    useKomek.getState().say(
      {
        text: `Solar event detected — go to storm shelter. ${event.kind}, ${event.detail}.`,
        sourceId: event.id === 'simulated' ? undefined : 'donki',
        level: 'caution',
        actions: [{ label: 'Open Radiation', route: 'organ/radiation' }],
      },
      true,
    )
  }, [donkiEvents, donkiSimulated, ready])

  // A new environment changes who can help and how fast.
  useEffect(() => {
    if (!ready || lastEnv.current === envId) return
    lastEnv.current = envId
    const env = ENVIRONMENTS[envId]
    useKomek.getState().say({ text: `Now set to ${env.name}. ${linkSentence(env)} ${env.evacuation}.`, sourceId: 'commDelay' }, true)
  }, [envId, ready])
}

export function Komek() {
  useKomekWatcher()
  const komek = useKomek()
  const route = useRoute()
  const [view = ''] = route
  // A message that only points at the screen already open would just cover it.
  const toastIsHere = komek.toast?.actions?.some((a) => a.route !== undefined && a.route === route.join('/')) ?? false
  const assessments = useAllAssessments()
  const selectedId = useApp((s) => s.selectedCrewId)
  const sos = useSos()
  const now = useApp((s) => s.now)
  const [draft, setDraft] = useState('')
  const end = useRef<HTMLDivElement>(null)
  const level = assessments[selectedId].overall
  const mood: KomekMood = komek.toast?.level === 'alert' || level === 'alert' ? 'alert' : komek.toast || komek.unread > 0 ? 'notice' : 'idle'

  useEffect(() => {
    if (komek.open) end.current?.scrollIntoView({ block: 'end' })
  }, [komek.open, komek.messages.length])

  // Quiet messages fade on their own; warnings stay until answered.
  useEffect(() => {
    if (!komek.toast || komek.toast.level === 'alert') return
    const timer = window.setTimeout(() => useKomek.getState().dismissToast(), 8000)
    return () => window.clearTimeout(timer)
  }, [komek.toast])

  // During an emergency KOMEK only repeats the current step.
  const stepTitle = sos.currentStepTitle
  useEffect(() => {
    if (sos.active && stepTitle && useKomek.getState().voice) {
      window.speechSynthesis?.cancel()
      window.speechSynthesis?.speak(new SpeechSynthesisUtterance(stepTitle))
    }
  }, [sos.active, stepTitle])

  if (view === 'sos') {
    return (
      <div className="pointer-events-none fixed bottom-[46px] left-1/2 z-40 flex max-w-[min(560px,60vw)] -translate-x-1/2 items-center gap-3 rounded-full border border-alert/60 bg-void/95 py-1.5 pl-2 pr-5" role="status">
        <KomekGlyph size={38} level="alert" active />
        <span className="truncate text-[0.95rem] font-semibold">{stepTitle}</span>
        <span className="num text-[1.05rem] text-dim">{countdownText(sos.active ? now - sos.startedAt : 0)}</span>
      </div>
    )
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    komek.ask(draft)
    setDraft('')
  }

  return (
    <div className="pointer-events-none fixed bottom-[46px] right-4 z-40 flex flex-col items-end gap-2 [&>*]:pointer-events-auto">
      {komek.open && (
        <section className="flex h-[min(560px,calc(100vh-150px))] w-[min(410px,calc(100vw-32px))] flex-col overflow-hidden rounded-[16px] border border-line bg-deck shadow-[0_18px_60px_rgba(0,0,0,0.6)]" aria-label="KOMEK, onboard SI assistant">
          <header className="flex items-center gap-3 border-b border-line-soft px-3.5 py-2.5">
            <KomekGlyph size={38} level={level} />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="heading text-[1.1rem]">KOMEK</div>
              <div className="label truncate">Onboard SI assistant. Works offline.</div>
            </div>
            <button className="tap min-h-[48px] min-w-[48px] px-0" onClick={komek.toggleVoice} aria-pressed={komek.voice} aria-label={komek.voice ? 'Turn read-aloud off' : 'Turn read-aloud on (synthetic voice)'}>
              <SoundIcon off={!komek.voice} size={22} />
            </button>
            <button className="tap min-h-[48px] min-w-[48px] px-0" onClick={() => komek.setOpen(false)} aria-label="Close KOMEK">
              <CloseIcon size={22} />
            </button>
          </header>

          <div className="scroll-quiet flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-3" aria-live="polite">
            {komek.messages.map((message) => (
              <Bubble key={message.id} message={message} />
            ))}
            <div ref={end} />
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-line-soft px-3 pt-2.5">
            {QUICK.map((question) => (
              <button key={question} className="min-h-[44px] rounded-full border border-line px-3 text-[0.88rem] font-semibold text-dim hover:border-link hover:text-star" style={{ fontStretch: '86%' }} onClick={() => komek.ask(question)}>
                {question}
              </button>
            ))}
          </div>
          <form className="flex gap-2 p-3" onSubmit={submit}>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask: what is SpO2?"
              aria-label="Ask KOMEK a question"
              className="min-h-[52px] min-w-0 flex-1 rounded-[12px] border border-line bg-void px-3.5 text-[1rem] text-star placeholder:text-faint focus:border-link focus:outline-none"
            />
            <button type="submit" className="tap tap-primary min-h-[52px] min-w-[56px] px-0" aria-label="Send question">
              <SendIcon size={22} />
            </button>
          </form>
        </section>
      )}

      {!komek.open && komek.toast && !toastIsHere && (view === '' || komek.toast.level === 'alert') && (
        <div
          className="komek-toast w-[min(340px,calc(100vw-32px))] rounded-[16px] rounded-br-[2px] border bg-deck px-3.5 py-3 text-[0.97rem] leading-snug shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
          style={{ borderColor: komek.toast.level && komek.toast.level !== 'ok' ? LEVEL_UI[komek.toast.level].color : 'var(--color-line)' }}
          role="status"
        >
          <div className="flex items-start gap-2">
            <p className="flex-1">{komek.toast.text}</p>
            <button className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-dim hover:text-star" onClick={komek.dismissToast} aria-label="Dismiss message">
              <CloseIcon size={18} />
            </button>
          </div>
          {komek.toast.actions && (
            <div className="mt-2 flex flex-wrap gap-2">
              {komek.toast.actions.map((action) => (
                <button
                  key={action.label}
                  className={`min-h-[46px] rounded-[12px] px-3.5 text-[0.95rem] font-semibold ${action.route === 'sos' ? 'bg-alert text-[#190308]' : 'border border-link text-link'}`}
                  style={{ fontStretch: '88%' }}
                  onClick={() => runAction(action)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {!komek.open && (
        <button
          className={`komek-hatch relative h-[70px] w-[70px] ${mood === 'idle' ? '' : 'komek-hatch-up'}`}
          onClick={() => komek.setOpen(true)}
          aria-label={`Open KOMEK, onboard SI assistant${komek.unread > 0 ? `, ${komek.unread} new` : ''}`}
        >
          {/* KOMEK waits behind the ledge and climbs out when it has something to say. */}
          <span className="komek-window">
            <span key={`${mood}-${komek.toast?.id ?? 0}`} className={`komek-rise komek-rise-${mood}`}>
              <KomekSprite size={60} level={level} mood={mood} />
            </span>
          </span>
          <span className="komek-ledge" />
          {komek.unread > 0 && (
            <span className="num absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-link px-1.5 text-[0.85rem] text-[#0a1024]">{komek.unread}</span>
          )}
        </button>
      )}
    </div>
  )
}
