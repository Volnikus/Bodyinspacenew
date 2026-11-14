import { CREW } from '../data/crew'
import { DAILY_TASKS, taskKey } from '../data/tasks'
import { EXERCISE } from '../data/thresholds'
import { go } from '../state/route'
import { useApp } from '../state/store'
import { clockText, missionDay } from '../state/time'
import { StatusIcon } from './level'

/** Days in a row with every health task done before the demo day (simulated history). */
const STREAK_BEFORE_TODAY: Record<string, number> = { okafor: 12, seitkali: 9, ferreira: 5, lindqvist: 2 }

const BADGES: { label: string; test: (streak: number) => boolean }[] = [
  { label: '3-day run', test: (s) => s >= 3 },
  { label: 'Full week', test: (s) => s >= 7 },
  { label: 'Ten days steady', test: (s) => s >= 10 },
]

/** Daily health missions for the whole crew: who has done what today. */
export function Missions() {
  const now = useApp((s) => s.now)
  const done = useApp((s) => s.tasksDone)
  const exercise = useApp((s) => s.exerciseToday)
  const selectedId = useApp((s) => s.selectedCrewId)
  const selectCrew = useApp((s) => s.selectCrew)
  const day = missionDay(now)
  const timeOfDay = now - (day - 1) * 24 * 3600 * 1000

  const rows = CREW.map((member) => {
    const ticks = DAILY_TASKS.map((task) => Boolean(done[taskKey(member.id, day, task.id)]))
    const count = ticks.filter(Boolean).length
    const overdue = DAILY_TASKS.some((task, i) => !ticks[i] && task.at < timeOfDay)
    const streak = STREAK_BEFORE_TODAY[member.id] ?? 0
    return { member, ticks, count, overdue, streak: count === DAILY_TASKS.length ? streak + 1 : streak }
  })
  const total = rows.reduce((sum, r) => sum + r.count, 0)
  const share = Math.round((total / (CREW.length * DAILY_TASKS.length)) * 100)

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="heading text-[1.7rem]">Daily health missions</h1>
          <p className="label">
            Day {day}, {clockText(now)} ship time. Small routines keep each personal baseline accurate. Streaks before today are simulated.
          </p>
        </div>
        <div className="text-right">
          <div className="num text-[2.4rem] text-link">{share}%</div>
          <div className="label">of today’s crew tasks done</div>
        </div>
      </header>

      <div className="panel scroll-quiet min-h-0 flex-1 overflow-auto p-4">
        <table className="w-full border-separate border-spacing-y-2 text-left">
          <thead>
            <tr className="label">
              <th className="pb-1 font-medium">Crew member</th>
              {DAILY_TASKS.map((task) => (
                <th key={task.id} className="pb-1 text-center font-medium">
                  {task.title.replace(', 120 min', '')}
                  <span className="block text-[0.72rem] text-faint">{clockText(task.at)}</span>
                </th>
              ))}
              <th className="pb-1 font-medium">Exercise</th>
              <th className="pb-1 font-medium">Streak</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ member, ticks, count, overdue, streak }) => (
              <tr key={member.id} className={member.id === selectedId ? 'bg-panel' : ''}>
                <td className="rounded-l-2xl py-2 pl-3">
                  <button className="min-h-[56px] text-left" onClick={() => selectCrew(member.id)} aria-pressed={member.id === selectedId}>
                    <span className="heading block text-[1.08rem]">{member.name}</span>
                    <span className={`label ${overdue ? 'text-caution' : ''}`}>
                      {count} of {DAILY_TASKS.length} done{overdue ? ', one is late' : ''}
                    </span>
                  </button>
                </td>
                {DAILY_TASKS.map((task, i) => (
                  <td key={task.id} className="text-center">
                    {ticks[i] ? (
                      <span className="inline-flex" aria-label={`${task.title}: done`}>
                        <StatusIcon level="ok" size={28} />
                      </span>
                    ) : (
                      <button
                        className={`min-h-[48px] rounded-[12px] border px-3 text-[0.85rem] font-semibold ${task.at < timeOfDay ? 'border-caution text-caution' : 'border-line text-dim'}`}
                        style={{ fontStretch: '86%' }}
                        onClick={() => {
                          selectCrew(member.id)
                          go(task.route)
                        }}
                        aria-label={`${task.title} for ${member.name}: ${task.at < timeOfDay ? 'late' : 'open'}. Do it now.`}
                      >
                        {task.at < timeOfDay ? 'Late' : 'Open'}
                      </button>
                    )}
                  </td>
                ))}
                <td className="w-[150px] pr-3">
                  <div className="num text-[1rem]">
                    {exercise[member.id] ?? 0} <span className="label">of {EXERCISE.planMin} min</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-void">
                    <div className="h-full rounded-full bg-link" style={{ width: `${Math.min(100, ((exercise[member.id] ?? 0) / EXERCISE.planMin) * 100)}%` }} />
                  </div>
                </td>
                <td className="rounded-r-2xl pr-3">
                  <div className="num text-[1.5rem]">
                    {streak} <span className="label">days</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {BADGES.filter((badge) => badge.test(streak)).map((badge) => (
                      <span key={badge.label} className="rounded-full border border-link/60 px-2 py-0.5 text-[0.72rem] font-semibold text-link" style={{ fontStretch: '86%' }}>
                        {badge.label}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
