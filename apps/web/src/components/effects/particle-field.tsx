import { useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  depth: number
  driftX: number
  driftY: number
  driftPhase: number
  twinkleOffset: number
  tint: 'primary' | 'bright'
  renderX: number
  renderY: number
}

interface ParticleFieldProps {
  className?: string
}

const CONNECT_DISTANCE = 168
const POINTER_DISTANCE = 190
const EDGE_PADDING = 28
const MIN_PARTICLES = 56
const MAX_PARTICLES = 110
const PARTICLE_DENSITY = 16_000

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function cssHsl(variableValue: string, alpha: number) {
  return `hsl(${variableValue.trim()} / ${alpha})`
}

function createParticle(width: number, height: number): Particle {
  const depth = 0.65 + Math.random() * 0.95
  const speed = (10 + Math.random() * 18) * depth
  const angle = Math.random() * Math.PI * 2
  const tintRoll = Math.random()

  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: 0.9 + Math.random() * 1.6 + depth * 0.45,
    depth,
    driftX: 10 + Math.random() * 24,
    driftY: 8 + Math.random() * 18,
    driftPhase: Math.random() * Math.PI * 2,
    twinkleOffset: Math.random() * Math.PI * 2,
    tint: tintRoll < 0.82 ? 'primary' : 'bright',
    renderX: 0,
    renderY: 0,
  }
}

export function ParticleField({ className }: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    const canvasEl = canvas
    const context2d = context

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const styles = window.getComputedStyle(document.documentElement)
    const primary = styles.getPropertyValue('--primary') || styles.getPropertyValue('--ring')
    const foreground = styles.getPropertyValue('--foreground')
    const particles: Particle[] = []
    const pointer = { x: -9999, y: -9999, active: false }
    let width = 0
    let height = 0
    let frame = 0
    let lastTimestamp = 0

    function tintColor(tint: Particle['tint']) {
      switch (tint) {
        case 'bright':
          return foreground
        case 'primary':
          return primary
        default:
          return primary
      }
    }

    function resize() {
      const rect = canvasEl.getBoundingClientRect()
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvasEl.width = Math.floor(width * ratio)
      canvasEl.height = Math.floor(height * ratio)
      context2d.setTransform(ratio, 0, 0, ratio, 0, 0)

      particles.length = 0
      const particleCount = clamp(
        Math.round((Math.max(width, 1) * Math.max(height, 1)) / PARTICLE_DENSITY),
        MIN_PARTICLES,
        MAX_PARTICLES,
      )
      for (let i = 0; i < particleCount; i += 1) {
        particles.push(createParticle(width, height))
      }
    }

    function draw(timestamp: number) {
      const delta = prefersReducedMotion
        ? 0
        : clamp((timestamp - lastTimestamp || 16.7) / 1000, 0.008, 0.034)
      const waveTime = timestamp * 0.001
      lastTimestamp = timestamp

      context2d.clearRect(0, 0, width, height)

      for (const particle of particles) {
        if (!prefersReducedMotion) {
          particle.x += particle.vx * delta
          particle.y += particle.vy * delta

          if (particle.x < EDGE_PADDING || particle.x > width - EDGE_PADDING) {
            particle.vx *= -1
            particle.x = clamp(particle.x, EDGE_PADDING, Math.max(EDGE_PADDING, width - EDGE_PADDING))
          }
          if (particle.y < EDGE_PADDING || particle.y > height - EDGE_PADDING) {
            particle.vy *= -1
            particle.y = clamp(particle.y, EDGE_PADDING, Math.max(EDGE_PADDING, height - EDGE_PADDING))
          }

          if (pointer.active) {
            const dx = particle.x - pointer.x
            const dy = particle.y - pointer.y
            const distance = Math.hypot(dx, dy)

            if (distance > 0 && distance < POINTER_DISTANCE) {
              const force = (POINTER_DISTANCE - distance) / POINTER_DISTANCE
              const push = force * 44 * particle.depth * delta
              particle.x += (dx / distance) * push
              particle.y += (dy / distance) * push
            }
          }
        }

        particle.renderX =
          particle.x +
          Math.sin(waveTime * (0.52 + particle.depth * 0.12) + particle.driftPhase) * particle.driftX
        particle.renderY =
          particle.y +
          Math.cos(waveTime * (0.41 + particle.depth * 0.14) + particle.driftPhase * 1.18) *
            particle.driftY
      }

      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i]!
        for (let j = i + 1; j < particles.length; j += 1) {
          const b = particles[j]!
          const distance = Math.hypot(a.renderX - b.renderX, a.renderY - b.renderY)

          if (distance < CONNECT_DISTANCE) {
            const proximity = 1 - distance / CONNECT_DISTANCE
            const depthMix = (a.depth + b.depth) * 0.5
            const opacity = 0.03 + proximity * 0.22 * depthMix
            const lineTint = a.tint === b.tint ? tintColor(a.tint) : primary
            context2d.strokeStyle = cssHsl(lineTint, opacity)
            context2d.lineWidth = 0.7 + proximity * 0.85
            context2d.beginPath()
            context2d.moveTo(a.renderX, a.renderY)
            context2d.lineTo(b.renderX, b.renderY)
            context2d.stroke()
          }
        }
      }

      for (const particle of particles) {
        const particleTint = tintColor(particle.tint)
        const twinkle =
          0.68 + ((Math.sin(waveTime * (1.4 + particle.depth * 0.35) + particle.twinkleOffset) + 1) * 0.18)
        const glowRadius = particle.radius * (3.4 + particle.depth * 0.9)
        const glow = context2d.createRadialGradient(
          particle.renderX,
          particle.renderY,
          0,
          particle.renderX,
          particle.renderY,
          glowRadius,
        )
        glow.addColorStop(0, cssHsl(particleTint, 0.2 * twinkle))
        glow.addColorStop(0.55, cssHsl(particleTint, 0.055 * twinkle))
        glow.addColorStop(1, cssHsl(foreground, 0))

        context2d.fillStyle = glow
        context2d.beginPath()
        context2d.arc(particle.renderX, particle.renderY, glowRadius, 0, Math.PI * 2)
        context2d.fill()

        context2d.fillStyle = cssHsl(particleTint, 0.82 * twinkle)
        context2d.beginPath()
        context2d.arc(particle.renderX, particle.renderY, particle.radius, 0, Math.PI * 2)
        context2d.fill()

        context2d.fillStyle = cssHsl(foreground, 0.84 * twinkle)
        context2d.beginPath()
        context2d.arc(
          particle.renderX,
          particle.renderY,
          Math.max(0.55, particle.radius * 0.36),
          0,
          Math.PI * 2,
        )
        context2d.fill()
      }

      frame = window.requestAnimationFrame(draw)
    }

    function handlePointerMove(event: PointerEvent) {
      const rect = canvasEl.getBoundingClientRect()
      pointer.x = event.clientX - rect.left
      pointer.y = event.clientY - rect.top
      pointer.active = true
    }

    function handlePointerLeave() {
      pointer.active = false
    }

    resize()
    draw(0)

    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerleave', handlePointerLeave)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerleave', handlePointerLeave)
    }
  }, [])

  return (
    <div className={cn('particle-field', className)} aria-hidden="true">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  )
}
