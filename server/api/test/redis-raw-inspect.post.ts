/**
 * Raw Redis key inspection - see what BullMQ actually stores
 * POST /api/test/redis-raw-inspect
 */

import { getBullMQQueue } from '../../utils/queue/bullmq-queue'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) || {}
    const queueName = body.queueName || 'monitoring-us-east'
    const jobId = body.jobId

    if (!jobId) {
      return {
        success: false,
        error: 'Job ID is required',
        usage: 'POST with {"jobId": "job_id_here", "queueName": "queue_name"}'
      }
    }

    const bullMQQueue = getBullMQQueue(queueName)
    const queue = bullMQQueue.getQueue()
    
    // Get the job from BullMQ
    const job = await queue.getJob(jobId)
    
    if (!job) {
      return {
        success: false,
        error: 'Job not found via BullMQ',
        jobId,
        queueName
      }
    }

    return {
      success: true,
      message: 'Job retrieved via BullMQ library',
      jobId,
      queueName,
      bullmq: {
        id: job.id,
        name: job.name,          // This is the job name from queue.add()
        data: job.data,          // This is the job data
        opts: job.opts,          // Job options
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        timestamp: job.timestamp,
        delay: job.delay,
        priority: job.opts.priority
      },
      verification: {
        isMonitoringCheck: job.name === 'monitoring-check',
        hasCorrectStructure: typeof job.data === 'object' && job.data !== null,
        jobDataType: job.data?.type || 'unknown'
      },
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('Raw Redis inspect error:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
})