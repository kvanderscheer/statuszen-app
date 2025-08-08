/**
 * Test BullMQ Redis key structure and job storage
 * POST /api/test/bullmq-redis-keys
 */

import { getSampleHttpsJob } from '../../utils/queue/bullmq-job-factory'
import { getQueueInstance } from '../../utils/queue/queue-adapter'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) || {}
    const queueName = body.queueName || 'test-bullmq'
    
    // Get sample job
    const bullmqJob = getSampleHttpsJob()
    
    // Add job to queue
    const queue = getQueueInstance(queueName)
    let result = null
    
    if ('addBullMQJob' in queue && typeof queue.addBullMQJob === 'function') {
      result = await queue.addBullMQJob(bullmqJob)
    } else {
      return {
        success: false,
        message: 'BullMQ job support not available in current queue implementation',
        queueType: queue.constructor.name
      }
    }
    
    // Get metrics to show Redis key structure
    const metrics = await queue.getMetrics()
    
    return {
      success: true,
      message: 'BullMQ job added with proper Redis key structure',
      job: {
        jobId: bullmqJob.jobId,
        type: bullmqJob.type,
        monitorId: bullmqJob.monitorId
      },
      redisKeys: {
        description: 'BullMQ uses bull: prefix for all Redis keys',
        waitingQueue: `bull:${queueName}:waiting`,
        activeQueue: `bull:${queueName}:active`, 
        completedQueue: `bull:${queueName}:completed`,
        failedQueue: `bull:${queueName}:failed`,
        jobHash: `bull:${queueName}:${bullmqJob.jobId}`,
        legacyJobHash: `job:${bullmqJob.jobId}` // For compatibility
      },
      redisCommands: {
        addJob: [
          `LPUSH bull:${queueName}:waiting ${bullmqJob.jobId}`,
          `HSET bull:${queueName}:${bullmqJob.jobId} data '...'`,
          `HSET bull:${queueName}:${bullmqJob.jobId} opts '...'`
        ],
        getJob: [
          `RPOP bull:${queueName}:waiting`,
          `HGET bull:${queueName}:${bullmqJob.jobId} data`,
          `LPUSH bull:${queueName}:active ${bullmqJob.jobId}`
        ]
      },
      queueResult: result,
      metrics: metrics,
      bullmqConventions: {
        queueStructure: 'bull:{queueName}:{state}',
        jobData: 'bull:{queueName}:{jobId}',
        states: ['waiting', 'active', 'completed', 'failed', 'delayed'],
        jobIdFormat: 'Sequential numbers or custom IDs',
        dataStorage: 'Job data stored in Redis hash with data and opts fields'
      },
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('BullMQ Redis keys test error:', error)
    
    return {
      success: false,
      message: 'BullMQ Redis keys test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
})