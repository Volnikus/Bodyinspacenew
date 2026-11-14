import { useCallback, useEffect, useRef, useState } from 'react'
import { ENVIRONMENTS } from '../data/environments'
import { SEC, durationText } from '../state/time'
import { Mark } from './icons'

/** What the judges are about to see, in four short facts. Each one is true of this build. */
const FACTS = [
  { title: '9 body zones', text: 'Tap the body: how to measure, why it matters, what to do' },
  { title: 'Space-NEWS2', text: 'Official NEWS2 plus each person’s own 7-day baseline' },
  { title: 'Real NASA data', text: 'OSDR OSD-569 and OSD-575 lab results, live DONKI space weather' },
  { title: 'Works offline', text: 'Guides the crew first, reports to Earth afterwards' },
]

/** Counts up to a whole number once, so the key figure lands instead of just appearing. */
function useCountUp(target: number, durationMs: number, delayMs: number): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target)
      return
    }
    let frame = 0
    const start = performance.now() + delayMs
    const step = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - start) / durationMs))
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, durationMs, delayMs])
  return value
}

/** Headline words arrive one after another. */
function Words({ text, from }: { text: string; from: number }) {
  return (
    <>
      {text.split(' ').map((word, i) => (
        <span key={i} className="intro-word" style={{ animationDelay: `${(from + i) * 70}ms` }}>
          {word}&nbsp;
        </span>
      ))}
    </>
  )
}

