/**
 * Get health status of all queues
 * GET /api/admin/queues/health
 */

import { getActiveQueues } from '../../../utils/queue/queue-service'
import { checkQueueHealth, getQueueHealthStats } from '../../../utils/scheduler/regional-router'

export default defineEventHandler(async (event) => {
  try {
    // Get all active queues
    const activeQueues = await getActiveQueues()
    
    if (activeQueues.length === 0) {
      setResponseStatus(event, 503)
      return {
        success: false,
        error: 'No active queues available',
        data: {
          queues: [],
          summary: {
            total: 0,
            healthy: 0,
            unhealthy: 0,
            unknown: 0
          }
        }
      }
    }

    // Check health of each queue
    const healthChecks = await Promise.allSettled(
      activeQueues.map(async (queue) => {
        try {
          const isHealthy = await checkQueueHealth(queue.name)
          return {
            name: queue.name,
            region: queue.region,
            healthy: isHealthy,
            status: isHealthy ? 'healthy' : 'unhealthy',
            lastChecked: new Date().toISOString(),
            priority: queue.priority
          }
        } catch (error) {
          return {
            name: queue.name,
            region: queue.region,
            healthy: false,
            status: 'unknown',
            lastChecked: new Date().toISOString(),
            priority: queue.priority,
            error: error instanceof Error ? error.message : 'Health check failed'
          }
        }
      })
    )

    // Process results
    const queueHealth = healthChecks.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        // Fallback for rejected promises
        const queue = activeQueues[index]
        return queue ? {
          name: queue.name,
          region: queue.region,
          healthy: false,
          status: 'unknown',
          lastChecked: new Date().toISOString(),
          priority: queue.priority,
          error: 'Health check promise rejected'
        } : {
          name: 'unknown',
          region: 'us-east' as any,
          healthy: false,
          status: 'unknown',
          lastChecked: new Date().toISOString(),
          priority: 1,
          error: 'Queue not found'
        }
      }
    })

    // Calculate summary
    const summary = {
      total: queueHealth.length,
      healthy: queueHealth.filter(q => q.status === 'healthy').length,
      unhealthy: queueHealth.filter(q => q.status === 'unhealthy').length,
      unknown: queueHealth.filter(q => q.status === 'unknown').length
    }

    // Get additional health stats
    let healthStats = null
    try {
      healthStats = await getQueueHealthStats()
    } catch (error) {
      console.warn('Failed to get queue health stats:', error)
    }

    // Determine overall system health
    const systemHealthy = summary.healthy > 0 && (summary.unhealthy + summary.unknown) === 0
    const overallStatus = systemHealthy ? 'healthy' : 
                         summary.healthy > 0 ? 'degraded' : 'critical'

    return {
      success: true,
      data: {
        queues: queueHealth,
        summary,
        overallStatus,
        healthStats,
        timestamp: new Date().toISOString()
      }
    }
  } catch (error) {
    console.error('Failed to get queue health:', error)
    
    setResponseStatus(event, 500)
    return {
      success: false,
      error: 'Failed to get queue health',
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})