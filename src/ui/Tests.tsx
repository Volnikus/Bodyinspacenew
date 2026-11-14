import { useEffect, useRef, useState, type ReactNode } from 'react'
import { crewById } from '../data/crew'
import { source } from '../data/sources'
import { PHQ9 } from '../data/thresholds'
import { rollingBaseline } from '../engine/baseline'
import { series } from '../engine/readings'
import { go } from '../state/route'
import { useReadings } from '../state/selectors'
import { useApp } from '../state/store'
import { BackIcon } from './icons'
import { StatusIcon } from './level'

/**
 * Measurements the tablet takes by itself: no extra sensors needed.
 * All four are screening checks for training, not clinical tests.
 */

function Shell({ title, note, children, onBack }: { title: string; note: string; children: ReactNode; onBack: () => void }) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      <header className="flex items-center gap-3">
        <button className="tap px-3" onClick={onBack} aria-label="Back">
          <BackIcon />
          Back
        </button>
        <div>
          <h1 className="heading text-[1.7rem]">{title}</h1>
          <p className="label">{note}</p>
        </div>
      </header>
      <div className="panel flex min-h-0 flex-1 flex-col p-5">{children}</div>
    </div>
  )
}

const TESTS = [
  { id: 'reaction', title: 'Reaction test', time: '1 min', text: 'Tap when the screen lights up. Slower than your own normal is an early sign of fatigue.', zone: 'Brain & mind' },
  { id: 'amsler', title: 'Vision grid', time: '1 min', text: 'Mark any lines that look wavy or missing. Screens for eye changes in microgravity (SANS).', zone: 'Eyes' },
  { id: 'breath', title: 'Breath counter', time: '30 s', text: 'Tap once for every breath. The tablet works out breaths per minute.', zone: 'Lungs' },
  { id: 'mood', title: 'Mood check', time: '2 min', text: 'Nine questions (PHQ-9). Private: not shown to the rest of the crew.', zone: 'Brain & mind' },
] as const

export function Tests({ test }: { test?: string }) {
  if (test === 'reaction') return <ReactionTest />
  if (test === 'amsler') return <AmslerTest />
  if (test === 'breath') return <BreathTest />
  if (test === 'mood') return <MoodTest />
  return <TestMenu />
}

