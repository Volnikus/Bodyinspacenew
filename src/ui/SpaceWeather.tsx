import { useEffect } from 'react'
import { source } from '../data/sources'
import { activeSolarEvent, useDonki } from '../state/donki'
import { StatusIcon } from './level'

const when = (iso: string) => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 16)} UTC`
}

/** Live solar flares and CMEs from NASA DONKI, shown inside the Radiation zone. */
export function SpaceWeather() {
  const donki = useDonki()
  const active = activeSolarEvent(donki)

  useEffect(() => {
    void useDonki.getState().load()
  }, [])

  const stamp = donki.fetchedAt ? when(new Date(donki.fetchedAt).toISOString()) : null
  const statusLine =
    donki.status === 'live'
      ? `From NASA DONKI, updated ${stamp}`
      : donki.status === 'loading'
        ? 'Contacting NASA DONKI…'
        : donki.status === 'cached'
          ? `No connection. Showing the last data saved on ${stamp}`
          : 'No connection and nothing saved yet. Dose limits still apply.'

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="heading text-[1.1rem]">Space weather, last 7 days</h2>
        <a href={source('donki').url} target="_blank" rel="noreferrer" className="rounded-full border border-link px-3 py-1 text-[0.82rem] font-semibold text-link" style={{ fontStretch: '88%' }}>
          Source: NASA DONKI
        </a>
      </div>
      <p className="label">{statusLine}</p>

      {active && (
        <p className="flex items-center gap-2.5 rounded-[12px] border border-caution bg-caution-deep/50 px-3 py-2.5 text-[1.05rem] font-semibold">
          <StatusIcon level="caution" size={24} />
          Solar event detected — go to storm shelter. {active.kind}, {active.detail}.
        </p>
      )}

      <ul className="scroll-quiet flex min-h-0 flex-1 flex-col gap-1.5 overflow-auto">
        {donki.events.slice(0, 6).map((event) => (
          <li key={event.id} className="flex items-center justify-between gap-3 rounded-[12px] bg-panel px-3 py-2 text-[0.93rem]">
            <span>
              <span className="font-semibold">{event.kind}</span>
              <span className="text-dim">, {event.detail}</span>
            </span>
            <span className="num shrink-0 text-dim">{when(event.time)}</span>
          </li>
        ))}
        {donki.events.length === 0 && donki.status !== 'loading' && <li className="label">No flares or CMEs listed for the last 7 days.</li>}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <button className="tap min-h-[52px] text-[0.92rem]" aria-pressed={donki.simulated} onClick={() => donki.setSimulated(!donki.simulated)}>
          {donki.simulated ? 'End simulated event' : 'Simulate a solar event'}
        </button>
        <p className="max-w-[52ch] text-[0.78rem] leading-snug text-faint">
          Shelter rule (team-defined reference value): an X-class flare or a CME of 2000 km/s or faster in the last 24 hours.
        </p>
      </div>
    </div>
  )
}
