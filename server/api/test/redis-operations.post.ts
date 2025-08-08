/**
 * Test Redis direct connection with actual queue operations
 * POST /api/test/redis-operations
 */

import { getQueueInstance } from '../../utils/queue/queue-adapter'
import type { MonitoringJobData } from '~/types/job-queue'

export default defineEventHandler(async (event) => {
  try {
    const testQueueName = 'test-operations-queue'
    const queue = getQueueInstance(testQueueName)
    
    console.log('Testing Redis queue operations...')
    
    // Test 1: Health check
    const isHealthy = await queue.isHealthy()
    console.log('✓ Health check:', isHealthy)
    
    if (!isHealthy) {
      return {
        success: false,
        error: 'Redis health check failed',
        tests: { healthCheck: false }
      }
    }
    
    // Test 2: Add a test job
    const testJobData: MonitoringJobData = {
      monitor_id: 'test-monitor-123',
      url: 'https://example.com',
      type: 'https',
      config: { timeout: 30, expectedStatus: 200 },
      organization_id: 'test-org',
      scheduled_at: new Date().toISOString(),
      timeout_seconds: 30
    }
    
    const jobId = `test-job-${Date.now()}`
    const addResult = await queue.addJob(jobId, testJobData)
    console.log('✓ Add job result:', addResult.success)
    
    // Test 3: Get metrics
    const metrics = await queue.getMetrics()
    console.log('✓ Queue metrics:', metrics)
    
    // Test 4: Try to get next job
    const nextJob = await queue.getNextJob()
    console.log('✓ Get next job:', !!nextJob)
    
    // Test 5: Complete the job if we got one
    if (nextJob) {
      await queue.completeJob(nextJob.id)
      console.log('✓ Complete job successful')
    }
    
    // Final metrics check
    const finalMetrics = await queue.getMetrics()
    
    return {
      success: true,
      message: 'All Redis operations completed successfully!',
      tests: {
        healthCheck: isHealthy,
        addJob: addResult.success,
        getJob: !!nextJob,
        completeJob: !!nextJob,
        metrics: !!metrics
      },
      metrics: {
        initial: metrics,
        final: finalMetrics
      },
      jobData: {
        jobId: addResult.jobId,
        queueName: testQueueName,
        retrievedJob: nextJob ? { id: nextJob.id, data: nextJob.data } : null
      },
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('Redis operations test error:', error)
    
    return {
      success: false,
      message: 'Redis operations test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
})