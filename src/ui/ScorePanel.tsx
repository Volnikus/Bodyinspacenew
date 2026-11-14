import { useMemo } from 'react'
import type { CrewMember } from '../data/crew'
import type { Assessment } from '../engine/assess'
import type { Finding, Reading } from '../engine/types'
import { go } from '../state/route'
import { news2Trend, useOpenTasks } from '../state/selectors'
import { useApp } from '../state/store'
import { DAY, HOUR, clockText, durationText } from '../state/time'
import { LineChart } from './charts/LineChart'
import { PlusIcon } from './icons'
import { LEVEL_UI, StatusIcon, StatusPill } from './level'

const RANK = { ok: 0, caution: 1, alert: 2 }

/** Gauge geometry: a 270° arc. Scores of 12 and above fill it completely. */
const RING_R = 52
const RING_C = 2 * Math.PI * RING_R
const RING_ARC = RING_C * 0.75
const RING_MAX = 12
/** NEWS2 bands on the arc: 0–4 low, 5–6 medium, 7 and above high. */
const RING_BANDS = [
  { from: 0, to: 4.5, color: 'var(--color-ok)' },
  { from: 4.5, to: 6.5, color: 'var(--color-caution)' },
  { from: 6.5, to: RING_MAX, color: 'var(--color-alert)' },
]

/** The score inside a gauge, so "how far from trouble" is read at a glance, not only as a number. */
function ScoreRing({ score, color }: { score: number; color: string }) {
  const part = Math.min(score, RING_MAX) / RING_MAX
  const angle = ((135 + part * 270) * Math.PI) / 180
  return (
    <div className="relative h-[108px] w-[108px] shrink-0">
      <svg viewBox="0 0 132 132" className="h-full w-full" aria-hidden="true">
        <g transform="rotate(135 66 66)" fill="none" strokeWidth="9">
          {RING_BANDS.map((band) => (
            <circle
              key={band.from}
              cx="66"
              cy="66"
              r={RING_R}
              stroke={band.color}
              opacity="0.26"
              strokeDasharray={`${((band.to - band.from) / RING_MAX) * RING_ARC - 4} ${RING_C}`}
              strokeDashoffset={-(band.from / RING_MAX) * RING_ARC}
            />
          ))}
          <circle className="ring-value" cx="66" cy="66" r={RING_R} stroke={color} strokeLinecap="round" strokeDasharray={`${part * RING_ARC} ${RING_C}`} style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
        </g>
        <circle className="ring-dot" cx={66 + RING_R * Math.cos(angle)} cy={66 + RING_R * Math.sin(angle)} r="7" fill="var(--color-void)" stroke={color} strokeWidth="3" />
      </svg>
      <div key={score} className="num score-pop absolute inset-0 flex items-center justify-center text-[3rem]" style={{ color, textShadow: `0 0 24px color-mix(in srgb, ${color} 55%, transparent)` }}>
        {score}
      </div>
    </div>
  )
}

