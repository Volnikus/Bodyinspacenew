import { useEffect, useRef, useState } from 'react'
import { go, useRoute } from './state/route'
import { resetDemo, useApp } from './state/store'
import { Dashboard } from './ui/Dashboard'
import { EarthView } from './ui/EarthView'
import { Intro } from './ui/Intro'
import { Komek } from './ui/Komek'
import { Lab } from './ui/Lab'
import { Measure } from './ui/Measure'
import { Missions } from './ui/Missions'
import { OrganCard, isZone } from './ui/OrganCard'
import { NavRail } from './ui/NavRail'
import { Sos } from './ui/sos/Sos'
import { SpaceBackdrop } from './ui/SpaceBackdrop'
import { Tests } from './ui/Tests'
import { TopBar } from './ui/TopBar'

export function App() {
  const [view = '', param] = useRoute()
  // The title screen opens every visit that starts on the dashboard; deep links skip it.
  const [intro, setIntro] = useState(() => window.location.hash.replace(/^#\/?/, '') === '')

  // Mission clock and wearable feed: one tick per second.
  useEffect(() => {
    const { tick } = useApp.getState()
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [])

  const introRef = useRef(intro)
  introRef.current = intro

  // Demo keys. D: crew member deteriorates. T: demo time ×60. Shift+R: reset everything.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      if (event.metaKey || event.ctrlKey || event.altKey || introRef.current) return
      const key = event.key.toLowerCase()
      if (key === 'd') {
        useApp.getState().startScenario()
        go('')
      } else if (key === 't') {
        const state = useApp.getState()
        state.setTimeScale(state.timeScale === 1 ? 60 : 1)
      } else if (key === 'r' && event.shiftKey) {
        resetDemo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (intro) {
    return (
      <>
        <SpaceBackdrop />
        <Intro onStart={() => setIntro(false)} />
      </>
    )
  }

  return (
    <>
      <SpaceBackdrop />
      <div className="app-enter relative z-[1] flex h-full flex-col">
        {view === 'sos' ? (
          <div className="min-h-0 flex-1">
            <Sos />
          </div>
        ) : (
          <>
            <TopBar />
            <div className="flex min-h-0 flex-1">
              <NavRail />
              <main className="min-w-0 flex-1 overflow-hidden">
                {/* Every screen change fades and rises in. */}
                <div key={`${view}/${param ?? ''}`} className="view-enter h-full">
                  {view === 'organ' && isZone(param) ? (
                    <OrganCard key={param} zone={param} />
                  ) : view === 'earth' ? (
                    <EarthView />
                  ) : view === 'missions' ? (
                    <Missions />
                  ) : view === 'lab' ? (
                    <Lab />
                  ) : view === 'tests' ? (
                    <Tests key={param ?? 'menu'} test={param} />
                  ) : view === 'measure' ? (
                    <Measure key={param ?? 'all'} focus={param} />
                  ) : (
                    <Dashboard />
                  )}
                </div>
              </main>
            </div>
          </>
        )}
        <Komek />
        <footer className="flex h-[34px] shrink-0 items-center justify-between gap-4 border-t border-line-soft bg-hull px-4 text-[0.8rem] text-dim" style={{ fontStretch: '88%' }}>
          <span className="font-semibold text-star">Educational prototype. Not a medical device.</span>
          <span className="hidden truncate lg:block">
            Vital signs are simulated. Thresholds: RCP NEWS2, NASA-STD-3001, NASA HRP. Lab data: NASA OSDR OSD-569, OSD-575. Space weather: NASA DONKI.
          </span>
        </footer>
      </div>
    </>
  )
}
