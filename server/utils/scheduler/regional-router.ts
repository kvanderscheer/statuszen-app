/**
 * Regional queue routing logic
 *
 * This module handles:
 * - Queue selection based on preferred region
 * - Fallback region handling
 * - Load balancing for unspecified regions
 */

import type { QueueName, QueueRoutingResult } from '~/types/job-queue'
import type { MonitorRegion } from '~/types/monitor'
import { getQueueInstance } from '../queue/queue-adapter'
import { getQueuesByRegion, getPreferredQueueForRegion, getActiveQueues, updateQueueHealth } from '../queue/queue-service'

// Queue region mapping is now handled dynamically by queue-service

// Load balancing state
let currentQueueIndex = 0
const queueHealthStatus = new Map<QueueName, { healthy: boolean, lastCheck: number, consecutiveFailures: number }>()

/**
 * Select appropriate queue for monitor based on region
 */
export async function selectQueue(preferredRegion: MonitorRegion): Promise<QueueRoutingResult> {
  try {
    // First, try to get preferred queue for the region
    const preferredQueue = await getPreferredQueueForRegion(preferredRegion)

    if (preferredQueue && await checkQueueHealth(preferredQueue.name)) {
      return {
        selectedQueue: preferredQueue.name,
        region: preferredQueue.region,
        isPreferred: true,
        isFallback: false,
        loadFactor: 0.5, // Default load factor
        healthScore: 1.0
      }
    }

    if (preferredQueue) {
      console.warn(`Preferred queue ${preferredQueue.name} for region ${preferredRegion} is unhealthy, selecting fallback`)
    }

    // Try fallback queues for the region
    const fallbackQueues = await getQueuesByRegion(preferredRegion)
    for (const queue of fallbackQueues) {
      if (queue.name !== preferredQueue?.name && await checkQueueHealth(queue.name)) {
        return {
          selectedQueue: queue.name,
          region: queue.region,
          isPreferred: queue.region === preferredRegion,
          isFallback: queue.region !== preferredRegion,
          loadFactor: queue.region === preferredRegion ? 0.6 : 0.8,
          healthScore: 0.8
        }
      }
    }

    // Last resort: use any healthy queue from load balancing
    const balancedQueue = await getNextHealthyQueueByLoadBalancing()
    if (balancedQueue) {
      return {
        selectedQueue: balancedQueue.name,
        region: balancedQueue.region,
        isPreferred: false,
        isFallback: true,
        loadFactor: 1.0, // Maximum load factor
        healthScore: 0.5 // Unknown health
      }
    }

    // Emergency fallback - get any available queue
    const activeQueues = await getActiveQueues()
    if (activeQueues.length > 0) {
      const emergencyQueue = activeQueues[0]
      return {
        selectedQueue: emergencyQueue.name,
        region: emergencyQueue.region,
        isPreferred: false,
        isFallback: true,
        loadFactor: 1.0,
        healthScore: 0.0 // Unknown health due to emergency
      }
    }

    throw new Error('No active queues available')
  } catch (error) {
    console.error('Queue selection error:', error)

    // Final emergency fallback to hard-coded queue
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

    // Perform actual health check using configured queue type
    const queue = getQueueInstance(queueName)
    const isHealthy = await queue.isHealthy()

    // Update health status
    const currentStatus = queueHealthStatus.get(queueName) || { healthy: true, lastCheck: 0, consecutiveFailures: 0 }

    if (isHealthy) {
      currentStatus.healthy = true
      currentStatus.consecutiveFailures = 0
      // Update database health status
      await updateQueueHealth(queueName, 'healthy').catch(err =>
        console.warn(`Failed to update health status in database for ${queueName}:`, err)
      )
    } else {
      currentStatus.healthy = false
      currentStatus.consecutiveFailures += 1
      // Update database health status
      await updateQueueHealth(queueName, 'unhealthy').catch(err =>
        console.warn(`Failed to update health status in database for ${queueName}:`, err)
      )
    }

    currentStatus.lastCheck = now
    queueHealthStatus.set(queueName, currentStatus)

    return isHealthy
  } catch (error) {
    console.error(`Queue health check failed for ${queueName}:`, error)

    // Update failure count and database
    const currentStatus = queueHealthStatus.get(queueName) || { healthy: true, lastCheck: 0, consecutiveFailures: 0 }
    currentStatus.healthy = false
    currentStatus.consecutiveFailures += 1
    currentStatus.lastCheck = Date.now()
    queueHealthStatus.set(queueName, currentStatus)

    // Update database health status
    await updateQueueHealth(queueName, 'unknown').catch(err =>
      console.warn(`Failed to update health status in database for ${queueName}:`, err)
    )

    return false
  }
}

/**
 * Get next healthy queue using load balancing strategy
 */
export async function getNextHealthyQueueByLoadBalancing(): Promise<{ name: QueueName, region: MonitorRegion } | null> {
  const activeQueues = await getActiveQueues()

  if (activeQueues.length === 0) {
    return null
  }

  // Simple round-robin load balancing
  const selectedQueue = activeQueues[currentQueueIndex % activeQueues.length]
  currentQueueIndex = (currentQueueIndex + 1) % activeQueues.length

  return {
    name: selectedQueue.name,
    region: selectedQueue.region
  }
}

/**
 * Get next queue using load balancing strategy (backward compatibility)
 */
export async function getNextQueueByLoadBalancing(): Promise<QueueName> {
  const healthyQueue = await getNextHealthyQueueByLoadBalancing()
  return healthyQueue?.name || 'monitoring-us-east'
}


/**
 * Get region for queue name (reverse mapping)
 */
export async function getRegionForQueue(queueName: QueueName): Promise<MonitorRegion | null> {
  const activeQueues = await getActiveQueues()
  const queue = activeQueues.find(q => q.name === queueName)
  return queue?.region || null
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
  const activeQueues = await getActiveQueues()
  
  if (activeQueues.length === 0) {
    return 'monitoring-us-east' // Emergency fallback
  }

  let bestQueue = activeQueues[0]
  let bestScore = -1

  for (const queue of activeQueues) {
    const isHealthy = await checkQueueHealth(queue.name)
    const status = queueHealthStatus.get(queue.name)

    // Calculate health score (0-1)
    let healthScore = isHealthy ? 1.0 : 0.0

    // Penalize consecutive failures
    if (status && status.consecutiveFailures > 0) {
      healthScore *= Math.max(0.1, 1.0 - (status.consecutiveFailures * 0.2))
    }

    // Add priority bonus (lower priority number = higher preference)
    healthScore += (10 - queue.priority) * 0.01

    // Prefer US East slightly for default routing (backward compatibility)
    if (queue.region === 'us-east') {
      healthScore += 0.05
    }

    if (healthScore > bestScore) {
      bestScore = healthScore
      bestQueue = queue
    }
  }

  return bestQueue.name
}
