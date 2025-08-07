/**
 * Update a worker queue
 * PUT /api/admin/queues/[name]
 */

import { updateQueue, getQueueByName } from '../../../utils/queue/queue-service'
import type { MonitorRegion } from '~/types/monitor'

interface UpdateQueueRequest {
  region?: MonitorRegion
  endpoint?: string
  isActive?: boolean
  priority?: number
}

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

    const body = await readBody<UpdateQueueRequest>(event)
    
    // Validate that queue exists
    const existingQueue = await getQueueByName(name)
    if (!existingQueue) {
      setResponseStatus(event, 404)
      return {
        success: false,
        error: 'Queue not found',
        message: `No queue found with name: ${name}`
      }
    }

    // Validate region if provided
    if (body.region) {
      const validRegions: MonitorRegion[] = ['us-east', 'us-west', 'eu-west', 'eu-central', 'ap-south', 'ap-southeast', 'local']
      if (!validRegions.includes(body.region)) {
        setResponseStatus(event, 400)
        return {
          success: false,
          error: 'Invalid region',
          message: `Region must be one of: ${validRegions.join(', ')}`
        }
      }
    }

    // Validate priority if provided
    if (body.priority !== undefined && (body.priority < 1 || body.priority > 10)) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: 'Invalid priority',
        message: 'Priority must be between 1 and 10'
      }
    }

    // Update the queue
    const updatedQueue = await updateQueue(name, body)

    if (!updatedQueue) {
      setResponseStatus(event, 500)
      return {
        success: false,
        error: 'Failed to update queue',
        message: 'Queue update failed'
      }
    }

    return {
      success: true,
      data: updatedQueue,
      message: 'Queue updated successfully'
    }
  } catch (error) {
    console.error('Failed to update queue:', error)
    
    setResponseStatus(event, 500)
    return {
      success: false,
      error: 'Failed to update queue',
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})