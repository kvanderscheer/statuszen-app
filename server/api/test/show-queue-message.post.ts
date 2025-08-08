/**
 * Show the exact JSON message format that gets stored in Redis queue
 * POST /api/test/show-queue-message
 */

import { getSampleHttpsJob } from '../../utils/queue/bullmq-job-factory'
import { getQueueInstance } from '../../utils/queue/queue-adapter'

export default defineEventHandler(async (event) => {
  try {
    // Get a sample BullMQ-compliant HTTPS job
    const bullmqJob = getSampleHttpsJob()
    
    // This is the exact structure that gets added to Redis
    const queueMessage = {
      id: bullmqJob.jobId,
      data: bullmqJob, // The entire BullMQ job becomes the data payload
      createdAt: new Date().toISOString(),
      status: 'waiting'
    }
    
    // Add to queue to demonstrate
    const queue = getQueueInstance('test-queue')
    let queueResult = null
    
    if ('addBullMQJob' in queue && typeof queue.addBullMQJob === 'function') {
      queueResult = await queue.addBullMQJob(bullmqJob)
    }
    
    return {
      message: 'This is the EXACT JSON that gets stored in Redis queue',
      redisCommands: [
        `LPUSH test-queue '${JSON.stringify(queueMessage)}'`,
        `HSET job:${bullmqJob.jobId} data '${JSON.stringify(queueMessage)}'`
      ],
      queueMessage: queueMessage,
      breakdown: {
        wrapper: {
          id: 'Unique job identifier',
          data: 'Complete BullMQ job object (specification compliant)',
          createdAt: 'Queue insertion timestamp',
          status: 'Job status (waiting, active, completed, failed)'
        },
        bullmqJobStructure: {
          type: 'HTTPS_CHECK (matches spec)',
          jobId: 'BullMQ job identifier',
          monitorId: 'Monitor UUID',
          organizationId: 'Organization UUID', 
          config: {
            ssl: 'Nested SSL configuration (spec compliant)',
            timeout: 'Timeout in milliseconds (spec compliant)'
          },
          metadata: {
            scheduledAt: 'ISO timestamp',
            region: 'Execution region',
            priority: 'String priority (urgent/high/normal/low)'
          }
        }
      },
      queueResult: queueResult,
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('Show queue message error:', error)
    
    return {
      success: false,
      message: 'Failed to show queue message format',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
})