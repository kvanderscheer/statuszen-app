/**
 * BullMQ-based queue implementation using the actual BullMQ library
 * Replaces manual Redis implementation with proper BullMQ usage
 */

import { Queue } from 'bullmq'
import type { JobCreationResult, BullMQJob } from '~/types/job-queue'

export interface BullMQConfig {
  url: string
  username?: string
  password?: string
  db?: number
  tls?: boolean
}

export class BullMQQueue {
  private queue: Queue
  private queueName: string

  constructor(queueName: string, config: BullMQConfig) {
    this.queueName = queueName

    // Parse Redis URL and configure connection
    const url = new URL(config.url)
    const connection: any = {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      db: config.db || 0,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
    }

    // Handle username and password from URL or config
    if (url.username) {
      connection.username = url.username
    }

    if (url.password) {
      connection.password = url.password
    } else if (config.password) {
      connection.password = config.password
    }

    // Handle TLS for rediss:// URLs
    if (url.protocol === 'rediss:' || config.tls) {
      connection.tls = {}
    }

    // Create BullMQ Queue instance
    this.queue = new Queue(queueName, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      }
    })

    // Error handling
    this.queue.on('error', (err) => {
      console.error(`BullMQ queue error for ${queueName}:`, err)
    })
  }

  /**
   * Add a BullMQ job using the proper library method
   */
  async addBullMQJob(jobName: string, job: BullMQJob, options?: any): Promise<JobCreationResult> {
    try {
      console.log(`Adding BullMQ job '${jobName}' with ID ${job.jobId} to queue ${this.queueName}`)

      // Use BullMQ's add method with proper job name, data, and options
      const bullMQJob = await this.queue.add(jobName, job, {
        jobId: job.jobId,
        priority: this.getPriorityValue(job.metadata.priority),
        delay: 0,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: 100,
        removeOnFail: 50,
        ...options
      })

      console.log(`BullMQ job '${jobName}' added successfully:`, bullMQJob.id)

      return {
        success: true,
        jobId: bullMQJob.id as string,
        queueName: this.queueName as any
      }

    } catch (error) {
      console.error(`BullMQ job '${jobName}' creation error:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        queueName: this.queueName as any,
        retryable: true
      }
    }
  }

  /**
   * Convert BullMQ job priority to numeric value
   */
  private getPriorityValue(priority: string): number {
    switch (priority) {
      case 'urgent': return 1
      case 'high': return 2
      case 'normal': return 3
      case 'low': return 4
      default: return 3
    }
  }

  /**
   * Get queue metrics using BullMQ methods
   */
  async getMetrics() {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.queue.getWaiting(),
        this.queue.getActive(),
        this.queue.getCompleted(),
        this.queue.getFailed(),
        this.queue.getDelayed()
      ])

      return {
        queueName: this.queueName,
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        lastUpdated: new Date()
      }
    } catch (error) {
      console.error('Error getting BullMQ queue metrics:', error)
      return {
        queueName: this.queueName,
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        lastUpdated: new Date()
      }
    }
  }

  /**
   * Health check using BullMQ connection
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.queue.getWaiting()
      return true
    } catch {
      return false
    }
  }

  /**
   * Close BullMQ queue
   */
  async close(): Promise<void> {
    await this.queue.close()
  }

  /**
   * Get the underlying BullMQ queue instance
   */
  getQueue(): Queue {
    return this.queue
  }
}

// Queue instances cache
const queues = new Map<string, BullMQQueue>()

/**
 * Get or create BullMQ queue instance
 */
export function getBullMQQueue(queueName: string): BullMQQueue {
  if (!queues.has(queueName)) {
    const config: BullMQConfig = {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10)
    }

    const queue = new BullMQQueue(queueName, config)
    queues.set(queueName, queue)
  }

  return queues.get(queueName)!
}