export function ScorePanel({ member, assessment, readings }: { member: CrewMember; assessment: Assessment; readings: Reading[] }) {
  const now = useApp((s) => s.now)
  const tasks = useOpenTasks(member.id)
  const trend = useMemo(() => news2Trend(readings, assessment.t), [readings, assessment.t])
  const ui = LEVEL_UI[assessment.level]

  const findings: Finding[] = useMemo(() => {
    const all = Object.values(assessment.organs).flatMap((o) => o.findings)
    return all.sort((a, b) => RANK[b.level] - RANK[a.level]).slice(0, 3)
  }, [assessment])

  const drift = assessment.baseline.length
  const scoreNote =
    drift > 0 && assessment.news2.level === 'ok'
      ? `NEWS2 says low risk, but ${drift === 1 ? 'one vital sign has' : `${drift} vital signs have`} drifted from this crew member’s own normal.`
      : assessment.news2.response

  return (
    <section className="panel view-enter scroll-quiet flex min-h-0 flex-col gap-3 overflow-y-auto p-3.5" aria-label={`Status of ${member.name}`}>
      <div className="pb-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="heading truncate text-[1.3rem]">{member.name}</h2>
            <p className="label">{member.role}</p>
          </div>
          <StatusPill level={assessment.overall} />
        </div>

        <div className="mt-2 flex items-center gap-3.5">
          <ScoreRing score={assessment.news2.total} color={ui.color} />
          <div>
            <div className="heading text-[1.25rem]">Space-NEWS2</div>
            <div className={`flex items-center gap-1.5 font-semibold ${ui.text}`} style={{ fontStretch: '88%' }}>
              <StatusIcon level={assessment.level} size={18} />
              {assessment.level === 'caution' && assessment.news2.level === 'ok' ? 'Drift from baseline' : assessment.news2.label}
            </div>
          </div>
        </div>
        <p className="mt-1 text-[0.95rem] text-dim">{scoreNote}</p>
        {(assessment.news2.level === 'alert' || assessment.news2.singleRed) && (
          <button className="tap tap-alert mt-3 w-full text-[1.1rem]" onClick={() => go('sos')}>
            Open SOS guide for {member.name.split(' ')[0]}
          </button>
        )}

        {findings.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1.5">
            {findings.map((finding) => (
              <li key={`${finding.metric}-${finding.kind}`}>
                <button
                  onClick={() => go(`organ/${finding.organ}`)}
                  className="lift flex min-h-[48px] w-full items-center gap-2.5 rounded-[12px] border border-line-soft bg-panel px-3 py-2 text-left text-[0.93rem] hover:bg-raised"
                >
                  <StatusIcon level={finding.level} size={20} />
                  <span>{finding.text}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="shrink-0 border-t border-line pt-3">
        <div className="flex items-baseline justify-between">
          <h3 className="label">NEWS2 score, last 24 h</h3>
          <span className="label text-[0.72rem] text-faint">Simulated</span>
        </div>
        <LineChart
          points={trend}
          from={assessment.t - DAY}
          to={assessment.t}
          min={0}
          max={Math.max(7, ...trend.map((p) => p.value))}
          height={72}
          step
          color={ui.color}
          yTicks={[0, 5]}
          xLabels={[
            { t: assessment.t - 18 * HOUR, text: '18 h ago' },
            { t: assessment.t - 9 * HOUR, text: '9 h ago' },
            { t: assessment.t - 0.6 * HOUR, text: 'now' },
          ]}
          ariaLabel={`NEWS2 score over the last 24 hours, now ${assessment.news2.total}`}
        />
      </div>

      <div className="flex min-h-[108px] flex-1 flex-col border-t border-line pt-3">
        <h3 className="label">Next for {member.name.split(' ')[0]}</h3>
        <ul className="scroll-quiet mt-2 flex min-h-0 flex-1 flex-col gap-1.5 overflow-auto">
          {tasks.slice(0, 3).map(({ def, dueAt, inMs }) => (
            <li key={def.id} className="flex items-center justify-between gap-3 rounded-[12px] bg-panel px-3 py-2">
              <span className="text-[0.97rem]">{def.title}</span>
              <span className={`num shrink-0 text-[0.95rem] ${inMs < 0 ? 'text-caution' : 'text-dim'}`}>
                {inMs < 0 ? `late ${durationText(-inMs)}` : inMs < 12 * HOUR ? `in ${durationText(inMs)}` : clockText(dueAt)}
              </span>
            </li>
          ))}
          {tasks.length === 0 && <li className="label">Everything for today is done.</li>}
        </ul>
        <button className="tap tap-primary mr-[74px] mt-3 whitespace-nowrap px-3 text-[1.05rem]" onClick={() => go('measure')}>
          <PlusIcon size={22} />
          Log a measurement
        </button>
        <span className="sr-only">Mission time {clockText(now)}</span>
      </div>
    </section>
  )
}
