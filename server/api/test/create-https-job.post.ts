/**
 * Create a realistic HTTPS monitoring job for testing
 * POST /api/test/create-https-job
 */

import { createMonitoringJob } from '../../utils/scheduler/job-creator'
import type { SchedulableMonitor } from '~/types/scheduler'
import type { MonitoringJobData } from '~/types/job-queue'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) || {}
    
    // Create a realistic monitor configuration that matches what the app creates
    const testMonitor: SchedulableMonitor = {
      id: body.monitorId || `monitor_${Date.now()}`,
      name: body.name || 'Test HTTPS Monitor',
      url: body.url || 'https://httpbin.org/status/200',
      type: 'https',
      check_interval_minutes: body.checkInterval || 5,
      config: {
        timeout: body.timeout || 30,
        expectedStatus: body.expectedStatus || 200,
        followRedirects: body.followRedirects !== false, // Default true
        userAgent: body.userAgent || 'StatusZen Monitor/1.0',
        headers: body.headers || {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Cache-Control': 'no-cache'
        },
        // SSL-specific options for HTTPS
        validateSSL: body.validateSSL !== false, // Default true
        sslExpiry: body.sslExpiry !== false, // Default true
        sslExpiryDays: body.sslExpiryDays || 30,
        // Response validation
        expectedText: body.expectedText || null,
        unexpectedText: body.unexpectedText || null,
        maxResponseTime: body.maxResponseTime || 5000
      },
      organization_id: body.organizationId || 'org_test_12345',
      preferred_region: body.region || 'us-east',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_scheduled_at: null,
      next_check_at: new Date().toISOString()
    }

    console.log('Creating realistic HTTPS monitoring job:', {
      monitorId: testMonitor.id,
      url: testMonitor.url,
      interval: testMonitor.check_interval_minutes,
      region: testMonitor.preferred_region
    })

    // Use the actual job creation logic from the app
    const result = await createMonitoringJob(testMonitor)

    if (!result.success) {
      return {
        success: false,
        message: 'Failed to create HTTPS monitoring job',
        error: result.error,
        monitor: testMonitor,
        jobCreationResult: result
      }
    }

    // Create the expected job data structure for reference
    const expectedJobData: MonitoringJobData = {
      monitor_id: testMonitor.id,
      url: testMonitor.url,
      type: testMonitor.type,
      config: {
        ...testMonitor.config,
        check_interval_minutes: testMonitor.check_interval_minutes,
        preferred_region: testMonitor.preferred_region
      },
      organization_id: testMonitor.organization_id,
      scheduled_at: new Date().toISOString(),
      timeout_seconds: testMonitor.config.timeout,
      retry_count: 0
    }

    return {
      success: true,
      message: 'HTTPS monitoring job created successfully',
      jobId: result.jobId,
      queueName: result.queueName,
      monitor: {
        id: testMonitor.id,
        name: testMonitor.name,
        url: testMonitor.url,
        type: testMonitor.type,
        interval_minutes: testMonitor.check_interval_minutes,
        region: testMonitor.preferred_region,
        organization_id: testMonitor.organization_id
      },
      jobData: expectedJobData,
      config: {
        timeout: testMonitor.config.timeout,
        expectedStatus: testMonitor.config.expectedStatus,
        followRedirects: testMonitor.config.followRedirects,
        validateSSL: testMonitor.config.validateSSL,
        sslExpiryDays: testMonitor.config.sslExpiryDays,
        maxResponseTime: testMonitor.config.maxResponseTime,
        headers: testMonitor.config.headers
      },
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('HTTPS job creation test error:', error)
    
    return {
      success: false,
      message: 'HTTPS job creation test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
})