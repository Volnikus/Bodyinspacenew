import { create } from 'zustand'
import { crewById } from '../data/crew'
import { ENVIRONMENTS } from '../data/environments'
import { assess } from '../engine/assess'
import type { ZoneId } from '../engine/types'
import { aboutZone, explainStatus, reply, type KomekContext, type KomekReply } from '../si/assistant'
import { buildReadings, openTasks } from './selectors'
import { useApp } from './store'
import { SEC } from './time'

export interface KomekMessage extends KomekReply {
  id: number
  from: 'komek' | 'crew'
  /** Mission time. */
  t: number
}

interface KomekState {
  open: boolean
  messages: KomekMessage[]
  unread: number
  /** Latest proactive message, shown beside the collapsed assistant. */
  toast: KomekMessage | null
  voice: boolean

  setOpen: (open: boolean) => void
  dismissToast: () => void
  toggleVoice: () => void
  /** KOMEK speaks. `toast` also shows it beside the collapsed assistant. */
  say: (message: KomekReply, toast?: boolean) => void
  ask: (question: string) => void
  askAbout: (zone: ZoneId, title: string) => void
  queueStatus: () => void
}

let nextId = 1

/** Everything KOMEK knows about the crew member in front of the tablet. */
export function komekContext(): KomekContext {
  const app = useApp.getState()
  const crewId = app.selectedCrewId
  return {
    member: crewById(crewId),
    assessment: assess(buildReadings(crewId, app.manual, app.live[crewId], app.now), Infinity)!,
    env: ENVIRONMENTS[app.envId],
    tasks: openTasks(crewId, app.now, app.tasksDone),
    exerciseToday: app.exerciseToday[crewId] ?? 0,
  }
}

/** Optional read-aloud, for when hands are busy. Uses the browser's synthetic voice. */
function speak(text: string) {
  try {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 1.02
    window.speechSynthesis.speak(utterance)
  } catch {
    // Speech is a convenience; the text is always on screen.
  }
}

export const useKomek = create<KomekState>()((set, get) => ({
  open: false,
  messages: [],
  unread: 0,
  toast: null,
  voice: false,

  setOpen: (open) => set(open ? { open, unread: 0, toast: null } : { open }),
  dismissToast: () => set({ toast: null }),
  toggleVoice: () => {
    const voice = !get().voice
    if (!voice) window.speechSynthesis?.cancel()
    set({ voice })
  },

  say: (message, toast = false) => {
    const state = get()
    const full: KomekMessage = { ...message, id: nextId++, from: 'komek', t: useApp.getState().now }
    if (state.voice) speak(message.text)
    set({
      messages: [...state.messages, full],
      unread: state.open ? 0 : state.unread + 1,
      toast: toast && !state.open ? full : state.toast,
    })
  },

  ask: (question) => {
    const text = question.trim()
    if (!text) return
    const app = useApp.getState()
    const ctx = komekContext()
    set((s) => ({ open: true, unread: 0, toast: null, messages: [...s.messages, { id: nextId++, from: 'crew', t: app.now, text }] }))
    const answer = reply(text, ctx)
    if (answer.forward) {
      app.queueMessage({
        kind: 'question',
        title: `Question from ${ctx.member.name}`,
        body: answer.forward,
        crewId: ctx.member.id,
        delayMs: ctx.env.linkOneWayS * SEC,
      })
    }
    get().say(answer)
  },

  askAbout: (zone, title) => {
    const app = useApp.getState()
    set((s) => ({ open: true, unread: 0, toast: null, messages: [...s.messages, { id: nextId++, from: 'crew', t: app.now, text: `Tell me about ${title.toLowerCase()}.` }] }))
    get().say(aboutZone(zone, komekContext()))
  },

  queueStatus: () => {
    const app = useApp.getState()
    const ctx = komekContext()
    app.queueMessage({
      kind: 'report',
      title: `Status report: ${ctx.member.name}`,
      body: explainStatus(ctx).text,
      crewId: ctx.member.id,
      delayMs: ctx.env.linkOneWayS * SEC,
    })
    get().say({
      text:
        ctx.env.linkOneWayS === 0
          ? 'Status report sent to Mission Control.'
          : 'Status report queued. I’ll keep it in the outbox until the link carries it to Earth.',
      sourceId: 'medOps',
    })
  },
}))
