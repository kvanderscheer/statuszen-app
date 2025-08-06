/**
 * Regional queue routing logic
 *
 * This module handles:
 * - Queue selection based on preferred region
 * - Fallback region handling
 * - Load balancing for unspecified regions
 */

import type { QueueName, QueueRoutingResult } from '../../types/job-queue'
import type { MonitorRegion } from '../../types/monitor'
import { getUpstashQueue } from '../queue/upstash-rest-queue'

// Queue region mapping
const QUEUE_REGION_MAP: Record<MonitorRegion, QueueName> = {
  'us-east': 'monitoring-us-east',
  'us-west': 'monitoring-us-east', // Fallback to us-east for now
  'eu-west': 'monitoring-eu-west',
  'eu-central': 'monitoring-eu-west', // Fallback to eu-west
  'ap-south': 'monitoring-us-east', // Fallback to us-east for now
  'ap-southeast': 'monitoring-us-east' // Fallback to us-east for now
}

// Load balancing state
let currentQueueIndex = 0
const queueHealthStatus = new Map<QueueName, { healthy: boolean; lastCheck: number; consecutiveFailures: number }>()

/**
 * Select appropriate queue for monitor based on region
 */
export async function selectQueue(preferredRegion: MonitorRegion): Promise<QueueRoutingResult> {
  try {
    // First, try the preferred region
    const preferredQueue = QUEUE_REGION_MAP[preferredRegion]
    
    if (preferredQueue && await checkQueueHealth(preferredQueue)) {
      return {
        selectedQueue: preferredQueue,
        region: preferredRegion,
        isPreferred: true,
        isFallback: false,
        loadFactor: 0.5, // Default load factor
        healthScore: 1.0
      }
    }

    console.warn(`Preferred queue ${preferredQueue} for region ${preferredRegion} is unhealthy, selecting fallback`)

    // If preferred queue is unhealthy, try fallback
    const fallbackQueue = await selectFallbackQueue(preferredQueue)
    if (fallbackQueue) {
      return {
        selectedQueue: fallbackQueue.queueName,
        region: fallbackQueue.region,
        isPreferred: false,
        isFallback: true,
        loadFactor: 0.7, // Higher load factor for fallback
        healthScore: fallbackQueue.healthScore
      }
    }

    // Last resort: use load balancing
    const balancedQueue = getNextQueueByLoadBalancing()
    return {
      selectedQueue: balancedQueue,
      region: getRegionForQueue(balancedQueue),
      isPreferred: false,
      isFallback: true,
      loadFactor: 1.0, // Maximum load factor
      healthScore: 0.5 // Unknown health
    }

  } catch (error) {
    console.error('Queue selection error:', error)
    
    // Emergency fallback to us-east
    return {
      selectedQueue: 'monitoring-us-east',
      region: 'us-east',
      isPreferred: false,
      isFallback: true,
      loadFactor: 1.0,
      healthScore: 0.0 // Unknown health due to error
    }
  }
}

/**
 * Check queue health status
 */
export async function checkQueueHealth(queueName: QueueName): Promise<boolean> {
  try {
    const now = Date.now()
    const cached = queueHealthStatus.get(queueName)
    
    // Use cached result if recent (within 30 seconds)
    if (cached && (now - cached.lastCheck) < 30000) {
      return cached.healthy
    }

    // Perform actual health check using REST queue
    const queue = getUpstashQueue(queueName)
    const isHealthy = await queue.isHealthy()
    
    // Update health status
    const currentStatus = queueHealthStatus.get(queueName) || { healthy: true, lastCheck: 0, consecutiveFailures: 0 }
    
    if (isHealthy) {
      currentStatus.healthy = true
      currentStatus.consecutiveFailures = 0
    } else {
      currentStatus.healthy = false
      currentStatus.consecutiveFailures += 1
    }
    
    currentStatus.lastCheck = now
    queueHealthStatus.set(queueName, currentStatus)

    return isHealthy
  } catch (error) {
    console.error(`Queue health check failed for ${queueName}:`, error)
    
    // Update failure count
    const currentStatus = queueHealthStatus.get(queueName) || { healthy: true, lastCheck: 0, consecutiveFailures: 0 }
    currentStatus.healthy = false
    currentStatus.consecutiveFailures += 1
    currentStatus.lastCheck = Date.now()
    queueHealthStatus.set(queueName, currentStatus)
    
    return false
  }
}

/**
 * Get next queue using load balancing strategy
 */
export function getNextQueueByLoadBalancing(): QueueName {
  const availableQueues: QueueName[] = ['monitoring-us-east', 'monitoring-eu-west']
  
  if (availableQueues.length === 0) {
    // Emergency fallback
    return 'monitoring-us-east'
  }

  // Simple round-robin load balancing
  const selectedQueue = availableQueues[currentQueueIndex % availableQueues.length]
  currentQueueIndex = (currentQueueIndex + 1) % availableQueues.length

  return selectedQueue
}

/**
 * Select fallback queue when preferred queue is unavailable
 */
async function selectFallbackQueue(
  preferredQueue: QueueName
): Promise<{ queueName: QueueName; region: MonitorRegion; healthScore: number } | null> {
  const availableQueues: QueueName[] = ['monitoring-us-east', 'monitoring-eu-west']
  
  // Try other healthy queues
  for (const queueName of availableQueues) {
    if (queueName !== preferredQueue && await checkQueueHealth(queueName)) {
      return {
        queueName,
        region: getRegionForQueue(queueName),
        healthScore: 0.8 // Good health score for healthy fallback
      }
    }
  }

  return null
}

/**
 * Get region for queue name (reverse mapping)
 */
function getRegionForQueue(queueName: QueueName): MonitorRegion {
  const reverseMap: Record<QueueName, MonitorRegion> = {
    'monitoring-us-east': 'us-east',
    'monitoring-eu-west': 'eu-west'
  }

  return reverseMap[queueName] || 'us-east'
}

/**
 * Get queue health statistics
 */
export function getQueueHealthStats(): Array<{
  queueName: QueueName
  healthy: boolean
  consecutiveFailures: number
  lastCheck: Date
}> {
  return Array.from(queueHealthStatus.entries()).map(([queueName, status]) => ({
    queueName,
    healthy: status.healthy,
    consecutiveFailures: status.consecutiveFailures,
    lastCheck: new Date(status.lastCheck)
  }))
}

/**
 * Reset queue health status (for testing or recovery)
 */
export function resetQueueHealthStatus(queueName?: QueueName): void {
  if (queueName) {
    queueHealthStatus.delete(queueName)
  } else {
    queueHealthStatus.clear()
  }
}

/**
 * Get recommended queue based on current health and load
 */
export async function getRecommendedQueue(): Promise<QueueName> {
  const availableQueues: QueueName[] = ['monitoring-us-east', 'monitoring-eu-west']
  let bestQueue: QueueName = 'monitoring-us-east'
  let bestScore = -1

  for (const queueName of availableQueues) {
    const isHealthy = await checkQueueHealth(queueName)
    const status = queueHealthStatus.get(queueName)
    
    // Calculate health score (0-1)
    let healthScore = isHealthy ? 1.0 : 0.0
    
    // Penalize consecutive failures
    if (status && status.consecutiveFailures > 0) {
      healthScore *= Math.max(0.1, 1.0 - (status.consecutiveFailures * 0.2))
    }

    // Prefer US East slightly for default routing
    if (queueName === 'monitoring-us-east') {
      healthScore += 0.1
    }

    if (healthScore > bestScore) {
      bestScore = healthScore
      bestQueue = queueName
    }
  }

  return bestQueue
}
