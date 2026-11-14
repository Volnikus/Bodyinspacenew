import type { ReactNode } from 'react'
import { go, useRoute } from '../state/route'
import { CrewIcon, EarthIcon, LabIcon, MeasureIcon, MissionsIcon, TestsIcon } from './icons'

interface NavItem {
  route: string
  label: string
  icon: ReactNode
  /** Other first path segments that keep this item highlighted. */
  also?: string[]
}

const ITEMS: NavItem[] = [
  { route: '', label: 'Crew', icon: <CrewIcon />, also: ['organ'] },
  { route: 'measure', label: 'Measure', icon: <MeasureIcon /> },
  { route: 'tests', label: 'Self-tests', icon: <TestsIcon /> },
  { route: 'missions', label: 'Missions', icon: <MissionsIcon /> },
  { route: 'lab', label: 'NASA data', icon: <LabIcon /> },
  { route: 'earth', label: 'Earth view', icon: <EarthIcon /> },
]

export function NavRail() {
  const [first = ''] = useRoute()
  return (
    <nav className="flex w-[88px] shrink-0 flex-col items-center gap-2 border-r border-line-soft bg-hull py-3" aria-label="Sections">
      {ITEMS.map((item) => {
        const active = first === item.route || (item.also?.includes(first) ?? false)
        return (
          <button
            key={item.route}
            onClick={() => go(item.route)}
            aria-current={active ? 'page' : undefined}
            className={`nav-item flex h-[68px] w-[72px] flex-col items-center justify-center gap-1 rounded-[12px] text-[0.8rem] font-semibold ${
              active ? 'bg-raised text-star [&>svg]:text-link' : 'text-dim hover:bg-panel hover:text-star'
            }`}
            style={{ fontStretch: '84%' }}
          >
            {item.icon}
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
