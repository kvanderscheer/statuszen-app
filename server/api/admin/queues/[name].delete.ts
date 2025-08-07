/**
 * Delete a worker queue
 * DELETE /api/admin/queues/[name]
 */

import { deleteQueue, getQueueByName, getActiveQueues } from '../../../utils/queue/queue-service'

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

    // Safety check: don't delete if it's the only active queue
    const activeQueues = await getActiveQueues()
    if (activeQueues.length === 1 && activeQueues[0]?.name === name) {
      setResponseStatus(event, 409)
      return {
        success: false,
        error: 'Cannot delete last active queue',
        message: 'At least one active queue must remain in the system'
      }
    }

    // Check for force flag to bypass safety checks
    const query = getQuery(event)
    const force = query.force === 'true'

    // If not forcing, warn about active queue
    if (!force && existingQueue.isActive) {
      setResponseStatus(event, 409)
      return {
        success: false,
        error: 'Cannot delete active queue',
        message: 'Use ?force=true to delete an active queue or deactivate it first'
      }
    }

    // Delete the queue
    const success = await deleteQueue(name)

    if (!success) {
      setResponseStatus(event, 500)
      return {
        success: false,
        error: 'Failed to delete queue',
        message: 'Queue deletion failed'
      }
    }

    return {
      success: true,
      message: 'Queue deleted successfully',
      data: {
        deletedQueue: name,
        forced: force
      }
    }
  } catch (error) {
    console.error('Failed to delete queue:', error)
    
    setResponseStatus(event, 500)
    return {
      success: false,
      error: 'Failed to delete queue',
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})