import { getResultsConsumer } from '../../utils/results/results-consumer'
import { checkDatabaseHealth, getDatabaseStats } from '../../utils/results/database-writer'

/**
 * Get results processor status and statistics
 */
export default defineEventHandler(async (event) => {
  try {
    const consumer = getResultsConsumer()
    
    if (!consumer) {
      return {
        success: false,
        error: 'Results processor not initialized',
        status: {
          isRunning: false,
          isHealthy: false
        }
      }
    }
    
    // Get processor status and stats in parallel
    const [status, stats, dbHealth, dbStats] = await Promise.all([
      consumer.getStatus(),
      consumer.getStats(),
      checkDatabaseHealth(),
      getDatabaseStats()
    ])
    
    return {
      success: true,
      processor: {
        status,
        stats
      },
      database: {
        health: dbHealth,
        stats: dbStats
      },
      system: {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        version: process.version
      }
    }
    
  } catch (error) {
    console.error('Failed to get processor status:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      status: {
        isRunning: false,
        isHealthy: false
      }
    }
  }
})