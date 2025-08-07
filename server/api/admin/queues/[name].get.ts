/**
 * Get a specific worker queue by name
 * GET /api/admin/queues/[name]
 */

import { getQueueByName } from '../../../utils/queue/queue-service'
import { checkQueueHealth } from '../../../utils/scheduler/regional-router'

export default defineEventHandler(async (event) => {
  try {
    const name = getRouterParam(event, 'name')
    
    if (!name) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: 'Missing queue name',
        message: 'Queue name is required'
      }
    }

    // Get queue details
    const queue = await getQueueByName(name)
    
    if (!queue) {
      setResponseStatus(event, 404)
      return {
        success: false,
        error: 'Queue not found',
        message: `No queue found with name: ${name}`
      }
    }

    // Check if we should include health status
    const query = getQuery(event)
    const includeHealth = query.health === 'true'
    
    let healthData = null
    if (includeHealth) {
      try {
        const isHealthy = await checkQueueHealth(name)
        healthData = {
          healthy: isHealthy,
          lastChecked: new Date().toISOString()
        }
      } catch (error) {
        healthData = {
          healthy: false,
          lastChecked: new Date().toISOString(),
          error: 'Health check failed'
        }
      }
    }

    return {
      success: true,
      data: {
        ...queue,
        health: healthData
      }
    }
  } catch (error) {
    console.error('Failed to fetch queue:', error)
    
    setResponseStatus(event, 500)
    return {
      success: false,
      error: 'Failed to fetch queue',
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})