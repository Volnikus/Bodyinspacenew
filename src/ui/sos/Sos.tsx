import { useEffect, useMemo, useRef, useState } from 'react'
import { CREW, crewById } from '../../data/crew'
import { BRANCH_A, BRANCH_B, CPR, KIT_ITEMS, RECHECK_MINUTES, SOS_FOOTNOTE, STOP_CRITERIA, type SosStep } from '../../data/sos'
import { source } from '../../data/sources'
import type { Assessment } from '../../engine/assess'
import { go } from '../../state/route'
import { useAssessment, useEnvironment } from '../../state/selectors'
import { useSos } from '../../state/sos'
import { useApp } from '../../state/store'
import { MIN, SEC, clockText, countdownText, durationText, missionDay } from '../../state/time'
import { SoundIcon } from '../icons'
import { LEVEL_UI, StatusIcon } from '../level'
import { EarthLinkPanel } from './EarthLinkPanel'
import { Metronome } from './metronome'

function vitalsLine(a: Assessment): string {
  const m = a.metrics
  return `Pulse ${m.hr} bpm, blood pressure ${m.sbp}/${m.dbp} mmHg, breathing ${m.rr}/min, SpO2 ${m.spo2}%, temperature ${m.temp?.toFixed(1)} °C. NEWS2 ${a.news2.total} (${a.news2.label}).`
}

