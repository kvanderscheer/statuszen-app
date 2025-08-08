/**
 * Test scheduler job creation with BullMQ format
 * POST /api/test/scheduler-bullmq
 */

import { createMonitoringJob } from '../../utils/scheduler/job-creator'
import type { SchedulableMonitor } from '~/types/scheduler'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) || {}
    
    // Create a test monitor
    const testMonitor: SchedulableMonitor = {
      id: body.monitorId || 'test-monitor-bullmq',
      name: body.name || 'Test BullMQ Monitor from Scheduler',
      url: body.url || 'https://httpbin.org/status/200',
      type: 'https',
      check_interval_minutes: 5,
      config: {
        timeout: 30,
        expectedStatus: 200,
        followRedirects: true,
        validateSSL: true,
        sslExpiry: true,
        sslExpiryDays: 30
      },
      organization_id: body.organizationId || 'org_scheduler_test',
      preferred_region: body.region || 'us-east',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_scheduled_at: undefined,
      next_check_at: new Date().toISOString()
    }
    
    console.log('Testing scheduler job creation with BullMQ format...')
    
    // Use the updated createMonitoringJob function 
    const result = await createMonitoringJob(testMonitor)
    
    if (!result.success) {
      return {
        success: false,
        message: 'Job creation failed',
        error: result.error,
        monitor: testMonitor,
        result: result
      }
    }
    
    console.log('Scheduler successfully created BullMQ job:', result.jobId)
    
    return {
      success: true,
      message: '✅ Scheduler now creates BullMQ-compliant jobs!',
      jobCreation: {
        jobId: result.jobId,
        queueName: result.queueName,
        monitor: {
          id: testMonitor.id,
          name: testMonitor.name,
          url: testMonitor.url,
          type: testMonitor.type,
          region: testMonitor.preferred_region
        }
      },
      redisKeys: {
        expected: [
          `bull:${result.queueName}:waiting`,
          `bull:${result.queueName}:${result.jobId}`,
          `job:${result.jobId}` // Legacy compatibility
        ]
      },
      format: 'BullMQ specification compliant',
      result: result,
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('Scheduler BullMQ test error:', error)
    
    return {
      success: false,
      message: 'Scheduler BullMQ test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
})