function TestMenu() {
  const member = crewById(useApp((s) => s.selectedCrewId))
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      <header>
        <h1 className="heading text-[1.7rem]">Self-tests on this tablet</h1>
        <p className="label">{member.name}. No extra sensors needed. Screening checks for training, not clinical tests.</p>
      </header>
      <ul className="stagger flex min-h-0 flex-1 flex-col gap-3 pr-[88px]">
        {TESTS.map((t) => (
          <li key={t.id} className="flex min-h-0 flex-1">
            <button onClick={() => go(`tests/${t.id}`)} className="panel lift grid w-full grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)_auto] items-center gap-6 px-6 text-left">
              <span className="heading text-[2.2rem]">{t.title}</span>
              <span>
                <span className="block max-w-[52ch] text-[1.08rem]">{t.text}</span>
                <span className="label mt-1 block">
                  {t.zone}, {t.time}
                </span>
              </span>
              <span className="tap tap-primary pointer-events-none min-w-[110px]">Start</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

const TRIALS = 5

function ReactionTest() {
  const crewId = useApp((s) => s.selectedCrewId)
  const readings = useReadings(crewId)
  const [phase, setPhase] = useState<'intro' | 'wait' | 'go' | 'early' | 'done'>('intro')
  const [times, setTimes] = useState<number[]>([])
  const shownAt = useRef(0)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const arm = () => {
    setPhase('wait')
    timer.current = window.setTimeout(
      () => {
        shownAt.current = performance.now()
        setPhase('go')
      },
      1500 + Math.random() * 2500,
    )
  }

  const tap = () => {
    if (phase === 'wait') {
      window.clearTimeout(timer.current)
      setPhase('early')
    } else if (phase === 'go') {
      const next = [...times, performance.now() - shownAt.current]
      setTimes(next)
      if (next.length >= TRIALS) setPhase('done')
      else arm()
    } else if (phase === 'early') {
      arm()
    }
  }

  const mean = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0
  const base = rollingBaseline(series(readings, 'reactionMs'), Infinity)
  const pct = base ? Math.round(((mean - base.mean) / base.mean) * 100) : null

  const save = () => {
    const app = useApp.getState()
    app.logReading(crewId, { reactionMs: mean }, 'tablet')
    app.completeTask(crewId, 'reaction')
    go('organ/brain')
  }

  return (
    <Shell title="Reaction test" note={`A short version of the vigilance test used on station. ${source('cognition').label}.`} onBack={() => go('tests')}>
      {phase === 'intro' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
          <p className="max-w-[50ch] text-[1.3rem]">The panel will turn green {TRIALS} times. Tap it as fast as you can each time. Do not tap before it turns green.</p>
          <button className="tap tap-primary h-[84px] px-12 text-[1.5rem]" onClick={arm}>
            Start
          </button>
        </div>
      )}
      {(phase === 'wait' || phase === 'go' || phase === 'early') && (
        <button
          onPointerDown={tap}
          className={`flex flex-1 flex-col items-center justify-center rounded-[16px] border-2 text-center transition-none ${
            phase === 'go' ? 'border-ok bg-ok text-[#04130c]' : phase === 'early' ? 'border-caution bg-caution-deep' : 'border-line bg-void'
          }`}
        >
          <span className="heading text-[3.4rem]">{phase === 'go' ? 'Tap' : phase === 'early' ? 'Too early' : 'Wait'}</span>
          <span className="mt-2 text-[1.1rem] opacity-80">
            {phase === 'early' ? 'Tap to try this round again.' : `Round ${Math.min(times.length + 1, TRIALS)} of ${TRIALS}`}
          </span>
        </button>
      )}
      {phase === 'done' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="num text-[6rem] text-link">{mean}</div>
          <p className="text-[1.2rem]">milliseconds on average over {TRIALS} rounds</p>
          {pct !== null && (
            <p className={`flex items-center gap-2 text-[1.1rem] ${pct >= 20 ? 'text-caution' : 'text-dim'}`}>
              <StatusIcon level={pct >= 20 ? 'caution' : 'ok'} />
              {pct >= 0 ? `${pct}% slower` : `${-pct}% faster`} than your 7-day normal of {Math.round(base!.mean)} ms. Simulated history.
            </p>
          )}
          <div className="mt-2 flex gap-3">
            <button
              className="tap h-[68px] px-8"
              onClick={() => {
                setTimes([])
                arm()
              }}
            >
              Run again
            </button>
            <button className="tap tap-primary h-[68px] px-8 text-[1.15rem]" onClick={save}>
              Save result
            </button>
          </div>
        </div>
      )}
    </Shell>
  )
}

const GRID = 16

function AmslerTest() {
  const crewId = useApp((s) => s.selectedCrewId)
  const [marks, setMarks] = useState<Set<number>>(new Set())
  const [worse, setWorse] = useState(false)
  const [headache, setHeadache] = useState(false)

  const toggle = (i: number) =>
    setMarks((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  const save = () => {
    useApp.getState().logReading(crewId, { amslerDistortion: marks.size > 0, visionWorse: worse, headache }, 'tablet')
    go('organ/eyes')
  }

  const cell = 100 / GRID
  return (
    <Shell title="Vision grid" note={`Amsler grid self-check for SANS screening. ${source('sans').label}.`} onBack={() => go('tests')}>
      <div className="grid min-h-0 flex-1 grid-cols-[auto_minmax(0,1fr)] gap-6">
        <svg viewBox="0 0 100 100" className="aspect-square h-full max-h-full rounded-[12px] bg-[#f4f6fa]" role="img" aria-label="Amsler grid. Tap squares where lines look wavy, blurred or missing.">
          {Array.from({ length: GRID * GRID }, (_, i) => {
            const x = (i % GRID) * cell
            const y = Math.floor(i / GRID) * cell
            return <rect key={i} x={x} y={y} width={cell} height={cell} fill={marks.has(i) ? '#ff4d5e' : 'transparent'} fillOpacity="0.55" stroke="#10151f" strokeWidth="0.35" onPointerDown={() => toggle(i)} style={{ cursor: 'pointer' }} />
          })}
          <circle cx="50" cy="50" r="1.5" fill="#10151f" pointerEvents="none" />
        </svg>
        <div className="flex min-h-0 flex-col gap-3">
          <ol className="flex flex-col gap-2 text-[1.08rem] leading-snug">
            <li>1. Hold the tablet at arm’s length in normal cabin light.</li>
            <li>2. Cover one eye. Look only at the centre dot.</li>
            <li>3. Tap every square where lines look wavy, blurred or missing.</li>
            <li>4. Repeat with the other eye, then save.</li>
          </ol>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              { on: worse, set: setWorse, label: 'Vision feels worse than last week' },
              { on: headache, set: setHeadache, label: 'I have a headache' },
            ].map((option) => (
              <button
                key={option.label}
                aria-pressed={option.on}
                onClick={() => option.set(!option.on)}
                className={`min-h-[64px] rounded-[12px] border px-3 text-left font-semibold ${option.on ? 'border-caution bg-caution-deep text-star' : 'border-line bg-panel text-dim'}`}
                style={{ fontStretch: '88%' }}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="num mt-auto text-[1.4rem]">{marks.size === 0 ? 'No squares marked' : `${marks.size} ${marks.size === 1 ? 'square' : 'squares'} marked`}</p>
          <p className="text-[0.85rem] text-faint">Screening only. An eye scan (OCT or ultrasound) is read by specialists.</p>
          <div className="flex gap-3">
            <button className="tap h-[68px] flex-1" onClick={() => setMarks(new Set())}>
              Clear marks
            </button>
            <button className="tap tap-primary mr-[74px] h-[68px] flex-1 text-[1.15rem]" onClick={save}>
              {marks.size === 0 ? 'Save: no change' : 'Save marks'}
            </button>
          </div>
        </div>
      </div>
    </Shell>
  )
}

const BREATH_SECONDS = 30

function BreathTest() {
  const crewId = useApp((s) => s.selectedCrewId)
  const [left, setLeft] = useState<number | null>(null)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (left === null || left <= 0) return
    const timer = window.setTimeout(() => setLeft(left - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [left])

  const done = left === 0
  const rate = count * (60 / BREATH_SECONDS)
  const save = () => {
    useApp.getState().logReading(crewId, { rr: rate }, 'tablet')
    go('organ/lungs')
  }

  return (
    <Shell title="Breath counter" note="Count breaths without a sensor. For yourself or for a crewmate you are watching." onBack={() => go('tests')}>
      <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
        {left === null && (
          <>
            <p className="max-w-[48ch] text-[1.3rem]">Sit or float still. Tap the big button once for every breath in, for {BREATH_SECONDS} seconds.</p>
            <button
              className="tap tap-primary h-[84px] px-12 text-[1.5rem]"
              onClick={() => {
                setCount(0)
                setLeft(BREATH_SECONDS)
              }}
            >
              Start {BREATH_SECONDS} seconds
            </button>
          </>
        )}
        {left !== null && !done && (
          <>
            <p className="num text-[2.4rem] text-dim">{left} s left</p>
            <button onPointerDown={() => setCount((c) => c + 1)} className="flex h-[260px] w-[260px] flex-col items-center justify-center rounded-full border-4 border-star bg-raised active:scale-95">
              <span className="num text-[6rem]">{count}</span>
              <span className="heading text-[1.2rem]">tap each breath</span>
            </button>
          </>
        )}
        {done && (
          <>
            <div className="num text-[6rem] text-link">{rate}</div>
            <p className="text-[1.2rem]">
              breaths per minute ({count} in {BREATH_SECONDS} s, times 2). Normal is 12 to 20.
            </p>
            <div className="flex gap-3">
              <button className="tap h-[68px] px-8" onClick={() => setLeft(null)}>
                Count again
              </button>
              <button className="tap tap-primary h-[68px] px-8 text-[1.15rem]" onClick={save}>
                Save as breathing rate
              </button>
            </div>
          </>
        )}
      </div>
    </Shell>
  )
}

/** PHQ-9 items (Kroenke, Spitzer, Williams). Over the last 2 weeks, how often have you been bothered by: */
const PHQ_ITEMS = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself, or that you are a failure or have let yourself or your family down',
  'Trouble concentrating on things, such as reading or watching a video',
  'Moving or speaking so slowly that other people could have noticed, or being unusually fidgety or restless',
  'Thoughts that you would be better off dead, or of hurting yourself in some way',
]
const PHQ_OPTIONS = ['Not at all', 'Several days', 'More than half the days', 'Nearly every day']

function MoodTest() {
  const crewId = useApp((s) => s.selectedCrewId)
  const [answers, setAnswers] = useState<(number | null)[]>(() => PHQ_ITEMS.map(() => null))
  const [saved, setSaved] = useState(false)
  const complete = answers.every((a) => a !== null)
  const total = answers.reduce<number>((sum, a) => sum + (a ?? 0), 0)
  const item9 = answers[8] ?? 0

  const save = () => {
    useApp.getState().logReading(crewId, { phq9: total, phq9Item9: item9 }, 'tablet')
    setSaved(true)
  }

  if (saved) {
    const escalate = item9 > 0 || total >= PHQ9.moderateFrom
    return (
      <Shell title="Mood check" note="Private result." onBack={() => go('tests')}>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="num text-[6rem]" style={{ color: escalate ? 'var(--color-alert)' : total >= PHQ9.mildFrom ? 'var(--color-caution)' : 'var(--color-ok)' }}>
            {total}
          </div>
          <p className="text-[1.2rem]">of 27. 0 to 4 is the normal range, 5 to 9 is mild.</p>
          <p className="max-w-[52ch] text-[1.15rem]">
            {item9 > 0
              ? 'Please talk to the flight surgeon now, in private. You do not have to carry this alone. A private message has been prepared.'
              : total >= PHQ9.moderateFrom
                ? 'Ask for a private conference with the flight surgeon or psychologist.'
                : total >= PHQ9.mildFrom
                  ? 'Mild symptoms. Repeat next week and mention it at your private medical conference.'
                  : 'Nothing to do now. Repeat next week.'}
          </p>
          <p className="text-[0.85rem] text-faint">Your answers are not shown to the rest of the crew. {source('phq9').label}.</p>
          <button className="tap tap-primary h-[68px] px-8" onClick={() => go('organ/brain')}>
            Done
          </button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell title="Mood check" note="Private. Over the last 2 weeks, how often have you been bothered by the following?" onBack={() => go('tests')}>
      <ol className="scroll-quiet flex min-h-0 flex-1 flex-col gap-2 overflow-auto pr-1">
        {PHQ_ITEMS.map((item, i) => (
          <li key={item} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] items-center gap-3 rounded-[12px] bg-panel px-3 py-2">
            <span className="text-[0.98rem] leading-snug">
              {i + 1}. {item}
            </span>
            <span className="grid grid-cols-4 gap-1.5" role="group" aria-label={item}>
              {PHQ_OPTIONS.map((label, value) => (
                <button
                  key={label}
                  aria-pressed={answers[i] === value}
                  onClick={() => setAnswers((prev) => prev.map((a, j) => (j === i ? value : a)))}
                  className={`min-h-[56px] rounded-[12px] border px-1 text-[0.82rem] font-semibold leading-tight ${answers[i] === value ? 'border-star bg-raised text-star' : 'border-line bg-raised text-dim'}`}
                  style={{ fontStretch: '82%' }}
                >
                  {label}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="label">{complete ? 'All nine answered.' : `${answers.filter((a) => a !== null).length} of 9 answered`}</span>
        <button className="tap tap-primary mr-[74px] h-[64px] px-8 text-[1.1rem] disabled:opacity-40" disabled={!complete} onClick={save}>
          See my result
        </button>
      </div>
    </Shell>
  )
}
