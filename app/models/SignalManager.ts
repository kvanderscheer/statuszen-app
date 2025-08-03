import { RANDOM_SIGNAL_MIN_INTERVAL, RANDOM_SIGNAL_MAX_INTERVAL, MAX_CONCURRENT_SIGNALS } from '../utils/constants'
import type { Particle } from '../models/Particle'

export class SignalManager {
  private particles: Particle[]
  private lastSignalTime: number
  private nextSignalDelay: number

  constructor(particles: Particle[]) {
    this.particles = particles
    this.lastSignalTime = Date.now()
    this.nextSignalDelay = this.getRandomDelay()
  }

  private getRandomDelay(): number {
    return Math.random() * (RANDOM_SIGNAL_MAX_INTERVAL - RANDOM_SIGNAL_MIN_INTERVAL) + RANDOM_SIGNAL_MIN_INTERVAL
  }

  private getSignalingParticlesCount(): number {
    return this.particles.filter(p => p.isSignaling).length
  }

  update() {
    const currentTime = Date.now()
    if (currentTime - this.lastSignalTime >= this.nextSignalDelay) {
      if (this.getSignalingParticlesCount() < MAX_CONCURRENT_SIGNALS) {
        // Select a random particle that isn't already signaling
        const availableParticles = this.particles.filter(p => !p.isSignaling)
        if (availableParticles.length > 0) {
          const randomParticle = availableParticles[Math.floor(Math.random() * availableParticles.length)]
          randomParticle.startSignal()
        }
      }

      this.lastSignalTime = currentTime
      this.nextSignalDelay = this.getRandomDelay()
    }
  }
}
