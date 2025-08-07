/**
 * Get all worker queues
 * GET /api/admin/queues
 */

import { getAllQueues, getQueueStats } from '../../../utils/queue/queue-service'

export default defineEventHandler(async (event) => {
  try {
    // Get query parameters
    const query = getQuery(event)
    const includeStats = query.stats === 'true'
    
    // Fetch queues and stats
    const [queues, stats] = await Promise.all([
      getAllQueues(true), // Force refresh
      includeStats ? getQueueStats() : null
    ])

    return {
      success: true,
      data: {
        queues,
        stats: includeStats ? stats : undefined,
        total: queues.length,
        active: queues.filter(q => q.isActive).length
      }
    }
  } catch (error) {
    console.error('Failed to fetch queues:', error)
    
    setResponseStatus(event, 500)
    return {
      success: false,
      error: 'Failed to fetch queues',
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})