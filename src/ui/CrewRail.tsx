import { CREW } from '../data/crew'
import type { Assessment } from '../engine/assess'
import { useApp } from '../state/store'
import { LEVEL_UI, StatusIcon } from './level'

export function CrewRail({ assessments }: { assessments: Record<string, Assessment> }) {
  const selected = useApp((s) => s.selectedCrewId)
  const selectCrew = useApp((s) => s.selectCrew)

  return (
    <section className="stagger flex min-h-0 flex-col gap-2.5" aria-label="Crew">
      <h2 className="label px-2">Crew of four</h2>
      {CREW.map((member) => {
        const a = assessments[member.id]
        const ui = LEVEL_UI[a.overall]
        const active = member.id === selected
        return (
          <button
            key={member.id}
            onClick={() => selectCrew(member.id)}
            aria-pressed={active}
            className={`panel lift flex min-h-[92px] items-center gap-3 px-3 py-3 text-left ${active ? 'selected' : ''}`}
          >
            <span
              className="num flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full border-2 text-[1.15rem]"
              style={{ borderColor: ui.color, background: ui.deep, boxShadow: `0 0 18px -4px ${ui.color}` }}
              aria-hidden="true"
            >
              {member.initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="heading block text-[1.05rem] leading-tight">{member.name}</span>
              <span className="label block truncate">{member.role}</span>
              <span className="mt-1 flex items-center justify-between gap-2">
                <span className={`flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold ${ui.text}`} style={{ fontStretch: '86%' }}>
                  <StatusIcon level={a.overall} size={17} />
                  {ui.word}
                </span>
                <span className="label flex items-baseline gap-1.5 text-[0.72rem]">
                  NEWS2
                  <span className="num text-[1.25rem]" style={{ color: LEVEL_UI[a.level].color }}>
                    {a.news2.total}
                  </span>
                </span>
              </span>
            </span>
          </button>
        )
      })}
    </section>
  )
}