/** Opening screen: the one fact the whole product is built around. */
export function Intro({ onStart }: { onStart: () => void }) {
  const oneWay = durationText(ENVIRONMENTS.transit.linkOneWayS * SEC)
  const replyMin = Math.round((ENVIRONMENTS.transit.linkOneWayS * 2) / 60)
  const counted = useCountUp(replyMin, 1500, 700)
  const [leaving, setLeaving] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  const start = useCallback(() => {
    if (timer.current !== undefined) return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setLeaving(true)
    timer.current = window.setTimeout(onStart, still ? 0 : 520)
  }, [onStart])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        start()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [start])

  return (
    <div className={`relative z-[1] flex h-full flex-col overflow-hidden px-[6vw] py-[4.5vh] ${leaving ? 'intro-leave' : ''}`}>
      {/* The scene: Earth below, Mars ahead, the ship halfway, and a question crawling home. */}
      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMaxYMid slice"
        className="intro-scene pointer-events-none absolute inset-0 h-full w-full opacity-40 lg:opacity-100"
        role="img"
        aria-label={`A signal takes ${oneWay} from the spacecraft to Earth and the same time back.`}
      >
        <defs>
          <radialGradient id="earth-body" cx="0.36" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#7cc4ff" />
            <stop offset="0.45" stopColor="#2b62d9" />
            <stop offset="1" stopColor="#081a4a" />
          </radialGradient>
          <radialGradient id="earth-air" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0.72" stopColor="#7cc4ff" stopOpacity="0" />
            <stop offset="0.82" stopColor="#7cc4ff" stopOpacity="0.38" />
            <stop offset="1" stopColor="#7cc4ff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="mars-body" cx="0.36" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#ffb38a" />
            <stop offset="0.5" stopColor="#d9603a" />
            <stop offset="1" stopColor="#4a160c" />
          </radialGradient>
          <radialGradient id="mars-air" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0.6" stopColor="#ff8a5c" stopOpacity="0" />
            <stop offset="0.8" stopColor="#ff8a5c" stopOpacity="0.3" />
            <stop offset="1" stopColor="#ff8a5c" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="route" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#7cc4ff" />
            <stop offset="1" stopColor="#ff8a5c" />
          </linearGradient>
          <clipPath id="earth-clip">
            <circle cx="1010" cy="800" r="190" />
          </clipPath>
        </defs>

        {/* Mars */}
        <g className="planet-float" style={{ animationDelay: '-4s' }}>
          <circle cx="1440" cy="170" r="118" fill="url(#mars-air)" />
          <circle cx="1440" cy="170" r="78" fill="url(#mars-body)" />
          <path d="M1392 150c16-10 40-8 52 4s-2 24-22 24-44-18-30-28ZM1452 196c12-6 30-2 34 8s-14 16-28 12-18-14-6-20Z" fill="#4a160c" opacity="0.32" />
        </g>
        <text x="1440" y="300" textAnchor="middle" fontSize="24" fill="var(--color-dim)" style={{ fontStretch: '84%' }}>
          Mars
        </text>

        <g transform="translate(90 30)">
        {/* Earth */}
        <g className="planet-float">
          <circle cx="1010" cy="800" r="250" fill="url(#earth-air)" />
          <circle cx="1010" cy="800" r="190" fill="url(#earth-body)" />
          <g clipPath="url(#earth-clip)" fill="#3ddc97" opacity="0.28">
            <path d="M880 700c30-26 78-30 104-8 20 18 6 44-22 52-30 8-44 34-78 30-30-4-34-48-4-74Z" />
            <path d="M1040 660c34-10 80 4 96 30 12 22-12 36-38 34-28-2-36 24-62 16-26-8-28-70 4-80Z" />
            <path d="M960 800c26-6 52 10 50 34-2 26-34 40-56 28-22-12-20-56 6-62Z" />
          </g>
          <ellipse cx="950" cy="720" rx="90" ry="50" fill="#ffffff" opacity="0.07" />
        </g>
        <text x="1010" y="590" textAnchor="middle" fontSize="24" fill="var(--color-dim)" style={{ fontStretch: '84%' }}>
          Earth
        </text>

        {/* Flight path, drawn once */}
        <path className="draw" pathLength={1} d="M1058 618 Q1070 320 1372 214" fill="none" stroke="url(#route)" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" style={{ animationDuration: '2.2s', animationDelay: '500ms' }} />
        <path d="M1058 618 Q1070 320 1372 214" fill="none" stroke="var(--color-star)" strokeWidth="2" strokeDasharray="2 14" strokeLinecap="round" opacity="0.3" />

        {/* The question leaves the ship and the answer cannot be back before two signal trips. */}
        <circle r="9" fill="var(--color-link)">
          <animateMotion dur="7s" repeatCount="indefinite" calcMode="linear" keyPoints="0;1;0" keyTimes="0;0.5;1" path="M1146 366 Q1064 469 1058 618" />
        </circle>
        <circle r="20" fill="var(--color-link)" opacity="0.18">
          <animateMotion dur="7s" repeatCount="indefinite" calcMode="linear" keyPoints="0;1;0" keyTimes="0;0.5;1" path="M1146 366 Q1064 469 1058 618" />
        </circle>

        {/* Spacecraft, halfway */}
        <g>
          <circle className="ship-ping" cx="1146" cy="366" r="16" fill="none" stroke="var(--color-star)" strokeWidth="2" />
          <circle cx="1146" cy="366" r="26" fill="var(--color-void)" stroke="var(--color-line)" strokeWidth="1.5" />
          <path d="M1146 348l12 30-12-7-12 7Z" fill="var(--color-star)" transform="rotate(38 1146 366)" />
        </g>
        <text x="1190" y="360" fontSize="24" fill="var(--color-star)" style={{ fontStretch: '84%', fontWeight: 600 }}>
          Spacecraft, day 90
        </text>
        <text x="1190" y="390" fontSize="22" fill="var(--color-link)" style={{ fontStretch: '84%', fontWeight: 600 }}>
          {oneWay} each way
        </text>
        </g>
      </svg>

      <header className="intro-fade relative flex items-center gap-3">
        <Mark size={44} />
        <span className="heading text-[1.6rem]">Body in Space</span>
        <span className="label ml-2 hidden rounded-full border border-line px-3 py-1 sm:inline">NASA Space Apps Challenge 2026</span>
      </header>

      <main className="relative flex flex-1 flex-col justify-center gap-[3.5vh]">
        <div className="max-w-[min(760px,58vw)] max-lg:max-w-none">
          <p className="intro-fade label mb-[1.5vh] text-[1rem] uppercase tracking-[0.18em] text-link" style={{ animationDelay: '100ms' }}>
            Your onboard doctor when Earth can’t answer
          </p>
          <h1 className="heading text-[clamp(2.5rem,5.6vw,5.4rem)]">
            <Words text="Halfway to Mars." from={2} />
            <br />
            <Words text="Earth’s answer is" from={5} />
            <span className="intro-word num text-link" style={{ animationDelay: '560ms', minWidth: '1.15em', lineHeight: 'inherit' }}>
              {counted}
            </span>{' '}
            <Words text="minutes away." from={9} />
          </h1>
          <p className="intro-fade mt-[2.2vh] max-w-[46ch] text-[clamp(1.05rem,1.55vw,1.4rem)] text-dim" style={{ animationDelay: '1100ms' }}>
            If a crewmate collapses now, the crew is on its own. This tablet is the onboard doctor for that gap: it shows what to measure, what it means and what to do.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <button className="tap tap-primary intro-cta h-[76px] px-10 text-[1.35rem]" style={{ animationDelay: '1400ms' }} onClick={start} autoFocus>
            Open the crew dashboard
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
          <span className="intro-fade label" style={{ animationDelay: '1700ms' }}>
            or press Enter
          </span>
        </div>

        <ul className="grid max-w-[min(900px,60vw)] grid-cols-2 gap-3 max-lg:max-w-none xl:grid-cols-4">
          {FACTS.map((fact, i) => (
            <li key={fact.title} className="panel intro-fade px-4 py-3" style={{ animationDelay: `${1700 + i * 110}ms` }}>
              <div className="heading text-[1.2rem] text-star">{fact.title}</div>
              <div className="mt-0.5 text-[0.86rem] leading-snug text-dim">{fact.text}</div>
            </li>
          ))}
        </ul>
      </main>

      <footer className="relative flex flex-wrap justify-between gap-x-8 gap-y-1 text-[0.85rem] text-dim" style={{ fontStretch: '88%' }}>
        <span className="font-semibold text-star">Educational prototype. Not a medical device.</span>
        <span>Vital signs are simulated. Data: NASA HRP, NASA-STD-3001, NASA OSDR OSD-569 and OSD-575, NASA DONKI.</span>
      </footer>
    </div>
  )
}
