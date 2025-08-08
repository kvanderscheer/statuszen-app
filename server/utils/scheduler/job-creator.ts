/**
 * REST-based job creation logic
 *
 * This module handles:
 * - Creating monitoring jobs with unique IDs
 * - Job data structure formatting
 * - Deduplication logic
 */

import type { JobCreationResult, BatchJobCreationResult, QueueName } from '~/types/job-queue'
import type { SchedulableMonitor } from '~/types/scheduler'
import { getQueueInstance } from '../queue/queue-adapter'
import { getBullMQQueue } from '../queue/bullmq-queue'
import { createBullMQJobFromMonitor, validateBullMQJob } from '../queue/bullmq-job-factory'
import { 
  createJobDataFromMonitor, 
  validateJobData, 
  calculateJobPriority, 
  getJobType,
  getDefaultTimeout,
  needsDeduplication,
  sanitizeJobDataForLogging
} from '../queue/job-types'
import { selectQueue, getRecommendedQueue } from './regional-router'
import { getActiveQueues } from '../queue/queue-service'

// Deduplication cache (in production, this should be Redis-based)
const deduplicationCache = new Map<string, number>()

/**
 * Create a single monitoring job
 */
export async function createMonitoringJob(monitor: SchedulableMonitor): Promise<JobCreationResult> {
  try {
    // Create BullMQ-compliant job from monitor
    const bullmqJob = createBullMQJobFromMonitor(monitor)

    // Validate BullMQ job structure
    if (!validateBullMQJob(bullmqJob)) {
      const fallbackQueue = await getRecommendedQueue()
      return {
        success: false,
        error: 'Invalid BullMQ job structure',
        queueName: fallbackQueue,
        retryable: false
      }
    }

    // Check for deduplication using BullMQ job structure
    const deduplicationKey = `${bullmqJob.monitorId}:${Math.floor(Date.now() / 60000)}` // 1-minute window
    const now = Date.now()
    const existingTime = deduplicationCache.get(deduplicationKey)
    
    if (existingTime && (now - existingTime) < 60000) { // 1 minute window
      console.log(`Skipping duplicate job for monitor ${bullmqJob.monitorId}`)
      const fallbackQueue = await getRecommendedQueue()
      return {
        success: false,
        error: 'Duplicate job within deduplication window',
        queueName: fallbackQueue,
        retryable: false
      }
    }

    // Select appropriate queue and use BullMQ library
    const queueResult = await selectQueue(monitor.preferred_region)
    const bullMQQueue = getBullMQQueue(queueResult.selectedQueue)

    // Add job using real BullMQ library
    console.log(`Adding BullMQ job ${bullmqJob.jobId} to queue ${queueResult.selectedQueue}`)
    const result = await bullMQQueue.addBullMQJob('monitoring-check', bullmqJob)

    if (!result.success) {
      return {
        success: false,
        error: result.error || `Queue ${queueResult.selectedQueue} failed to add job`,
        queueName: queueResult.selectedQueue,
        retryable: result.retryable || true
      }
    }

    // Update deduplication cache
    deduplicationCache.set(deduplicationKey, now)

    console.log(`Created BullMQ job ${bullmqJob.jobId} for monitor ${bullmqJob.monitorId} in queue ${queueResult.selectedQueue}`)

    return {
      success: true,
      jobId: bullmqJob.jobId,
      queueName: queueResult.selectedQueue
    }

  } catch (error) {
    console.error(`Failed to create job for monitor ${monitor.id}:`, error)
    const fallbackQueue = await getRecommendedQueue()
    
    return {
      success: false,
      error: `Job creation failed: ${error}`,
      queueName: fallbackQueue,
      retryable: true
    }
  }
}

/**
 * Create multiple monitoring jobs in batch
 */
export async function createMonitoringJobsBatch(monitors: SchedulableMonitor[]): Promise<BatchJobCreationResult> {
  const startTime = Date.now()
  const results: JobCreationResult[] = []
  
  // Initialize queue distribution dynamically
  const activeQueues = await getActiveQueues()
  const queueDistribution: Record<QueueName, number> = {}
  activeQueues.forEach(queue => {
    queueDistribution[queue.name] = 0
  })

  // Process monitors in parallel with limited concurrency
  const concurrency = 10
  const batches = []
  
  for (let i = 0; i < monitors.length; i += concurrency) {
    batches.push(monitors.slice(i, i + concurrency))
  }

  for (const batch of batches) {
    const batchPromises = batch.map(async (monitor) => {
      try {
        const result = await createMonitoringJob(monitor)
        results.push(result)

        if (result.success && result.queueName) {
          queueDistribution[result.queueName] = (queueDistribution[result.queueName] || 0) + 1
        }

        return result
      } catch (error) {
        console.error(`Batch job creation failed for monitor ${monitor.id}:`, error)
        const fallbackQueue = await getRecommendedQueue()
        const failedResult: JobCreationResult = {
          success: false,
          error: `Batch creation failed: ${error}`,
          queueName: fallbackQueue,
          retryable: true
        }
        results.push(failedResult)
        return failedResult
      }
    })

    await Promise.all(batchPromises)
  }

  const successfulJobs = results.filter(r => r.success).length
  const failedJobs = results.length - successfulJobs
  const duration = Date.now() - startTime

  console.log(`Batch job creation completed: ${successfulJobs} successful, ${failedJobs} failed in ${duration}ms`)

  return {
    totalJobs: monitors.length,
    successfulJobs,
    failedJobs,
    results,
    duration,
    queueDistribution
  }
}

/**
 * Generate unique job ID for monitor
 */
export function generateJobId(monitorId: string, timestamp?: Date): string {
  const now = timestamp || new Date()
  const timestampStr = now.getTime().toString()
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  
  return `${monitorId}_${timestampStr}_${randomSuffix}`
}

/**
 * Clean up old deduplication entries
 */
export function cleanupDeduplicationCache(): void {
  const now = Date.now()
  const fiveMinutesAgo = now - (5 * 60 * 1000)

  for (const [key, timestamp] of deduplicationCache.entries()) {
    if (timestamp < fiveMinutesAgo) {
      deduplicationCache.delete(key)
    }
  }
}

/**
 * Get deduplication cache stats
 */
export function getDeduplicationStats(): { size: number; oldestEntry: number | null } {
  const timestamps = Array.from(deduplicationCache.values())
  const oldestEntry = timestamps.length > 0 ? Math.min(...timestamps) : null

  return {
    size: deduplicationCache.size,
    oldestEntry
  }
}

/**
 * Retry failed job creation with exponential backoff
 */
export async function retryJobCreation(
  monitor: SchedulableMonitor, 
  attempt: number,
  maxAttempts: number = 3
): Promise<JobCreationResult> {
  if (attempt >= maxAttempts) {
    const fallbackQueue = await getRecommendedQueue()
    return {
      success: false,
      error: `Max retry attempts (${maxAttempts}) exceeded`,
      queueName: fallbackQueue,
      retryable: false
    }
  }

  // Exponential backoff: 1s, 2s, 4s, 8s...
  const delay = Math.pow(2, attempt) * 1000
  await new Promise(resolve => setTimeout(resolve, delay))

  console.log(`Retrying job creation for monitor ${monitor.id}, attempt ${attempt + 1}/${maxAttempts}`)

  const result = await createMonitoringJob(monitor)
  
  if (!result.success && result.retryable) {
    return await retryJobCreation(monitor, attempt + 1, maxAttempts)
  }

  return result
}

// Set up periodic cleanup of deduplication cache
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupDeduplicationCache, 5 * 60 * 1000) // Clean every 5 minutes
}
