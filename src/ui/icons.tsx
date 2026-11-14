import type { ReactNode } from 'react'

/** Hand-drawn line icons for this project (no icon library). */
function Icon({ children, size = 26 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

export const CrewIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <circle cx="12" cy="5" r="2.4" />
    <path d="M5.5 10.5h13M12 10.5V15m0 0-3.2 6M12 15l3.2 6" />
  </Icon>
)

export const MeasureIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <path d="M3.5 16a8.5 8.5 0 0 1 17 0" />
    <path d="M12 16l4.2-5.4" />
    <path d="M3.5 19.5h17" />
  </Icon>
)

export const TestsIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <circle cx="12" cy="13.5" r="7.5" />
    <path d="M12 13.5V9M9.5 3h5M12 3v3" />
  </Icon>
)

export const LabIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <path d="M9 3h6M10 3v6.2L4.8 18a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 9.2V3" />
    <path d="M7.5 15h9" />
  </Icon>
)

export const MissionsIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <path d="M10 6h10M10 12h10M10 18h10" />
    <path d="M3.5 6l1.3 1.3L7 5M3.5 12l1.3 1.3L7 11M3.5 18l1.3 1.3L7 17" />
  </Icon>
)

export const EarthIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c3 3 3 14 0 17M12 3.5c-3 3-3 14 0 17" />
  </Icon>
)

export const ShieldIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <path d="M12 3l7.5 3v6c0 4.5-3.2 7.6-7.5 9-4.3-1.4-7.5-4.5-7.5-9V6Z" />
  </Icon>
)

export const BackIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <path d="M14.5 5.5 8 12l6.5 6.5" />
  </Icon>
)

export const PlusIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

export const MinusIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <path d="M5 12h14" />
  </Icon>
)

export const CloseIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
)

export const SendIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <path d="M4 12 20 4l-5 16-3.5-6.5Z" />
  </Icon>
)

export const SoundIcon = ({ size, off }: { size?: number; off?: boolean }) => (
  <Icon size={size}>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4Z" />
    {off ? <path d="M16 9.5l5 5M21 9.5l-5 5" /> : <path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" />}
  </Icon>
)

/** Product mark: a pulse line crossing an orbit. */
export function Mark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="22" fill="none" stroke="var(--color-link)" strokeWidth="3" />
      <path d="M10 33h13l4-11 8 22 5-14 3 3h11" fill="none" stroke="var(--color-ok)" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
