/**
 * Test REST-based queue implementation
 * POST /api/test/rest-queue
 */

import { getUpstashQueue, createMonitoringJobRest } from '../../utils/queue/upstash-rest-queue'

export default defineEventHandler(async (event) => {
  try {
    console.log('🚀 Testing REST-based queue...')

    // Test 1: Create queue and check health
    const queueName = 'test-monitoring-queue-' + Date.now()
    const queue = getUpstashQueue(queueName)
    const isHealthy = await queue.isHealthy()
    
    if (!isHealthy) {
      throw new Error('Queue health check failed')
    }

    console.log('✅ Queue health check passed')

    // Test 2: Create a test monitoring job directly in our test queue
    const testJobId = 'test-job-' + Date.now()
    const testJobData = {
      monitor_id: 'test-monitor-' + Date.now(),
      url: 'https://httpbin.org/status/200',
      type: 'https' as const,
      config: {
        timeout: 10,
        expectedStatus: 200,
        followRedirects: true
      },
      organization_id: 'test-org',
      scheduled_at: new Date().toISOString(),
      timeout_seconds: 10
    }

    const jobResult = await queue.addJob(testJobId, testJobData)
    console.log('✅ Job creation result:', jobResult)

    // Test 3: Get queue metrics
    const metrics = await queue.getMetrics()
    console.log('✅ Queue metrics:', metrics)

    // Test 4: Process the job (simulate)
    if (jobResult.success && jobResult.jobId) {
      const nextJob = await queue.getNextJob()
      console.log('✅ Retrieved job:', nextJob?.id || 'No job retrieved')

      if (nextJob) {
        // Mark as completed
        await queue.completeJob(nextJob.id)
        console.log('✅ Job marked as completed')
      }
    }

    // Test 5: Final metrics
    const finalMetrics = await queue.getMetrics()
    console.log('✅ Final metrics:', finalMetrics)

    return {
      success: true,
      message: 'REST-based queue test completed successfully!',
      results: {
        healthCheck: isHealthy,
        jobCreation: jobResult,
        initialMetrics: metrics,
        finalMetrics: finalMetrics
      },
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('REST queue test error:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
})