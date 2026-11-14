import { create } from 'zustand'
import { useApp } from './store'

export type SosBranch = 'ask' | 'A' | 'B' | 'report'

export interface SosEvent {
  /** Mission time. */
  t: number
  text: string
}

interface SosState {
  active: boolean
  patientId: string
  /** Mission time the SOS was opened. */
  startedAt: number
  branch: SosBranch
  step: number
  log: SosEvent[]
  /** CPR totals for the report. */
  cycles: number
  compressions: number
  /** Mission time CPR started, for the 45-minute criterion. */
  cprStartedAt: number | null
  messageId: string | null
  reportSent: boolean
  /** True from the moment the crew confirms no pulse until the pulse returns. */
  noPulse: boolean
  /** What KOMEK shows while SOS is open. */
  currentStepTitle: string

  open: (patientId: string) => void
  setPatient: (patientId: string) => void
  addLog: (text: string) => void
  goTo: (branch: SosBranch, step?: number) => void
  setMessage: (id: string) => void
  setStepTitle: (title: string) => void
  setNoPulse: (noPulse: boolean) => void
  startCpr: () => void
  countCompression: () => void
  countCycle: () => void
  markReportSent: () => void
  close: () => void
}

const now = () => useApp.getState().now

const blank = {
  active: false,
  patientId: '',
  startedAt: 0,
  branch: 'ask' as SosBranch,
  step: 0,
  log: [] as SosEvent[],
  cycles: 0,
  compressions: 0,
  cprStartedAt: null as number | null,
  messageId: null as string | null,
  reportSent: false,
  noPulse: false,
  currentStepTitle: '',
}

/** SOS session. Kept in memory only: an emergency is not something to restore after a reload. */
export const useSos = create<SosState>()((set, get) => ({
  ...blank,

  open: (patientId) => {
    const current = get()
    if (current.active) {
      // Still on the first question: follow whoever is selected now.
      if (current.branch === 'ask') set({ patientId })
      return
    }
    set({ ...blank, active: true, patientId, startedAt: now(), log: [{ t: now(), text: 'SOS opened' }] })
  },
  setPatient: (patientId) => set({ patientId }),
  addLog: (text) => set((s) => ({ log: [...s.log, { t: now(), text }] })),
  goTo: (branch, step = 0) => set({ branch, step }),
  setMessage: (messageId) => set({ messageId }),
  setStepTitle: (currentStepTitle) => set({ currentStepTitle }),
  setNoPulse: (noPulse) => set({ noPulse }),
  startCpr: () => set((s) => (s.cprStartedAt === null ? { cprStartedAt: now() } : s)),
  countCompression: () => set((s) => ({ compressions: s.compressions + 1 })),
  countCycle: () => set((s) => ({ cycles: s.cycles + 1 })),
  markReportSent: () => set({ reportSent: true }),
  close: () => set({ ...blank }),
}))
