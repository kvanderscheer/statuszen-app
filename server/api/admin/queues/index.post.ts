/**
 * Create a new worker queue
 * POST /api/admin/queues
 */

import { createQueue } from '../../../utils/queue/queue-service'
import type { MonitorRegion } from '~/types/monitor'

interface CreateQueueRequest {
  name: string
  region: MonitorRegion
  endpoint?: string
  priority?: number
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<CreateQueueRequest>(event)
    
    // Validate request body
    if (!body.name || !body.region) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: 'Missing required fields',
        message: 'Both name and region are required'
      }
    }

    // Validate region
    const validRegions: MonitorRegion[] = ['us-east', 'us-west', 'eu-west', 'eu-central', 'ap-south', 'ap-southeast', 'local']
    if (!validRegions.includes(body.region)) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: 'Invalid region',
        message: `Region must be one of: ${validRegions.join(', ')}`
      }
    }

    // Validate queue name format
    if (!/^[a-z0-9-]+$/.test(body.name)) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: 'Invalid queue name',
        message: 'Queue name must contain only lowercase letters, numbers, and hyphens'
      }
    }

    // Create the queue
    const newQueue = await createQueue({
      name: body.name,
      region: body.region,
      endpoint: body.endpoint,
      priority: body.priority || 1
    })

    if (!newQueue) {
      setResponseStatus(event, 500)
      return {
        success: false,
        error: 'Failed to create queue',
        message: 'Queue creation failed - possibly a duplicate name'
      }
    }

    setResponseStatus(event, 201)
    return {
      success: true,
      data: newQueue,
      message: 'Queue created successfully'
    }
  } catch (error) {
    console.error('Failed to create queue:', error)
    
    setResponseStatus(event, 500)
    return {
      success: false,
      error: 'Failed to create queue',
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})