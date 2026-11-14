import { useEnvironment } from '../../state/selectors'
import { useSos } from '../../state/sos'
import { useApp } from '../../state/store'
import { clockText, countdownText, durationText } from '../../state/time'

/**
 * Why the guide has to work alone: the question to Earth is still on its way,
 * and the earliest answer is two signal trips away.
 */
export function EarthLinkPanel() {
  const env = useEnvironment()
  const now = useApp((s) => s.now)
  const sos = useSos()
  const message = useApp((s) => s.outbox.find((m) => m.id === sos.messageId))
  const steps = Math.max(0, sos.log.length - 1)

  if (env.linkOneWayS === 0) {
    return (
      <section className="panel p-4" aria-label="Earth link">
        <h2 className="label">Earth link</h2>
        <p className="heading mt-1 text-[1.5rem] text-link">Mission Control is live</p>
        <p className="mt-1 text-[0.95rem] text-dim">A flight surgeon can talk you through every step. Keep working while you call.</p>
      </section>
    )
  }

  if (!message) {
    return (
      <section className="panel p-4" aria-label="Earth link">
        <h2 className="label">Earth link</h2>
        <p className="num mt-1 text-[2.2rem] text-link">{durationText(env.linkOneWayS * 1000)}</p>
        <p className="text-[0.95rem] text-dim">one way. A question asked now gets its earliest answer in {durationText(env.linkOneWayS * 2000)}.</p>
      </section>
    )
  }

  const elapsed = now - message.sentAt
  const toEarth = message.delayMs - elapsed
  const toReply = message.delayMs * 2 - elapsed
  const arrived = toEarth <= 0
  const replied = toReply <= 0
  // Position of the signal on the round trip: 0 → 1 outbound, 1 → 0 on the way back.
  const out = Math.min(1, elapsed / message.delayMs)
  const back = arrived ? Math.min(1, (elapsed - message.delayMs) / message.delayMs) : 0
  const x = 22 + (arrived ? 1 - back : out) * 236

  return (
    <section className="panel p-4" aria-label="Earth link">
      <div className="flex items-baseline justify-between">
        <h2 className="label">Earth link</h2>
        <span className="label text-[0.74rem]">sent {clockText(message.sentAt)}</span>
      </div>

      <svg viewBox="0 0 280 46" className="mt-1 w-full" aria-hidden="true">
        <path d="M22 23h236" stroke="var(--color-line)" strokeWidth="2" strokeDasharray="2 6" strokeLinecap="round" />
        <path d={`M22 23H${22 + out * 236}`} stroke="var(--color-link)" strokeWidth="2.5" strokeLinecap="round" opacity={arrived ? 0.35 : 1} />
        <path d="M6 23l10-8v16Z" fill="var(--color-star)" />
        <circle cx="266" cy="23" r="11" fill="var(--color-link-deep)" stroke="var(--color-link)" strokeWidth="2" />
        <path d="M258.5 21c3 2 5-2 8 0s3.5 4 7.5 2" fill="none" stroke="var(--color-link)" strokeWidth="1.6" strokeLinecap="round" />
        {!replied && (
          <circle cx={x} cy="23" r="6" fill="var(--color-link)">
            <animate attributeName="r" values="5;7.5;5" dur="1.2s" repeatCount="indefinite" />
          </circle>
        )}
      </svg>

      {replied ? (
        <div className="mt-1 rounded-[12px] border border-link bg-link-deep/40 p-3">
          <p className="label text-link">Reply from Earth, simulated</p>
          <p className="mt-0.5 text-[0.97rem] leading-snug">“Message received. Continue the onboard guide and send vital signs with every update.”</p>
        </div>
      ) : (
        <div className="mt-1 grid grid-cols-2 gap-2">
          <div>
            <p className="label text-[0.76rem]">{arrived ? 'Earth has your message' : 'Message reaches Earth in'}</p>
            <p className={`num text-[2.1rem] ${arrived ? 'text-dim' : 'text-link'}`}>{arrived ? 'received' : countdownText(toEarth)}</p>
          </div>
          <div>
            <p className="label text-[0.76rem]">Earliest reply in</p>
            <p className="num text-[2.1rem] text-link">{countdownText(toReply)}</p>
          </div>
        </div>
      )}

      <p className="mt-2 text-[0.95rem] leading-snug">
        {replied ? 'Before Earth could answer, you had already done' : 'Until then this guide is your doctor. Done without Earth:'}{' '}
        <span className="font-semibold text-ok">
          {steps} {steps === 1 ? 'step' : 'steps'}
          {sos.cycles > 0 ? `, ${sos.cycles} CPR ${sos.cycles === 1 ? 'cycle' : 'cycles'}` : ''}
          {sos.compressions > 0 ? `, ${sos.compressions} compressions` : ''}
        </span>
        .
      </p>
    </section>
  )
}
