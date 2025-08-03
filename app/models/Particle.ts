import {
  COLORS,
  CONNECTION_DISTANCE,
  MAX_CONNECTIONS,
  SIGNAL_SPEED,
  MOUSE_AVOIDANCE_RADIUS,
  MOUSE_AVOIDANCE_STRENGTH
} from '../utils/constants'
import { calculateDistance } from '../utils/math'

export class Particle {
  x: number
  y: number
  size: number
  color: string
  speedX: number
  speedY: number
  isSignaling: boolean
  signalRadius: number
  signalAlpha: number
  maxSignalRadius: number

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
    this.size = Math.random() * 5 + 3
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)]
    this.speedX = Math.random() * 0.4 - 0.2
    this.speedY = Math.random() * 0.4 - 0.2
    this.isSignaling = false
    this.signalRadius = 0
    this.signalAlpha = 0.4
    this.maxSignalRadius = CONNECTION_DISTANCE
  }

  update(canvas: HTMLCanvasElement, mouse: { x: number | null, y: number | null }) {
    // Update position
    this.x += this.speedX
    this.y += this.speedY

    // Mouse avoidance
    if (mouse.x !== null && mouse.y !== null) {
      const distance = calculateDistance(this.x, this.y, mouse.x, mouse.y)
      if (distance < MOUSE_AVOIDANCE_RADIUS) {
        const dx = mouse.x - this.x
        const dy = mouse.y - this.y
        this.x -= dx * MOUSE_AVOIDANCE_STRENGTH
        this.y -= dy * MOUSE_AVOIDANCE_STRENGTH
      }
    }

    // Bounce off edges
    if (this.x < 0 || this.x > canvas.width) this.speedX *= -1
    if (this.y < 0 || this.y > canvas.height) this.speedY *= -1

    // Update signal
    if (this.isSignaling) {
      this.signalRadius += SIGNAL_SPEED
      this.signalAlpha = 0.4 * (1 - this.signalRadius / this.maxSignalRadius)

      if (this.signalRadius >= this.maxSignalRadius) {
        this.isSignaling = false
        this.signalRadius = 0
        this.signalAlpha = 0.4
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Draw particle
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fillStyle = this.color
    ctx.fill()

    // Draw signal
    if (this.isSignaling) {
      ctx.beginPath()
      ctx.arc(this.x, this.y, this.signalRadius, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(56, 189, 248, ${this.signalAlpha})`
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }

  connect(ctx: CanvasRenderingContext2D, particles: Particle[]) {
    let connections = 0
    for (const particle of particles) {
      if (particle === this || connections >= MAX_CONNECTIONS) break

      const distance = calculateDistance(this.x, this.y, particle.x, particle.y)

      if (distance < CONNECTION_DISTANCE) {
        connections++
        const opacity = (1 - (distance / CONNECTION_DISTANCE)) * 0.3

        // Draw connection line
        ctx.beginPath()
        ctx.moveTo(this.x, this.y)
        ctx.lineTo(particle.x, particle.y)
        ctx.strokeStyle = `rgba(136, 192, 208, ${opacity})`
        ctx.lineWidth = 0.5
        ctx.stroke()

        // Trigger chain reaction with delay
        if (this.isSignaling && !particle.isSignaling) {
          setTimeout(() => {
            particle.isSignaling = true
          }, Math.random() * 100 + 100)
        }
      }
    }
  }

  startSignal() {
    this.isSignaling = true
    this.signalRadius = 0
    this.signalAlpha = 0.4
  }
}
