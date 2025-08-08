/**
 * Create and test BullMQ specification-compliant HTTPS jobs
 * POST /api/test/bullmq-https-job
 */

import { createBullMQJobFromMonitor, validateBullMQJob, getSampleHttpsJob } from '../../utils/queue/bullmq-job-factory'
import { getQueueInstance } from '../../utils/queue/queue-adapter'
import type { SchedulableMonitor } from '~/types/scheduler'
import type { HttpsCheckJob } from '~/types/job-queue'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) || {}
    const useCustom = body.useCustom !== false // Default to custom unless explicitly disabled
    
    let httpsJob: HttpsCheckJob
    
    if (useCustom && body.monitor) {
      // Create job from provided monitor data
      const monitor: SchedulableMonitor = {
        id: body.monitor.id || `monitor_${Date.now()}`,
        name: body.monitor.name || 'Custom HTTPS Test Monitor',
        url: body.monitor.url || 'https://httpbin.org/status/200',
        type: 'https',
        check_interval_minutes: body.monitor.checkInterval || 5,
        config: {
          timeout: body.monitor.timeout || 30,
          expectedStatus: body.monitor.expectedStatus || 200,
          followRedirects: body.monitor.followRedirects !== false,
          validateSSL: body.monitor.validateSSL !== false,
          sslExpiry: body.monitor.sslExpiry !== false,
          sslExpiryDays: body.monitor.sslExpiryDays || 30,
          maxResponseTime: body.monitor.maxResponseTime || 5000,
          headers: body.monitor.headers || {
            'User-Agent': 'StatusZen Monitor/1.0 BullMQ-Spec-Test',
            'Accept': 'application/json, text/html'
          }
        },
        organization_id: body.monitor.organizationId || 'org_bullmq_test',
        preferred_region: body.monitor.region || 'us-east',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_scheduled_at: null,
        next_check_at: new Date().toISOString()
      }
      
      httpsJob = createBullMQJobFromMonitor(monitor) as HttpsCheckJob
    } else {
      // Use sample job
      httpsJob = getSampleHttpsJob()
    }
    
    console.log('Created BullMQ HTTPS job:', {
      jobId: httpsJob.jobId,
      type: httpsJob.type,
      url: httpsJob.config.url,
      monitorId: httpsJob.monitorId
    })
    
    // Validate the job structure
    const isValid = validateBullMQJob(httpsJob)
    if (!isValid) {
      return {
        success: false,
        message: 'BullMQ job validation failed',
        job: httpsJob,
        error: 'Job structure does not match BullMQ specification'
      }
    }
    
    // Add job to queue if requested
    let queueResult = null
    if (body.addToQueue !== false) { // Default to adding unless explicitly disabled
      try {
        const queueName = body.queueName || 'monitoring-us-east'
        const queue = getQueueInstance(queueName)
        
        // Use the new BullMQ method if available
        if ('addBullMQJob' in queue && typeof queue.addBullMQJob === 'function') {
          queueResult = await queue.addBullMQJob(httpsJob)
        } else {
          // Fallback: wrap BullMQ job in legacy format
          const legacyJobData = {
            monitor_id: httpsJob.monitorId,
            url: httpsJob.config.url,
            type: 'https' as const,
            config: httpsJob.config,
            organization_id: httpsJob.organizationId,
            scheduled_at: httpsJob.metadata.scheduledAt,
            timeout_seconds: Math.floor(httpsJob.config.timeout / 1000),
            retry_count: 0
          }
          queueResult = await queue.addJob(httpsJob.jobId, legacyJobData)
        }
        
        console.log('Queue addition result:', queueResult)
      } catch (queueError) {
        console.error('Queue addition failed:', queueError)
        queueResult = {
          success: false,
          error: queueError instanceof Error ? queueError.message : 'Unknown queue error'
        }
      }
    }
    
    return {
      success: true,
      message: 'BullMQ HTTPS job created and validated successfully',
      specification: 'BullMQ Message Specification Compliant',
      job: httpsJob,
      validation: {
        passed: isValid,
        structure: 'matches BullMQ spec',
        requiredFields: [
          'type: HTTPS_CHECK',
          'jobId: string', 
          'monitorId: string',
          'organizationId: string',
          'config.ssl: object',
          'metadata: object'
        ]
      },
      queue: queueResult,
      differences: {
        from_legacy: [
          'Top-level jobId instead of wrapped data structure',
          'camelCase field names instead of snake_case',
          'type: HTTPS_CHECK instead of type: https in data',
          'Nested ssl configuration object',
          'Structured metadata object with region and priority',
          'Timeout values in milliseconds instead of seconds'
        ]
      },
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('BullMQ HTTPS job test error:', error)
    
    return {
      success: false,
      message: 'BullMQ HTTPS job test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
})