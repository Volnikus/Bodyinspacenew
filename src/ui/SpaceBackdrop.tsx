import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  r: number
  base: number
  speed: number
  phase: number
}

interface Meteor {
  x: number
  y: number
  life: number
}

/** Deterministic star positions: the sky looks the same on every visit. */
function makeStars(count: number): Star[] {
  let seed = 20261115
  const rnd = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  return Array.from({ length: count }, () => ({
    x: rnd(),
    y: rnd(),
    r: 0.4 + rnd() * rnd() * 1.5,
    base: 0.25 + rnd() * 0.6,
    speed: 0.4 + rnd() * 1.4,
    phase: rnd() * Math.PI * 2,
  }))
}

/**
 * The view out of the window: a slow nebula and a field of twinkling stars
 * behind every screen. Own canvas code, no library. Decorative only.
 */
export function SpaceBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const stars = makeStars(230)
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let width = 0
    let height = 0
    let frame = 0
    let last = 0
    let meteor: Meteor | null = null
    let nextMeteor = 6000

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw(performance.now())
    }

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height)
      for (const star of stars) {
        const twinkle = still ? 1 : 0.62 + 0.38 * Math.sin(star.phase + (t / 1000) * star.speed)
        ctx.globalAlpha = star.base * twinkle
        ctx.fillStyle = star.r > 1.25 ? '#cfe3ff' : '#ffffff'
        ctx.beginPath()
        ctx.arc(star.x * width, star.y * height, star.r, 0, Math.PI * 2)
        ctx.fill()
      }
      if (meteor) {
        const head = meteor.life
        const x = meteor.x + head * 420
        const y = meteor.y + head * 190
        const trail = ctx.createLinearGradient(x - 130, y - 59, x, y)
        trail.addColorStop(0, 'rgba(255,255,255,0)')
        trail.addColorStop(1, 'rgba(210,232,255,0.9)')
        ctx.globalAlpha = Math.sin(Math.PI * head)
        ctx.strokeStyle = trail
        ctx.lineWidth = 1.6
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(x - 130, y - 59)
        ctx.lineTo(x, y)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }

    const loop = (t: number) => {
      frame = requestAnimationFrame(loop)
      // About 30 frames a second is plenty for twinkling and keeps tablets cool.
      if (t - last < 32) return
      const dt = t - last
      last = t
      nextMeteor -= dt
      if (!meteor && nextMeteor <= 0) {
        meteor = { x: Math.random() * width * 0.7, y: Math.random() * height * 0.45, life: 0 }
        nextMeteor = 9000 + Math.random() * 9000
      }
      if (meteor) {
        meteor.life += dt / 900
        if (meteor.life >= 1) meteor = null
      }
      draw(t)
    }

    const onVisibility = () => {
      cancelAnimationFrame(frame)
      if (!document.hidden && !still) frame = requestAnimationFrame(loop)
    }

    resize()
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)
    if (!still) frame = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-void" aria-hidden="true">
      <div
        className="nebula absolute -inset-[12%]"
        style={{
          background:
            'radial-gradient(42% 46% at 50% 54%, rgb(59 107 255 / 0.2), transparent 70%), radial-gradient(34% 40% at 88% 6%, rgb(139 92 255 / 0.2), transparent 70%), radial-gradient(30% 36% at 6% 92%, rgb(61 220 151 / 0.09), transparent 70%)',
        }}
      />
      <canvas ref={ref} className="absolute inset-0 h-full w-full" />
    </div>
  )
}
