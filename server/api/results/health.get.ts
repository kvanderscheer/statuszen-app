import { getResultsConsumer } from '../../utils/results/results-consumer'
import { checkDatabaseHealth } from '../../utils/results/database-writer'

/**
 * Health check endpoint for results processor
 */
export default defineEventHandler(async (event) => {
  try {
    const consumer = getResultsConsumer()
    
    // Basic health checks
    const checks = {
      processor: { healthy: false, details: 'Not initialized' },
      database: { healthy: false, details: 'Not checked' },
      overall: { healthy: false, details: 'Checks failed' }
    }
    
    // Check processor health
    if (consumer) {
      try {
        const healthCheck = await consumer.healthCheck()
        checks.processor = {
          healthy: healthCheck.healthy,
          details: healthCheck.details
        }
      } catch (error) {
        checks.processor = {
          healthy: false,
          details: error instanceof Error ? error.message : String(error)
        }
      }
    }
    
    // Check database health
    try {
      const dbHealth = await checkDatabaseHealth()
      checks.database = {
        healthy: dbHealth.isHealthy,
        details: {
          responseTime: dbHealth.responseTime,
          error: dbHealth.error
        }
      }
    } catch (error) {
      checks.database = {
        healthy: false,
        details: error instanceof Error ? error.message : String(error)
      }
    }
    
    // Overall health
    const overallHealthy = checks.processor.healthy && checks.database.healthy
    checks.overall = {
      healthy: overallHealthy,
      details: overallHealthy ? 'All systems operational' : 'Some systems are unhealthy'
    }
    
    // Set appropriate HTTP status code
    const statusCode = overallHealthy ? 200 : 503
    setResponseStatus(event, statusCode)
    
    return {
      healthy: overallHealthy,
      timestamp: new Date().toISOString(),
      checks,
      version: '1.0.0',
      uptime: process.uptime()
    }
    
  } catch (error) {
    console.error('Health check failed:', error)
    
    setResponseStatus(event, 503)
    
    return {
      healthy: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      checks: {
        processor: { healthy: false, details: 'Health check failed' },
        database: { healthy: false, details: 'Health check failed' },
        overall: { healthy: false, details: 'Health check failed' }
      }
    }
  }
})