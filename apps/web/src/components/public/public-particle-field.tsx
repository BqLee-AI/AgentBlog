import { useEffect, useRef } from 'react'

type Particle = {
  accent: boolean
  alpha: number
  drift: number
  phase: number
  radius: number
  vx: number
  vy: number
  x: number
  y: number
}

type Palette = {
  foreground: string
  primary: string
}

const FALLBACK_FOREGROUND = '0 0% 9%'
const FALLBACK_PRIMARY = '193 58% 27%'

function createParticle(width: number, height: number): Particle {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.12,
    vy: (Math.random() - 0.5) * 0.12,
    radius: 1 + Math.random() * 1.8,
    alpha: 0.4 + Math.random() * 0.3,
    accent: Math.random() > 0.8,
    drift: 7 + Math.random() * 16,
    phase: Math.random() * Math.PI * 2,
  }
}

function readPalette(): Palette {
  const styles = getComputedStyle(document.documentElement)
  const foreground = styles.getPropertyValue('--foreground').trim() || FALLBACK_FOREGROUND
  const primary = styles.getPropertyValue('--primary').trim() || FALLBACK_PRIMARY

  return { foreground, primary }
}

export function PublicParticleField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')

    if (!context) {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const state = {
      animationFrame: 0,
      height: 0,
      lastFrameTime: 0,
      palette: readPalette(),
      particles: [] as Particle[],
      reducedMotion: mediaQuery.matches,
      width: 0,
    }

    const resize = () => {
      const nextWidth = window.innerWidth
      const nextHeight = window.innerHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)

      state.width = nextWidth
      state.height = nextHeight

      canvas.width = Math.round(nextWidth * dpr)
      canvas.height = Math.round(nextHeight * dpr)
      canvas.style.width = `${nextWidth}px`
      canvas.style.height = `${nextHeight}px`

      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      state.palette = readPalette()

      const density = state.reducedMotion ? 64000 : 28000
      const particleCount = Math.max(28, Math.min(68, Math.round((nextWidth * nextHeight) / density)))

      state.particles = Array.from({ length: particleCount }, () => createParticle(nextWidth, nextHeight))
    }

    const draw = (timestamp = 0) => {
      const { foreground, primary } = state.palette
      const connectionDistance = 168
      const connectionDistanceSquared = connectionDistance * connectionDistance
      const waveTime = timestamp * 0.001

      context.clearRect(0, 0, state.width, state.height)

      state.particles.forEach((particle, index) => {
        const x = particle.x + Math.sin(waveTime * 0.7 + particle.phase) * particle.drift
        const y = particle.y + Math.cos(waveTime * 0.56 + particle.phase * 1.15) * particle.drift
        const pulse = 0.76 + (Math.sin(waveTime * 1.9 + particle.phase) + 1) * 0.12
        const halo = context.createRadialGradient(x, y, 0, x, y, particle.radius * 4)

        halo.addColorStop(0, `hsl(${primary} / ${particle.alpha * 0.16 * pulse})`)
        halo.addColorStop(1, `hsl(${primary} / 0)`)
        context.fillStyle = halo
        context.beginPath()
        context.arc(x, y, particle.radius * 4, 0, Math.PI * 2)
        context.fill()

        context.beginPath()
        context.fillStyle = particle.accent
          ? `hsl(${foreground} / ${particle.alpha * pulse})`
          : `hsl(${primary} / ${particle.alpha * pulse})`
        context.arc(x, y, particle.radius, 0, Math.PI * 2)
        context.fill()

        for (let nestedIndex = index + 1; nestedIndex < state.particles.length; nestedIndex += 1) {
          const other = state.particles[nestedIndex]

          if (!other) {
            continue
          }

          const otherX = other.x + Math.sin(waveTime * 0.7 + other.phase) * other.drift
          const otherY = other.y + Math.cos(waveTime * 0.56 + other.phase * 1.15) * other.drift
          const dx = x - otherX
          const dy = y - otherY
          const distanceSquared = dx * dx + dy * dy

          if (distanceSquared > connectionDistanceSquared) {
            continue
          }

          const strength = 1 - distanceSquared / connectionDistanceSquared
          context.beginPath()
          context.strokeStyle = `hsl(${primary} / ${0.04 + strength * 0.22})`
          context.lineWidth = 0.65 + strength * 0.65
          context.moveTo(x, y)
          context.lineTo(otherX, otherY)
          context.stroke()
        }
      })
    }

    const step = (timestamp: number) => {
      if (!state.lastFrameTime) {
        state.lastFrameTime = timestamp
      }

      const delta = Math.min(32, timestamp - state.lastFrameTime)
      state.lastFrameTime = timestamp

      for (const particle of state.particles) {
        particle.x += particle.vx * delta
        particle.y += particle.vy * delta

        if (particle.x < -24) particle.x = state.width + 24
        if (particle.x > state.width + 24) particle.x = -24
        if (particle.y < -24) particle.y = state.height + 24
        if (particle.y > state.height + 24) particle.y = -24
      }

      draw(timestamp)
      state.animationFrame = window.requestAnimationFrame(step)
    }

    const stop = () => {
      if (state.animationFrame) {
        window.cancelAnimationFrame(state.animationFrame)
        state.animationFrame = 0
      }
      state.lastFrameTime = 0
    }

    const start = () => {
      stop()

      if (state.reducedMotion) {
        draw()
        return
      }

      state.animationFrame = window.requestAnimationFrame(step)
    }

    const handleMotionChange = (event: MediaQueryListEvent) => {
      state.reducedMotion = event.matches
      resize()
      start()
    }

    const paletteObserver = new MutationObserver(() => {
      state.palette = readPalette()
      draw()
    })

    resize()
    start()

    window.addEventListener('resize', resize)
    mediaQuery.addEventListener('change', handleMotionChange)
    paletteObserver.observe(document.documentElement, {
      attributeFilter: ['class', 'style'],
      attributes: true,
    })

    return () => {
      stop()
      window.removeEventListener('resize', resize)
      mediaQuery.removeEventListener('change', handleMotionChange)
      paletteObserver.disconnect()
    }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full opacity-80 [mask-image:linear-gradient(180deg,black,black_72%,transparent)]"
      />
    </div>
  )
}
