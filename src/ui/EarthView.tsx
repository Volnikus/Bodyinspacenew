import { useMemo } from 'react'
import { CREW } from '../data/crew'
import { assess } from '../engine/assess'
import { useKomek } from '../state/komek'
import { buildReadings, useAllAssessments, useEnvironment } from '../state/selectors'
import { useApp, type OutboxMessage } from '../state/store'
import { SEC, clockText, countdownText, durationText } from '../state/time'
import { LEVEL_UI, StatusIcon } from './level'

/**
 * The same mission seen from both ends of the link. The spacecraft side is live.
 * The Earth side only knows what the signal has had time to deliver.
 */
export function EarthView() {
  const env = useEnvironment()
  const now = useApp((s) => s.now)
  const manual = useApp((s) => s.manual)
  const outbox = useApp((s) => s.outbox)
  const live = useAllAssessments()
  const delayMs = env.linkOneWayS * SEC
  const target = env.linkTarget ? 'Doctor' : 'Earth'

  // What Earth can know: every reading that left the ship at least one signal trip ago.
  const minute = Math.floor(now / 60_000)
  const delayed = useMemo(
    () => Object.fromEntries(CREW.map((c) => [c.id, assess(buildReadings(c.id, manual, undefined, now), now - delayMs)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [manual, delayMs, minute],
  )

  const messages = [...outbox].reverse()
  const arrived = (m: OutboxMessage) => now - m.sentAt >= m.delayMs

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="heading text-[1.7rem]">Spacecraft and {target}, side by side</h1>
          <p className="label">
            {delayMs === 0 ? 'The link is live: both sides see the same thing.' : `Everything on the right is ${durationText(delayMs)} old. That gap is why the guide has to work on board.`}
          </p>
        </div>
        <button className="tap tap-primary" onClick={() => useKomek.getState().queueStatus()}>
          Send a status report
        </button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
        {(['ship', 'earth'] as const).map((side) => {
          const isEarth = side === 'earth'
          return (
            <section key={side} className={`panel flex min-h-0 flex-col p-4 ${isEarth ? 'border-link-deep' : ''}`} aria-label={isEarth ? `${target} view` : 'Spacecraft view'}>
              <div className="flex items-baseline justify-between">
                <h2 className="heading text-[1.3rem]">{isEarth ? `${target}: flight surgeon console` : 'Spacecraft: now'}</h2>
                <span className={`num text-[1rem] ${isEarth ? 'text-link' : 'text-dim'}`}>
                  {isEarth ? (delayMs === 0 ? 'live' : `data as of ${durationText(delayMs)} ago`) : clockText(now)}
                </span>
              </div>

              <ul className="mt-3 grid grid-cols-2 gap-2">
                {CREW.map((member) => {
                  const a = isEarth ? delayed[member.id] : live[member.id]
                  if (!a) return null
                  const ui = LEVEL_UI[a.overall]
                  return (
                    <li key={member.id} className="flex items-center gap-2.5 rounded-[12px] bg-panel px-3 py-2.5">
                      <StatusIcon level={a.overall} size={24} />
                      <span className="min-w-0 flex-1">
                        <span className="heading block truncate text-[1rem]">{member.name}</span>
                        <span className={`text-[0.85rem] font-semibold ${ui.text}`}>{ui.word}</span>
                        <span className="label"> pulse {Math.round(a.metrics.hr ?? 0)}, SpO2 {Math.round(a.metrics.spo2 ?? 0)}%</span>
                      </span>
                      <span className="num text-[1.6rem]" style={{ color: LEVEL_UI[a.level].color }}>
                        {a.news2.total}
                      </span>
                    </li>
                  )
                })}
              </ul>

              <h3 className="label mt-4">{isEarth ? 'Reports received' : 'Sent from the ship'}</h3>
              <ul className="scroll-quiet mt-2 flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
                {messages.length === 0 && <li className="text-dim">{isEarth ? 'Nothing received yet.' : 'Nothing sent yet. Questions to KOMEK, SOS events and status reports appear here.'}</li>}
                {messages.map((message) => {
                  const here = arrived(message)
                  if (isEarth && !here) {
                    return (
                      <li key={message.id} className="rounded-[12px] border border-dashed border-line px-3 py-2.5 text-dim">
                        A message is on its way. It arrives in <span className="num text-link">{countdownText(message.sentAt + message.delayMs - now)}</span>.
                      </li>
                    )
                  }
                  return (
                    <li key={message.id} className="rounded-[12px] bg-panel px-3 py-2.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-semibold">{message.title}</span>
                        <span className="num shrink-0 text-[0.9rem] text-dim">
                          {isEarth ? `received ${clockText(message.sentAt + message.delayMs)}` : here ? `sent ${clockText(message.sentAt)}, delivered` : `sent ${clockText(message.sentAt)}, in transit`}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-3 whitespace-pre-line text-[0.9rem] text-dim">{message.body}</p>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
