/**
 * Direct Redis connection-based queue implementation
 * Alternative to Upstash REST API for direct Redis access
 */

import { Redis } from 'ioredis'
import type { MonitoringJobData, JobCreationResult, BullMQJob } from '~/types/job-queue'

export interface RedisDirectConfig {
  url: string
  username?: string
  password?: string
  db?: number
  tls?: boolean
}

export class RedisDirectQueue {
  private redis: Redis
  private queueName: string
  private bullMQQueueName: string

  constructor(queueName: string, config: RedisDirectConfig) {
    this.queueName = queueName
    this.bullMQQueueName = `bull:${queueName}:waiting` // BullMQ convention

    // Parse Redis URL and configure client
    const url = new URL(config.url)
    const redisConfig: any = {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      db: config.db || 0,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
    }

    // Handle username and password from URL or config
    if (url.username) {
      redisConfig.username = url.username
    }

    if (url.password) {
      redisConfig.password = url.password
    } else if (config.password) {
      redisConfig.password = config.password
    }

    // Handle TLS for rediss:// URLs
    if (url.protocol === 'rediss:' || config.tls) {
      redisConfig.tls = {}
    }

    this.redis = new Redis(redisConfig)

    // Error handling
    this.redis.on('error', (err) => {
      console.error(`Redis connection error for queue ${queueName}:`, err)
    })

    this.redis.on('connect', () => {
      console.log(`Redis connected for queue ${queueName}`)
    })
  }

  /**
   * Add a job to the queue (legacy format)
   */
  async addJob(jobId: string, jobData: MonitoringJobData): Promise<JobCreationResult> {
    try {
      const job = {
        id: jobId,
        data: jobData,
        createdAt: new Date().toISOString(),
        status: 'waiting'
      }

      // Use pipeline to execute multiple commands atomically
      const pipeline = this.redis.pipeline()

      pipeline.lpush(this.queueName, JSON.stringify(job))
      pipeline.hset(`job:${jobId}`, {
        data: JSON.stringify(job),
        queueName: this.queueName,
        status: 'waiting'
      })

      const results = await pipeline.exec()

      // Check if all commands succeeded
      const allSucceeded = results?.every(([err, result]) => err === null)

      if (!allSucceeded) {
        throw new Error('Pipeline execution failed')
      }

      console.log('Job added successfully:', jobId)

      return {
        success: true,
        jobId: jobId,
        queueName: this.queueName as any
      }
    } catch (error) {
      console.error('Add job error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        queueName: this.queueName as any,
        retryable: true
      }
    }
  }

