/** CPR metronome: steady beats from the Web Audio clock, with a visual callback on every beat. */
export class Metronome {
  private ctx: AudioContext | null = null
  private timer: number | undefined
  private nextBeat = 0
  private readonly intervalMs: number
  muted = false

  constructor(
    bpm: number,
    private readonly onBeat: () => void,
  ) {
    this.intervalMs = 60_000 / bpm
  }

  start() {
    this.stop()
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (Ctor && !this.ctx) this.ctx = new Ctor()
      void this.ctx?.resume()
    } catch {
      this.ctx = null // No audio available: the visual beat still works.
    }
    this.nextBeat = performance.now()
    this.loop()
  }

  private loop = () => {
    const now = performance.now()
    if (now >= this.nextBeat) {
      this.click(660, 0.05)
      this.onBeat()
      // Keep to the grid even if a timer fires late.
      this.nextBeat += this.intervalMs
      if (this.nextBeat < now) this.nextBeat = now + this.intervalMs
    }
    this.timer = window.setTimeout(this.loop, Math.max(4, Math.min(25, this.nextBeat - performance.now())))
  }

  /** Two longer, lower tones for the rescue breaths. */
  breathCue() {
    this.click(392, 0.35)
    window.setTimeout(() => this.click(392, 0.35), 1500)
  }

  private click(frequency: number, seconds: number) {
    if (!this.ctx || this.muted) return
    const t = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds)
    osc.connect(gain).connect(this.ctx.destination)
    osc.start(t)
    osc.stop(t + seconds + 0.02)
  }

  stop() {
    window.clearTimeout(this.timer)
    this.timer = undefined
  }

  dispose() {
    this.stop()
    void this.ctx?.close()
    this.ctx = null
  }
}
