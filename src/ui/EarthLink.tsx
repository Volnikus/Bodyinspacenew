import type { Environment } from '../data/environments'
import { SEC, durationText } from '../state/time'

/** How long a signal takes to reach Earth, and the earliest an answer can come back. */
export function linkText(env: Environment): { oneWay: string; reply: string; live: boolean } {
  if (env.linkOneWayS === 0) return { oneWay: 'Live', reply: 'Answer in real time', live: true }
  const oneWay = env.linkOneWayS * SEC
  return { oneWay: durationText(oneWay), reply: `Earliest answer in ${durationText(oneWay * 2)}`, live: false }
}

/** The motif of the whole product: a signal crawling from the ship to Earth. */
export function EarthLink({ env }: { env: Environment }) {
  const text = linkText(env)
  // The slower the real link, the slower the dot.
  const travel = text.live ? 0.9 : Math.min(7, 1.4 + Math.log10(1 + env.linkOneWayS) * 1.9)
  return (
    <div className="flex items-center gap-3" title={env.linkNote}>
      <svg width="118" height="34" viewBox="0 0 118 34" aria-hidden="true">
        <path d="M14 17h84" stroke="var(--color-line)" strokeWidth="2" strokeDasharray="2 5" strokeLinecap="round" />
        <path d="M4 17l6-5v10Z" fill="var(--color-star)" />
        <circle cx="106" cy="17" r="8" fill="var(--color-link-deep)" stroke="var(--color-link)" strokeWidth="2" />
        <path d="M100.5 15.5c2 1.5 3.5-1.5 5.5 0s2.5 3 5.5 1.5" fill="none" stroke="var(--color-link)" strokeWidth="1.4" strokeLinecap="round" />
        <circle r="3.4" cy="17" fill="var(--color-link)">
          <animate attributeName="cx" from="14" to="96" dur={`${travel}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur={`${travel}s`} repeatCount="indefinite" />
        </circle>
      </svg>
      <div className="leading-tight">
        <div className="label">{env.linkTarget ? `Link to ${env.linkTarget}, one way` : 'Earth link, one way'}</div>
        <div className="num text-[1.45rem] text-link">{text.oneWay}</div>
      </div>
    </div>
  )
}