  /**
   * Add a BullMQ specification-compliant job to the queue
   */
  async addBullMQJob(jobName: string, job: BullMQJob): Promise<JobCreationResult> {
    try {
      // BullMQ uses specific Redis key structure - only stores 'data' and 'opts'
      const timestamp = Date.now()
      
      const opts = {
        jobId: job.jobId,
        delay: 0,
        attempts: 3,
        timestamp
      }

      // Use pipeline with proper BullMQ key structure
      const pipeline = this.redis.pipeline()
      
      // BullMQ stores jobs with 'name', 'data', and 'opts' as separate fields
      pipeline.lpush(this.bullMQQueueName, job.jobId)
      pipeline.hset(`bull:${this.queueName}:${job.jobId}`, {
        name: jobName,                // Job name as separate field
        data: JSON.stringify(job),    // Pure job data
        opts: JSON.stringify(opts)    // Job options
      })
      
      // Also maintain compatibility with our custom format for monitoring
      pipeline.hset(`job:${job.jobId}`, {
        data: JSON.stringify(job),
        queueName: this.queueName,
        status: 'waiting'
      })

      const results = await pipeline.exec()

      // Check if all commands succeeded
      const allSucceeded = results?.every(([err, result]) => err === null)
      
      if (!allSucceeded) {
        throw new Error('Pipeline execution failed')
      }

      console.log(`BullMQ job '${jobName}' added successfully:`, job.jobId)

      return {
        success: true,
        jobId: job.jobId,
        queueName: this.queueName as any
      }
    } catch (error) {
      console.error(`Add BullMQ job '${jobName}' error:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        queueName: this.queueName as any,
        retryable: true
      }
    }
  }

  /**
   * Get the next job from the queue
   */
  async getNextJob(): Promise<any | null> {
    try {
      // Use RPOP to get the next job from the end of the list
      const result = await this.redis.rpop(this.queueName)

      if (!result) {
        return null
      }

      const job = JSON.parse(result)

      // Update job status
      await this.redis.hset(`job:${job.id}`, {
        status: 'active',
        processedAt: new Date().toISOString()
      })

      return job
    } catch (error) {
      console.error('Error getting next job:', error)
      return null
    }
  }

  /**
   * Mark job as completed
   */
  async completeJob(jobId: string): Promise<void> {
    try {
      const pipeline = this.redis.pipeline()

      pipeline.hset(`job:${jobId}`, {
        status: 'completed',
        completedAt: new Date().toISOString()
      })
      pipeline.lpush(`${this.queueName}:completed`, jobId)
      pipeline.expire(`job:${jobId}`, 3600) // 1 hour TTL

      await pipeline.exec()

      console.log('Job completed successfully:', jobId)
    } catch (error) {
      console.error('Error completing job:', error)
    }
  }

  /**
   * Mark job as failed
   */
  async failJob(jobId: string, error: string): Promise<void> {
    try {
      const pipeline = this.redis.pipeline()

      pipeline.hset(`job:${jobId}`, {
        status: 'failed',
        failedAt: new Date().toISOString(),
        error: error
      })
      pipeline.lpush(`${this.queueName}:failed`, jobId)

      await pipeline.exec()
    } catch (err) {
      console.error('Error failing job:', err)
    }
  }

  /**
   * Get BullMQ job from waiting queue
   */
  async getBullMQJob(): Promise<BullMQJob | null> {
    try {
      // Get job ID from waiting queue (BullMQ pattern)
      const jobId = await this.redis.rpop(this.bullMQQueueName)
      
      if (!jobId) {
        return null
      }

      // Get job data from job hash
      const jobData = await this.redis.hget(`bull:${this.queueName}:${jobId}`, 'data')
      
      if (!jobData) {
        return null
      }

      const job = JSON.parse(jobData) as BullMQJob
      
      // Move to active (BullMQ pattern)
      await this.redis.lpush(`bull:${this.queueName}:active`, jobId)

      return job
    } catch (error) {
      console.error('Error getting BullMQ job:', error)
      return null
    }
  }

  /**
   * Get queue metrics (including BullMQ queues)
   */
  async getMetrics() {
    try {
      const pipeline = this.redis.pipeline()

      pipeline.llen(this.queueName)
      pipeline.llen(`${this.queueName}:completed`)
      pipeline.llen(`${this.queueName}:failed`)

      const results = await pipeline.exec()

      const waiting = results?.[0]?.[1] as number || 0
      const completed = results?.[1]?.[1] as number || 0
      const failed = results?.[2]?.[1] as number || 0

      return {
        queueName: this.queueName,
        waiting,
        active: 0, // Hard to track without additional complexity
        completed,
        failed,
        lastUpdated: new Date()
      }
    } catch (error) {
      console.error('Error getting queue metrics:', error)
      return {
        queueName: this.queueName,
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        lastUpdated: new Date()
      }
    }
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.redis.ping()
      return result === 'PONG'
    } catch {
      return false
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit()
  }
}

// Queue instances
const queues = new Map<string, RedisDirectQueue>()

/**
 * Get or create queue instance
 */
export function getRedisDirectQueue(queueName: string): RedisDirectQueue {
  if (!queues.has(queueName)) {
    const config: RedisDirectConfig = {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10)
    }

    const queue = new RedisDirectQueue(queueName, config)
    queues.set(queueName, queue)
  }

  return queues.get(queueName)!
}

/**
 * Create monitoring job using direct Redis connection
 */
export async function createMonitoringJobDirect(monitor: any): Promise<JobCreationResult> {
  try {
    // Import dynamic queue selection
    const { selectQueue, getRecommendedQueue } = await import('../scheduler/regional-router')

    // Use dynamic queue selection
    const queueResult = await selectQueue(monitor.preferred_region || 'us-east')
    const queue = getRedisDirectQueue(queueResult.selectedQueue)
    const jobId = `${monitor.id}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    const jobData: MonitoringJobData = {
      monitor_id: monitor.id,
      url: monitor.url,
      type: monitor.type,
      config: monitor.config,
      organization_id: monitor.organization_id,
      scheduled_at: new Date().toISOString(),
      timeout_seconds: monitor.config?.timeout || 30
    }

    return await queue.addJob(jobId, jobData)
  } catch (error) {
    // Use dynamic fallback queue
    const { getRecommendedQueue } = await import('../scheduler/regional-router')
    const fallbackQueue = await getRecommendedQueue()

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      queueName: fallbackQueue,
      retryable: true
    }
  }
}
