/**
 * Queue adapter that switches between direct Redis and Upstash REST based on configuration
 */

import type { MonitoringJobData, JobCreationResult, BullMQJob } from '~/types/job-queue'
import type { MonitorRegion } from '~/types/monitor'
import { getSchedulerConfig } from '../config/scheduler-config'

// Import both queue implementations
import { getUpstashQueue, UpstashRestQueue } from './upstash-rest-queue'
import { getRedisDirectQueue, RedisDirectQueue } from './redis-direct-queue'

type QueueInstance = UpstashRestQueue | RedisDirectQueue

export interface QueueAdapter {
  addJob(jobId: string, jobData: MonitoringJobData): Promise<JobCreationResult>
  addBullMQJob?(job: BullMQJob): Promise<JobCreationResult>
  getNextJob(): Promise<any | null>
  completeJob(jobId: string): Promise<void>
  failJob(jobId: string, error: string): Promise<void>
  getMetrics(): Promise<any>
  isHealthy(): Promise<boolean>
}

/**
 * Get the appropriate queue instance based on Redis mode configuration
 */
export function getQueueInstance(queueName: string): QueueAdapter {
  const config = getSchedulerConfig()
  
  console.log(`Creating queue "${queueName}" with Redis mode: ${config.redis.mode}`)
  
  if (config.redis.mode === 'upstash') {
    console.log('Using Upstash REST queue')
    return getUpstashQueue(queueName)
  } else {
    console.log('Using direct Redis queue')
    return getRedisDirectQueue(queueName)
  }
}

/**
 * Create monitoring job using the configured queue type
 * @deprecated Use createMonitoringJob from job-creator.ts instead
 */
export async function createMonitoringJobAdapter(monitor: any): Promise<JobCreationResult> {
  try {
    // Import dynamic queue selection
    const { selectQueue, getRecommendedQueue } = await import('../scheduler/regional-router')
    
    // Use dynamic queue selection
    const queueResult = await selectQueue(monitor.preferred_region || 'us-east')
    const queue = getQueueInstance(queueResult.selectedQueue)
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

    console.log(`Creating job ${jobId} for monitor ${monitor.id} using queue ${queueResult.selectedQueue}`)
    return await queue.addJob(jobId, jobData)
  } catch (error) {
    // Use dynamic fallback queue
    const { getRecommendedQueue } = await import('../scheduler/regional-router')
    const fallbackQueue = await getRecommendedQueue()
    
    console.error('Failed to create monitoring job:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      queueName: fallbackQueue,
      retryable: true
    }
  }
}

/**
 * Test the queue connection based on current configuration
 */
export async function testQueueConnection(queueName: string = 'test-queue'): Promise<{ success: boolean, mode: string, error?: string }> {
  const config = getSchedulerConfig()
  
  try {
    const queue = getQueueInstance(queueName)
    const isHealthy = await queue.isHealthy()
    
    return {
      success: isHealthy,
      mode: config.redis.mode || 'direct'
    }
  } catch (error) {
    return {
      success: false,
      mode: config.redis.mode || 'direct',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}