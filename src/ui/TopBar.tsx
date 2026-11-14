import { ENVIRONMENTS, ENV_ORDER } from '../data/environments'
import { go } from '../state/route'
import { useEnvironment } from '../state/selectors'
import { useApp } from '../state/store'
import { clockText, missionDay } from '../state/time'
import { EarthLink } from './EarthLink'
import { Mark } from './icons'

export function TopBar() {
  const env = useEnvironment()
  const setEnv = useApp((s) => s.setEnv)
  const now = useApp((s) => s.now)
  const timeScale = useApp((s) => s.timeScale)

  return (
    <header className="flex h-[76px] shrink-0 items-center gap-5 border-b border-line-soft bg-hull px-4">
      <button className="flex items-center gap-2.5 rounded-[12px] pr-2" onClick={() => go('')} aria-label="Body in Space, crew dashboard">
        <Mark />
        <span className="heading hidden text-[1.35rem] xl:block">Body in Space</span>
      </button>

      <div className="flex rounded-[14px] border border-line-soft bg-void/70 p-1" role="group" aria-label="Mission environment">
        {ENV_ORDER.map((id) => {
          const active = id === env.id
          return (
            <button
              key={id}
              onClick={() => setEnv(id)}
              aria-pressed={active}
              className={`min-h-[52px] rounded-[10px] px-3 text-[0.95rem] font-semibold transition-all duration-200 ${
                active ? 'bg-star text-[#0a1024] shadow-[0_6px_22px_-8px_rgb(124_196_255/0.8)]' : 'text-dim hover:bg-panel hover:text-star'
              }`}
              style={{ fontStretch: '86%' }}
            >
              {ENVIRONMENTS[id].short}
            </button>
          )
        })}
      </div>

      <EarthLink env={env} />

      <div className="ml-auto text-right leading-tight">
        <div className="num text-[1.45rem]">Day {missionDay(now)}</div>
        <div className="label">
          {clockText(now)} ship time{timeScale > 1 ? `, demo ×${timeScale}` : ''}
        </div>
      </div>

      <button className="tap tap-alert sos-beacon min-w-[112px] text-[1.3rem] font-bold tracking-wide" onClick={() => go('sos')} aria-label="SOS, start the emergency guide">
        SOS
      </button>
    </header>
  )
}
