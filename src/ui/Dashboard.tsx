import { useMemo } from 'react'
import { crewById } from '../data/crew'
import { EXERCISE, RADIATION } from '../data/thresholds'
import type { Assessment } from '../engine/assess'
import { go } from '../state/route'
import { useAllAssessments, useEnvStatus, useReadings, type EnvStatus } from '../state/selectors'
import { useApp } from '../state/store'
import type { Level, ZoneId } from '../engine/types'
import { BodyMap, type ZoneView } from './BodyMap'
import { CrewRail } from './CrewRail'
import { linkText } from './EarthLink'
import { LEVEL_UI } from './level'
import { ScorePanel } from './ScorePanel'

/** A few words per zone for the call-outs around the body. */
export function zoneViews(a: Assessment, envStatus: EnvStatus, exerciseToday: number): Record<ZoneId, ZoneView> {
  const m = a.metrics
  const fixed = (value: number | undefined, decimals = 0) => (value === undefined ? '–' : value.toFixed(decimals))
  return {
    brain: {
      level: a.organs.brain.level,
      value: m.consciousness && m.consciousness !== 'A' ? 'Not fully alert' : `Slept ${fixed(m.sleepH, 1)} h`,
    },
    eyes: { level: a.organs.eyes.level, value: a.organs.eyes.level === 'ok' ? 'No change' : 'Change noted' },
    heart: { level: a.organs.heart.level, value: `${fixed(m.hr)} bpm, ${fixed(m.sbp)}/${fixed(m.dbp)}` },
    lungs: { level: a.organs.lungs.level, value: `${fixed(m.rr)}/min, SpO2 ${fixed(m.spo2)}%` },
    blood: { level: a.organs.blood.level, value: `Glucose ${fixed(m.glucose)} mg/dL` },
    bones: { level: a.organs.bones.level, value: `${exerciseToday} of ${EXERCISE.planMin} min` },
    skin: { level: a.organs.skin.level, value: `${fixed(m.temp, 1)} °C` },
    air: { level: envStatus.air.level, value: `CO2 ${envStatus.env.co2HourMean.toFixed(1)} mmHg` },
    radiation: {
      level: envStatus.radiation.level,
      value: `${Math.round(envStatus.careerMsv)} of ${RADIATION.careerLimit} mSv`,
    },
  }
}

/** One heartbeat of the trace, 120 units wide; repeated and scrolled at the simulated heart rate. */
const BEAT_PATH = 'h34l5-4 5 4h10l4 5 6-22 6 30 5-13h12q6-9 12 0h21'
const BEATS = 20

/** A moving pulse line under the body map. Its speed follows the simulated heart rate; the shape is illustrative. */
function PulseTrace({ heartRate, level }: { heartRate: number; level: Level }) {
  const bpm = Math.max(30, Math.round(heartRate / 4) * 4)
  const color = LEVEL_UI[level].color
  return (
    <div className="flex h-[40px] shrink-0 items-center gap-3 px-2" aria-hidden="true">
      <span className="label shrink-0 whitespace-nowrap">Pulse, simulated</span>
      <div className="pulse-strip h-full min-w-0 flex-1 overflow-hidden">
        <svg className="pulse-run block h-full" width={BEATS * 120} viewBox={`0 0 ${BEATS * 120} 40`} preserveAspectRatio="none" style={{ animationDuration: `${60 / bpm}s` }}>
          <path d={`M0 22${BEAT_PATH.repeat(BEATS)}`} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
        </svg>
      </div>
      <span className="num shrink-0 text-[1.15rem]" style={{ color }}>
        {Math.round(heartRate)} <span className="label">bpm</span>
      </span>
    </div>
  )
}

export function Dashboard() {
  const selectedId = useApp((s) => s.selectedCrewId)
  const exerciseToday = useApp((s) => s.exerciseToday[selectedId] ?? 0)
  const member = crewById(selectedId)
  const assessments = useAllAssessments()
  const assessment = assessments[selectedId]
  const readings = useReadings(selectedId)
  const envStatus = useEnvStatus(selectedId)
  const zones = useMemo(() => zoneViews(assessment, envStatus, exerciseToday), [assessment, envStatus, exerciseToday])
  const link = linkText(envStatus.env)

  return (
    <div className="grid h-full min-h-0 grid-cols-[clamp(216px,17vw,270px)_minmax(0,1fr)_clamp(320px,26vw,390px)] gap-5 p-4">
      <CrewRail assessments={assessments} />

      <section className="relative flex min-h-0 flex-col gap-2" aria-label={`Body map of ${member.name}`}>
        <span className="label pointer-events-none absolute left-1/2 top-2 z-[1] flex -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-void/80 px-3 py-0.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
          </span>
          Simulated live feed
        </span>
        <div className="min-h-0 flex-1 px-2 pt-1">
          <BodyMap
            zones={zones}
            onOpen={(id) => go(`organ/${id}`)}
            heartRate={assessment.metrics.hr ?? 70}
            breathRate={assessment.metrics.rr ?? 15}
            scanKey={selectedId}
          />
        </div>
        <PulseTrace heartRate={assessment.metrics.hr ?? 70} level={assessment.organs.heart.level} />
        <dl className="stagger grid grid-cols-3 gap-2.5 text-[0.9rem]" style={{ fontStretch: '90%' }}>
          <div className="panel px-3.5 py-2">
            <dt className="label">If you call {envStatus.env.linkTarget ?? 'Earth'}</dt>
            <dd className="font-medium">{link.reply}</dd>
          </div>
          <div className="panel px-3.5 py-2">
            <dt className="label">Evacuation</dt>
            <dd className={`font-medium ${envStatus.env.evacPossible ? '' : 'text-caution'}`}>{envStatus.env.evacuation}</dd>
          </div>
          <div className="panel px-3.5 py-2">
            <dt className="label">Gravity and dose rate</dt>
            <dd className="font-medium">
              {envStatus.env.gravity}, {envStatus.env.doseRateMsvDay} mSv/day{envStatus.env.doseIsReference ? ' (reference value)' : ''}
            </dd>
          </div>
        </dl>
      </section>

      <ScorePanel member={member} assessment={assessment} readings={readings} />
    </div>
  )
}
