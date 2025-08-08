/**
 * Test direct Redis connection
 * POST /api/test/redis-direct
 */

import { testQueueConnection } from '../../utils/queue/queue-adapter'
import { getSchedulerConfig } from '../../utils/config/scheduler-config'

export default defineEventHandler(async (event) => {
  try {
    const config = getSchedulerConfig()
    
    console.log(`Testing Redis connection with mode: ${config.redis.mode}`)
    console.log(`Redis URL: ${config.redis.url}`)
    
    const testResult = await testQueueConnection('test-connection-queue')
    
    return {
      success: testResult.success,
      message: testResult.success 
        ? `Redis connection successful using ${testResult.mode} mode!`
        : `Redis connection failed using ${testResult.mode} mode`,
      config: {
        mode: config.redis.mode,
        url: config.redis.url,
        db: config.redis.db,
        hasUsername: !!config.redis.username,
        hasPassword: !!config.redis.password
      },
      error: testResult.error,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Redis connection test error:', error)
    
    return {
      success: false,
      message: 'Redis connection test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      config: {
        mode: process.env.REDIS_MODE || 'direct',
        url: process.env.REDIS_URL || 'Not set',
        hasUsername: !!process.env.REDIS_USERNAME,
        hasPassword: !!process.env.REDIS_PASSWORD
      },
      timestamp: new Date().toISOString()
    }
  }
})