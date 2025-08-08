import { getResultsConsumer } from '../../utils/results/results-consumer'
import { getDatabaseStats } from '../../utils/results/database-writer'

/**
 * Get detailed results processing statistics
 */
export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const includeDatabase = query.includeDatabase !== 'false'
    const reset = query.reset === 'true'
    
    const consumer = getResultsConsumer()
    
    if (!consumer) {
      return {
        success: false,
        error: 'Results processor not initialized',
        statistics: null
      }
    }
    
    // Reset statistics if requested
    if (reset) {
      consumer.resetStats()
      console.info('📊 Results processor statistics reset via API')
    }
    
    // Get processor statistics
    const processorStats = consumer.getStats()
    const processorStatus = await consumer.getStatus()
    
    // Get database statistics if requested
    let databaseStats = null
    if (includeDatabase) {
      databaseStats = await getDatabaseStats()
    }
    
    // Calculate additional metrics
    const uptimeHours = processorStats.uptime / (1000 * 60 * 60)
    const throughputPerHour = uptimeHours > 0 ? processorStats.totalProcessed / uptimeHours : 0
    const successRate = processorStats.totalProcessed > 0 
      ? (processorStats.successCount / processorStats.totalProcessed) * 100 
      : 0
    
    // Top error types
    const topErrors = Object.entries(processorStats.errorBreakdown)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([error, count]) => ({ error, count }))
    
    // Job type performance
    const jobTypePerformance = Object.entries(processorStats.jobTypeStats).map(([type, stats]) => ({
      jobType: type,
      processed: stats.processed,
      successRate: stats.processed > 0 ? (stats.success / stats.processed) * 100 : 0,
      errorRate: stats.processed > 0 ? (stats.errors / stats.processed) * 100 : 0
    }))
    
    return {
      success: true,
      statistics: {
        processor: {
          ...processorStats,
          uptimeHours: Math.round(uptimeHours * 100) / 100,
          throughputPerHour: Math.round(throughputPerHour * 100) / 100,
          successRate: Math.round(successRate * 100) / 100
        },
        status: processorStatus,
        analysis: {
          topErrors,
          jobTypePerformance,
          healthScore: calculateHealthScore(processorStats, processorStatus)
        },
        ...(databaseStats && { database: databaseStats }),
        metadata: {
          timestamp: new Date().toISOString(),
          includeDatabase,
          resetRequested: reset
        }
      }
    }
    
  } catch (error) {
    console.error('Failed to get statistics:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      statistics: null
    }
  }
})

/**
 * Calculate overall health score (0-100)
 */
function calculateHealthScore(stats: any, status: any): number {
  let score = 0
  
  // Base score for being active
  if (status.isRunning && status.isHealthy) {
    score += 40
  }
  
  // Success rate contribution (0-30 points)
  if (stats.totalProcessed > 0) {
    const successRate = (stats.successCount / stats.totalProcessed) * 100
    score += Math.min(30, successRate * 0.3)
  }
  
  // Performance contribution (0-20 points)
  if (stats.averageProcessingTime > 0) {
    // Good performance is under 1000ms
    const perfScore = Math.max(0, 20 - (stats.averageProcessingTime / 50))
    score += Math.min(20, perfScore)
  }
  
  // Queue health contribution (0-10 points)
  if (status.queueStats) {
    const totalJobs = status.queueStats.waiting + status.queueStats.active
    if (totalJobs < 100) {
      score += 10
    } else if (totalJobs < 500) {
      score += 5
    }
  }
  
  return Math.round(Math.min(100, score))
}