/** Live readings of the patient, always in view during an emergency. */
function LiveVitals({ crewId }: { crewId: string }) {
  const a = useAssessment(crewId)
  const noPulse = useSos((s) => s.noPulse)
  const m = a.metrics
  const ui = LEVEL_UI[a.news2.level]
  const cell = (label: string, value: string, score: number) => {
    const level = score >= 3 ? 'alert' : score >= 1 ? 'caution' : 'ok'
    return (
      <div className="rounded-[12px] bg-panel px-3 py-2">
        <div className="label text-[0.74rem]">{label}</div>
        <div className={`num text-[1.7rem] ${level === 'ok' ? '' : LEVEL_UI[level].text}`}>{value}</div>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-5 gap-2" aria-label="Patient vital signs, simulated wearable feed">
      {cell('Pulse, bpm', noPulse ? 'none' : String(m.hr), noPulse ? 3 : a.news2.parts.hr)}
      {cell('SpO2, %', noPulse ? '–' : String(m.spo2), noPulse ? 3 : a.news2.parts.spo2)}
      {cell('Breaths /min', noPulse ? 'none' : String(m.rr), noPulse ? 3 : a.news2.parts.rr)}
      {cell('Pressure', noPulse ? '–' : `${m.sbp}/${m.dbp}`, noPulse ? 3 : a.news2.parts.sbp)}
      {noPulse ? (
        <div className="rounded-[12px] bg-alert-deep px-3 py-2">
          <div className="label text-[0.74rem]">Confirmed by crew</div>
          <div className="num flex items-center gap-2 text-[1.7rem] text-alert">
            <StatusIcon level="alert" size={22} />
            Cardiac arrest
          </div>
        </div>
      ) : (
        <div className="rounded-[12px] px-3 py-2" style={{ background: ui.deep }}>
          <div className="label text-[0.74rem]">NEWS2, simulated feed</div>
          <div className={`num flex items-center gap-2 text-[1.7rem] ${ui.text}`}>
            <StatusIcon level={a.news2.level} size={22} />
            {a.news2.total}
          </div>
        </div>
      )}
    </div>
  )
}

function PulseCheck({ onNoPulse, onPulse }: { onNoPulse: () => void; onPulse: () => void }) {
  const [left, setLeft] = useState<number | null>(null)
  useEffect(() => {
    if (left === null || left <= 0) return
    const timer = window.setTimeout(() => setLeft(left - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [left])

  if (left === null) {
    return (
      <button className="tap tap-primary h-[84px] w-full text-[1.5rem]" onClick={() => setLeft(10)}>
        Start the 10-second check
      </button>
    )
  }
  return (
    <div className="flex items-center gap-4">
      <div className="num flex h-[112px] w-[112px] shrink-0 items-center justify-center rounded-full border-4 border-link text-[3.6rem]" aria-live="polite">
        {left}
      </div>
      <div className="grid flex-1 grid-cols-2 gap-3">
        <button className="tap tap-alert h-[112px] text-[1.35rem] leading-tight" onClick={onNoPulse}>
          No pulse, not breathing
        </button>
        <button className="tap h-[112px] text-[1.35rem] leading-tight" onClick={onPulse}>
          Pulse and breathing present
        </button>
      </div>
    </div>
  )
}

function Recheck({ onDone, onCollapse }: { onDone: () => void; onCollapse: () => void }) {
  const now = useApp((s) => s.now)
  const [from, setFrom] = useState(() => useApp.getState().now)
  const left = from + RECHECK_MINUTES * MIN - now
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <div className={`num text-[4rem] ${left <= 0 ? 'text-caution' : ''}`} aria-live="off">
          {countdownText(left)}
        </div>
        <p className="text-[1.05rem] text-dim">{left <= 0 ? 'Time to measure again.' : 'until the next set of vital signs'}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          className="tap tap-primary h-[76px] text-[1.25rem]"
          onClick={() => {
            setFrom(useApp.getState().now)
            onDone()
          }}
        >
          Vital signs measured again
        </button>
        <button className="tap tap-alert h-[76px] text-[1.25rem]" onClick={onCollapse}>
          They stopped responding
        </button>
      </div>
    </div>
  )
}

function CprPanel({ onPulseBack, onEnd }: { onPulseBack: () => void; onEnd: () => void }) {
  const sos = useSos()
  const now = useApp((s) => s.now)
  const [phase, setPhase] = useState<'idle' | 'compress' | 'breath' | 'aed'>('idle')
  const [count, setCount] = useState(0)
  const [setCycles, setSetCycles] = useState(0)
  const [muted, setMuted] = useState(false)
  const phaseRef = useRef(phase)
  const countRef = useRef(0)
  const setCyclesRef = useRef(0)
  const breathTimer = useRef<number | undefined>(undefined)
  const metronome = useRef<Metronome | null>(null)

  const enter = (next: typeof phase) => {
    phaseRef.current = next
    setPhase(next)
  }

  const beginCompressions = () => {
    countRef.current = 0
    setCount(0)
    enter('compress')
    metronome.current?.start()
  }

  const onBeat = () => {
    if (phaseRef.current !== 'compress') return
    countRef.current += 1
    setCount(countRef.current)
    useSos.getState().countCompression()
    if (countRef.current >= CPR.compressionsPerCycle) {
      metronome.current?.stop()
      metronome.current?.breathCue()
      enter('breath')
      breathTimer.current = window.setTimeout(() => {
        useSos.getState().countCycle()
        setCyclesRef.current += 1
        setSetCycles(setCyclesRef.current)
        if (setCyclesRef.current >= CPR.cyclesBeforeAed) {
          useSos.getState().addLog(`${CPR.cyclesBeforeAed} CPR cycles completed`)
          enter('aed')
        } else {
          beginCompressions()
        }
      }, CPR.breathPauseS * 1000)
    }
  }

  // The metronome keeps one stable callback; the handler above reads only refs and the store.
  const beatHandler = useRef(onBeat)
  beatHandler.current = onBeat
  useEffect(() => {
    metronome.current = new Metronome(CPR.bpm, () => beatHandler.current())
    return () => {
      window.clearTimeout(breathTimer.current)
      metronome.current?.dispose()
    }
  }, [])

  const start = () => {
    sos.startCpr()
    sos.addLog(`CPR started, metronome ${CPR.bpm} per minute`)
    beginCompressions()
  }
  const afterAed = () => {
    sos.addLog('AED attached, voice prompts followed, CPR resumed')
    setCyclesRef.current = 0
    setSetCycles(0)
    beginCompressions()
  }
  const toggleSound = () => {
    const next = !muted
    setMuted(next)
    if (metronome.current) metronome.current.muted = next
  }

  const cprElapsed = sos.cprStartedAt === null ? 0 : now - sos.cprStartedAt
  const durationMet = cprElapsed >= STOP_CRITERIA[0].minutes * MIN

  if (phase === 'idle') {
    return (
      <button className="tap tap-alert h-[110px] w-full text-[1.9rem]" onClick={start}>
        Start CPR with metronome
      </button>
    )
  }

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-5">
      <div className="relative flex h-[230px] w-[230px] items-center justify-center" aria-live="off">
        <div
          key={phase === 'compress' ? count : phase}
          className={`absolute inset-0 rounded-full ${phase === 'compress' ? 'cpr-beat bg-alert' : phase === 'breath' ? 'cpr-breath bg-link' : 'bg-caution'}`}
        />
        <div className="relative text-center text-[#14040a]">
          {phase === 'compress' && (
            <>
              <div className="num text-[6rem]">{count}</div>
              <div className="heading text-[1.15rem]">of {CPR.compressionsPerCycle}: push</div>
            </>
          )}
          {phase === 'breath' && <div className="heading text-[2.2rem] leading-tight">Give 2 breaths</div>}
          {phase === 'aed' && <div className="heading text-[2rem] leading-tight">Attach AED</div>}
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5" aria-label={`Cycle ${Math.min(setCycles + 1, CPR.cyclesBeforeAed)} of ${CPR.cyclesBeforeAed}`}>
            {Array.from({ length: CPR.cyclesBeforeAed }, (_, i) => (
              <span key={i} className={`h-3.5 w-9 rounded-full ${i < setCycles ? 'bg-alert' : i === setCycles && phase !== 'aed' ? 'bg-alert/45' : 'bg-raised'}`} />
            ))}
          </div>
          <span className="label">
            cycle {Math.min(setCycles + 1, CPR.cyclesBeforeAed)} of {CPR.cyclesBeforeAed}, then AED
          </span>
          <button className="tap ml-auto min-h-[52px] px-3" onClick={toggleSound} aria-pressed={!muted} aria-label={muted ? 'Turn metronome sound on' : 'Turn metronome sound off'}>
            <SoundIcon off={muted} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Stat label="Metronome" value={`${CPR.bpm} /min`} />
          <Stat label="Compressions" value={String(sos.compressions)} />
          <Stat label="CPR time" value={countdownText(cprElapsed)} />
        </div>

        {phase === 'aed' ? (
          <div className="rounded-[16px] border border-caution bg-caution-deep/50 p-3">
            <p className="text-[1.05rem] font-semibold">Attach the AED pads and follow its voice prompts. Swap rescuers if you can.</p>
            <button className="tap tap-primary mt-2 h-[68px] w-full text-[1.2rem]" onClick={afterAed}>
              AED done, continue CPR
            </button>
          </div>
        ) : (
          <div className="rounded-[16px] border border-line-soft bg-panel p-3 text-[0.9rem]">
            <p className="label">Stop only when all three are true</p>
            <ul className="mt-1 flex flex-col gap-0.5">
              {STOP_CRITERIA.map((criterion) => (
                <li key={criterion.id} className={`flex items-center gap-2 ${criterion.id === 'duration' && durationMet ? 'text-star' : 'text-dim'}`}>
                  <span className={`h-2 w-2 rounded-full ${criterion.id === 'duration' && durationMet ? 'bg-caution' : 'bg-line'}`} />
                  {criterion.text}
                  {criterion.id === 'duration' && <span className="num ml-auto">{countdownText(cprElapsed)} of 45:00</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button className="tap h-[64px] border-ok/60 text-[1.1rem] text-ok" onClick={onPulseBack}>
            Pulse is back
          </button>
          <button className="tap h-[64px] text-[1.1rem]" onClick={onEnd}>
            End CPR, write report
          </button>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-panel px-3 py-2">
      <div className="label text-[0.74rem]">{label}</div>
      <div className="num text-[1.6rem]">{value}</div>
    </div>
  )
}

function Report({ patientId }: { patientId: string }) {
  const sos = useSos()
  const env = useEnvironment()
  const assessment = useAssessment(patientId)
  const patient = crewById(patientId)
  const queueMessage = useApp((s) => s.queueMessage)
  const delayMs = env.linkOneWayS * SEC

  const body = useMemo(() => {
    const lines = [
      `Patient: ${patient.name}, ${patient.role}.`,
      `Location: ${env.name}. One-way link delay: ${env.linkOneWayS === 0 ? 'none' : durationText(delayMs)}.`,
      `Latest vital signs (simulated): ${vitalsLine(assessment)}`,
      sos.cycles > 0 ? `CPR: ${sos.cycles} cycles, ${sos.compressions} compressions.` : '',
      'Timeline:',
      ...sos.log.map((event) => `T+${countdownText(event.t - sos.startedAt)}  ${event.text}`),
    ]
    return lines.filter(Boolean).join('\n')
    // The report is a snapshot of the log; vitals refresh with the assessment.
  }, [patient, env, delayMs, assessment, sos.cycles, sos.compressions, sos.log, sos.startedAt])

  const send = () => {
    queueMessage({ kind: 'incident', title: `Incident report: ${patient.name}`, body, crewId: patientId, delayMs })
    sos.markReportSent()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div>
        <h1 className="heading text-[2.2rem]">Incident report</h1>
        <p className="text-dim">
          Written automatically from what you did. Day {missionDay(sos.startedAt)}, {clockText(sos.startedAt)} ship time.
        </p>
      </div>
      <pre className="scroll-quiet panel min-h-0 flex-1 overflow-auto whitespace-pre-wrap p-4 text-[0.98rem] leading-relaxed" style={{ fontFamily: 'inherit' }}>
        {body}
      </pre>
      <div className="grid grid-cols-2 gap-3">
        {sos.reportSent ? (
          <div className="flex items-center gap-3 rounded-[12px] border border-link bg-link-deep/40 px-4 text-[1.05rem]">
            <StatusIcon level="ok" size={24} />
            {env.linkOneWayS === 0 ? 'Report sent to Mission Control.' : `Report queued. It reaches Earth in ${durationText(delayMs)}.`}
          </div>
        ) : (
          <button className="tap tap-primary h-[72px] text-[1.25rem]" onClick={send}>
            Send report to Earth
          </button>
        )}
        <button
          className="tap h-[72px] text-[1.25rem]"
          onClick={() => {
            sos.close()
            go('')
          }}
        >
          Close SOS
        </button>
      </div>
    </div>
  )
}

export function Sos() {
  const sos = useSos()
  const env = useEnvironment()
  const now = useApp((s) => s.now)
  const selectedCrewId = useApp((s) => s.selectedCrewId)
  const patientId = sos.patientId || selectedCrewId
  const patient = crewById(patientId)
  const assessment = useAssessment(patientId)
  const logEnd = useRef<HTMLLIElement>(null)

  useEffect(() => {
    useSos.getState().open(useApp.getState().selectedCrewId)
  }, [])

  const steps: SosStep[] = sos.branch === 'A' ? BRANCH_A : sos.branch === 'B' ? BRANCH_B : []
  const step = steps[Math.min(sos.step, steps.length - 1)]

  useEffect(() => {
    sos.setStepTitle(sos.branch === 'ask' ? 'Is the crewmate responsive?' : sos.branch === 'report' ? 'Incident report' : (step?.title ?? ''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sos.branch, sos.step])

  useEffect(() => {
    logEnd.current?.scrollIntoView({ block: 'end' })
  }, [sos.log.length])

  const answer = (responsive: boolean) => {
    const app = useApp.getState()
    if (!responsive) app.logReading(patientId, { consciousness: 'U' }, 'manual')
    sos.addLog(responsive ? 'Crewmate responsive, chest pain' : 'Crewmate not responsive')
    const message = app.queueMessage({
      kind: 'question',
      title: `SOS: ${patient.name} ${responsive ? 'has chest pain' : 'is unresponsive'}`,
      body: vitalsLine(assessment),
      crewId: patientId,
      delayMs: env.linkOneWayS * SEC,
    })
    sos.setMessage(message.id)
    sos.addLog(env.linkOneWayS === 0 ? 'Mission Control called' : 'Message to flight surgeon queued')
    sos.goTo(responsive ? 'A' : 'B', 0)
  }

  const done = () => {
    if (!step) return
    sos.addLog(step.log)
    if (sos.step < steps.length - 1) sos.goTo(sos.branch, sos.step + 1)
  }

  const collapse = () => {
    useApp.getState().logReading(patientId, { consciousness: 'U' }, 'manual')
    sos.addLog('Patient stopped responding')
    sos.goTo('B', 1)
  }

  const pulseBack = () => {
    useApp.getState().logReading(patientId, { consciousness: 'V' }, 'manual')
    sos.setNoPulse(false)
    sos.addLog(`Pulse returned after ${sos.cycles} CPR cycles`)
    sos.goTo('A', BRANCH_A.length - 1)
  }

  const elapsed = sos.active ? now - sos.startedAt : 0

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0b0810]">
      <header className="flex h-[76px] shrink-0 items-center gap-5 bg-alert px-5 text-[#190308]">
        <span className="heading text-[2.2rem] font-bold tracking-wide">SOS</span>
        <div className="leading-tight">
          <div className="heading text-[1.25rem]">{patient.name}</div>
          <div className="text-[0.85rem] font-medium opacity-80">{patient.role}</div>
        </div>
        <div className="ml-auto text-right leading-tight">
          <div className="num text-[2rem]">{countdownText(elapsed)}</div>
          <div className="text-[0.8rem] font-semibold opacity-80">since SOS opened</div>
        </div>
        {sos.branch === 'ask' ? (
          <button
            className="min-h-[56px] rounded-[12px] border-2 border-[#190308]/40 px-4 font-semibold"
            onClick={() => {
              sos.close()
              go('')
            }}
          >
            Not an emergency
          </button>
        ) : (
          sos.branch !== 'report' && (
            <button
              className="min-h-[56px] rounded-[12px] border-2 border-[#190308]/40 px-4 font-semibold"
              onClick={() => {
                sos.addLog('Emergency guide ended by crew')
                sos.goTo('report')
              }}
            >
              End and write report
            </button>
          )
        )}
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_clamp(300px,27vw,400px)] gap-3 p-3">
        <main className="flex min-h-0 flex-col gap-3">
          {sos.branch === 'ask' && (
            <div className="flex min-h-0 flex-1 flex-col justify-center gap-6 px-4">
              <div>
                <h1 className="heading text-[3.6rem]">Is the crewmate responsive?</h1>
                <p className="mt-1 text-[1.3rem] text-dim">Speak loudly. Tap the shoulder.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="label mr-1">Who needs help</span>
                {CREW.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => sos.setPatient(member.id)}
                    aria-pressed={member.id === patientId}
                    className={`min-h-[56px] rounded-[12px] border px-4 font-semibold ${
                      member.id === patientId ? 'border-star bg-raised text-star' : 'border-line text-dim'
                    }`}
                    style={{ fontStretch: '86%' }}
                  >
                    {member.name}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button className="tap h-[170px] flex-col border-2 border-ok/70 bg-ok-deep/50 text-ok" onClick={() => answer(true)}>
                  <span className="heading text-[3.4rem]">Yes</span>
                  <span className="text-[1.1rem] text-star">Responds. Chest pain.</span>
                </button>
                <button className="tap tap-alert h-[170px] flex-col" onClick={() => answer(false)}>
                  <span className="heading text-[3.4rem]">No</span>
                  <span className="text-[1.1rem]">No response.</span>
                </button>
              </div>
            </div>
          )}

          {(sos.branch === 'A' || sos.branch === 'B') && step && (
            <>
              <LiveVitals crewId={patientId} />
              <section className="panel flex min-h-0 flex-1 flex-col gap-4 p-5" aria-live="polite">
                <div>
                  <p className="label text-[0.95rem]">
                    Step {sos.step + 1} of {steps.length}, {sos.branch === 'A' ? 'responsive with chest pain' : 'unresponsive'}
                  </p>
                  <h1 className="heading mt-1 text-[2.9rem]">{step.title}</h1>
                  <p className="mt-2 max-w-[62ch] text-[1.2rem] leading-snug text-dim">{step.detail}</p>
                </div>

                <div className="mt-auto flex flex-col gap-3">
                  {step.widget === 'pulse-check' && (
                    <PulseCheck
                      onNoPulse={() => {
                        sos.setNoPulse(true)
                        done()
                      }}
                      onPulse={() => {
                        sos.addLog('Pulse and breathing present, monitoring')
                        sos.goTo('A', 2)
                      }}
                    />
                  )}
                  {step.widget === 'kit' && (
                    <ul className="grid grid-cols-3 gap-2">
                      {KIT_ITEMS.map((item) => (
                        <li key={item.name} className="rounded-[12px] bg-panel px-3 py-2.5">
                          <div className="font-semibold">{item.name}</div>
                          <div className="text-[0.9rem] text-dim">{item.where}</div>
                        </li>
                      ))}
                      <li className="col-span-3 text-[0.82rem] text-faint">
                        Kit contents as listed in the public 2016 checklist. Shown to help you find them, not as a prescription.
                      </li>
                    </ul>
                  )}
                  {step.widget === 'recheck' && <Recheck onDone={() => sos.addLog(step.log)} onCollapse={collapse} />}
                  {step.widget === 'cpr' && <CprPanel onPulseBack={pulseBack} onEnd={() => sos.goTo('report')} />}

                  {step.widget !== 'pulse-check' && step.widget !== 'recheck' && step.widget !== 'cpr' && (
                    <button className="tap tap-primary h-[92px] w-full text-[2rem]" onClick={done}>
                      Done
                    </button>
                  )}
                  {step.widget === 'recheck' && (
                    <button className="tap h-[60px] w-full" onClick={() => sos.goTo('report')}>
                      Patient stable: write the report
                    </button>
                  )}
                </div>
              </section>
              <p className="px-1 text-[0.8rem] text-faint">
                {SOS_FOOTNOTE} This step: {source(step.sourceId).label}.
              </p>
            </>
          )}

          {sos.branch === 'report' && <Report patientId={patientId} />}
        </main>

        <aside className="flex min-h-0 flex-col gap-3">
          <EarthLinkPanel />
          <section className="panel flex min-h-0 flex-1 flex-col p-4" aria-label="What has been done">
            <h2 className="label">Done so far</h2>
            <ol className="scroll-quiet mt-2 flex min-h-0 flex-1 flex-col gap-1.5 overflow-auto">
              {sos.log.map((event, i) => (
                <li key={i} className="flex gap-3 text-[0.93rem] leading-snug">
                  <span className="num w-[52px] shrink-0 text-right text-dim">+{countdownText(event.t - sos.startedAt)}</span>
                  <span>{event.text}</span>
                </li>
              ))}
              <li ref={logEnd} />
            </ol>
          </section>
        </aside>
      </div>
    </div>
  )
}
