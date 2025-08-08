/**
 * Inspect BullMQ job data in Redis
 * POST /api/test/redis-job-inspect
 */

import { getRedisDirectQueue } from '../../utils/queue/redis-direct-queue'

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

    const queue = getRedisDirectQueue(queueName)
    
    // Get name, data, and opts from Redis using BullMQ key format
    const [jobName, jobData, jobOpts] = await Promise.all([
      queue['redis'].hget(`bull:${queueName}:${jobId}`, 'name'),
      queue['redis'].hget(`bull:${queueName}:${jobId}`, 'data'),
      queue['redis'].hget(`bull:${queueName}:${jobId}`, 'opts')
    ])
    
    if (!jobData || !jobOpts) {
      return {
        success: false,
        error: 'Job not found in Redis',
        keys: {
          searched: `bull:${queueName}:${jobId}`,
          alternative: `job:${jobId}`
        }
      }
    }

    const parsedJobData = JSON.parse(jobData)
    const parsedJobOpts = JSON.parse(jobOpts)
    
    return {
      success: true,
      message: 'Job data retrieved successfully',
      jobId,
      queueName,
      bullmq: {
        name: jobName,
        data: parsedJobData,
        opts: parsedJobOpts
      },
      structure: {
        hasName: jobName !== null,
        nameValue: jobName,
        dataFields: Object.keys(parsedJobData),
        optsFields: Object.keys(parsedJobOpts)
      },
      redisKey: `bull:${queueName}:${jobId}`,
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('Redis job inspect error:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
})