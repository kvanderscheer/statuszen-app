<template>
  <canvas
    ref="canvas"
    class="particle-canvas"
    @click="handleClick"
    @mousemove="handleMouseMove"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Particle } from '../models/Particle'
import { SignalManager } from '../models/SignalManager'
import { calculateDistance } from '../utils/math'
import { CLICK_DETECTION_RADIUS, PARTICLE_COUNT } from '../utils/constants'

const canvas = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let animationFrame: number | null = null
let particles: Particle[] = []
let signalManager: SignalManager | null = null
const mouse = { x: null as number | null, y: null as number | null }

const getParticleCount = () => window?.innerWidth < 768 ? PARTICLE_COUNT.MOBILE : PARTICLE_COUNT.DESKTOP

const init = () => {
  if (!canvas.value) return

  const container = canvas.value.parentElement
  if (container) {
    canvas.value.width = container.clientWidth
    canvas.value.height = container.clientHeight
  } else {
    canvas.value.width = window.innerWidth
    canvas.value.height = window.innerHeight
  }
  ctx = canvas.value.getContext('2d')

  particles = []
  const count = getParticleCount()

  for (let i = 0; i < count; i++) {
    particles.push(new Particle(
      Math.random() * canvas.value.width,
      Math.random() * canvas.value.height
    ))
  }

  signalManager = new SignalManager(particles)
}

const animate = () => {
  if (!canvas.value || !ctx || !signalManager) return

  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)

  signalManager.update()

  for (const particle of particles) {
    particle.update(canvas.value, mouse)
    particle.draw(ctx)
    particle.connect(ctx, particles)
  }

  animationFrame = requestAnimationFrame(animate)
}

const handleMouseMove = (event: MouseEvent) => {
  if (!canvas.value) return
  const rect = canvas.value.getBoundingClientRect()
  mouse.x = event.clientX - rect.left
  mouse.y = event.clientY - rect.top
}

const handleClick = (event: MouseEvent) => {
  if (!canvas.value) return
  const rect = canvas.value.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const clickY = event.clientY - rect.top

  let closestParticle: Particle | null = null
  let closestDistance = Infinity

  for (const particle of particles) {
    const distance = calculateDistance(clickX, clickY, particle.x, particle.y)
    if (distance < closestDistance) {
      closestDistance = distance
      closestParticle = particle
    }
  }

  if (closestParticle && closestDistance < CLICK_DETECTION_RADIUS) {
    closestParticle.startSignal()
  }
}

const handleResize = () => {
  init()
}

onMounted(() => {
  init()
  animate()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.particle-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: auto;
}
</style>
