/**
 * Upstash REST API-based queue implementation
 * Alternative to BullMQ for REST-only Redis instances
 */

import type { MonitoringJobData, JobCreationResult, BatchJobCreationResult } from '~/types/job-queue'
import type { MonitorRegion } from '~/types/monitor'

export interface UpstashRestConfig {
  restUrl: string
  restToken: string
}

export class UpstashRestQueue {
  private restUrl: string
  private restToken: string
  private queueName: string

  constructor(queueName: string, config: UpstashRestConfig) {
    this.queueName = queueName
    this.restUrl = config.restUrl
    this.restToken = config.restToken
  }

  private get headers() {
    return {
      'Authorization': `Bearer ${this.restToken}`,
      'Content-Type': 'application/json'
    }
  }

  private async request(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: any) {
    const url = `${this.restUrl}${endpoint}`
    const options: RequestInit = {
      method,
      headers: this.headers
    }

    if (body && method === 'POST') {
      options.body = typeof body === 'string' ? body : JSON.stringify(body)
    }

    const response = await fetch(url, options)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Upstash REST API error: ${response.status} ${response.statusText}`, errorText)
      throw new Error(`Upstash REST API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return response.json()
  }

  /**
   * Execute a raw Redis command
   */
  private async executeCommand(command: string, ...args: any[]) {
    try {
      const response = await fetch(`${this.restUrl}/pipeline`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify([[command, ...args]])
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Command execution error: ${response.status} ${response.statusText}`, errorText)
        throw new Error(`Command execution error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      return result[0] // Pipeline returns array, we want first result
    } catch (error) {
      console.error('Execute command error:', error)
      throw error
    }
  }

  /**
   * Add a job to the queue
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
      const commands = [
        ['LPUSH', this.queueName, JSON.stringify(job)],
        ['HSET', `job:${jobId}`, 'data', JSON.stringify(job)],
        ['HSET', `job:${jobId}`, 'queueName', this.queueName],
        ['HSET', `job:${jobId}`, 'status', 'waiting']
      ]

      const response = await fetch(`${this.restUrl}/pipeline`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(commands)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Pipeline execution failed: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const results = await response.json()
      console.log('Pipeline results:', results)

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
   * Get the next job from the queue
   */
  async getNextJob(): Promise<any | null> {
    try {
      // Use RPOP to get the next job from the end of the list
      const result = await this.executeCommand('RPOP', this.queueName)
      
      if (!result || !result.result) {
        return null
      }

      const job = JSON.parse(result.result)
      
      // Update job status
      await this.executeCommand('HSET', `job:${job.id}`, 'status', 'active', 'processedAt', new Date().toISOString())

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
      const commands = [
        ['HSET', `job:${jobId}`, 'status', 'completed', 'completedAt', new Date().toISOString()],
        ['LPUSH', `${this.queueName}:completed`, jobId],
        ['EXPIRE', `job:${jobId}`, '3600'] // 1 hour TTL
      ]

      const response = await fetch(`${this.restUrl}/pipeline`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(commands)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Complete job failed: ${response.status} ${response.statusText} - ${errorText}`)
      }

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
      const commands = [
        ['HSET', `job:${jobId}`, 'status', 'failed', 'failedAt', new Date().toISOString(), 'error', error],
        ['LPUSH', `${this.queueName}:failed`, jobId]
      ]

      const response = await fetch(`${this.restUrl}/pipeline`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(commands)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Fail job error: ${response.status} ${response.statusText} - ${errorText}`)
      }
    } catch (err) {
      console.error('Error failing job:', err)
    }
  }

  /**
   * Get queue metrics
   */
  async getMetrics() {
    try {
      const commands = [
        ['LLEN', this.queueName],
        ['LLEN', `${this.queueName}:completed`],
        ['LLEN', `${this.queueName}:failed`]
      ]

      const response = await fetch(`${this.restUrl}/pipeline`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(commands)
      })

      let waiting = 0, completed = 0, failed = 0

      if (response.ok) {
        const results = await response.json()
        waiting = results[0]?.result || 0
        completed = results[1]?.result || 0
        failed = results[2]?.result || 0
      }

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
      await this.request('/ping')
      return true
    } catch {
      return false
    }
  }
}

// Queue instances
const queues = new Map<string, UpstashRestQueue>()

/**
 * Get or create queue instance
 */
export function getUpstashQueue(queueName: string): UpstashRestQueue {
  if (!queues.has(queueName)) {
    const config = {
      restUrl: process.env.UPSTASH_REDIS_REST_URL!,
      restToken: process.env.UPSTASH_REDIS_REST_TOKEN!
    }
    
    const queue = new UpstashRestQueue(queueName, config)
    queues.set(queueName, queue)
  }
  
  return queues.get(queueName)!
}

/**
 * Create monitoring job using REST queue
 */
export async function createMonitoringJobRest(monitor: any): Promise<JobCreationResult> {
  try {
    const queueName = monitor.preferred_region === 'eu-west' 
      ? 'monitoring-eu-west' 
      : 'monitoring-us-east'
    
    const queue = getUpstashQueue(queueName)
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
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      queueName: 'monitoring-us-east' as any,
      retryable: true
    }
  }
}