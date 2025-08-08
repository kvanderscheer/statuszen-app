import { Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import type { ResultProcessorStats, ProcessorStatus } from '../../../app/types/results'
import { processMonitoringResult } from './result-processor'

/**
 * Results queue consumer using BullMQ Worker
 */
export class ResultsConsumer {
  private worker: Worker | null = null
  private redis: Redis | null = null
  private isRunning = false
  private startedAt: Date | null = null
  private connectionErrors = 0
  private lastConnectionAttempt = 0
  private connectionBackoffMs = 1000
  private circuitBreakerOpen = false
  private lastCircuitBreakerCheck = 0
  private consecutiveFailures = 0
  private stats: ResultProcessorStats = {
    totalProcessed: 0,
    successCount: 0,
    errorCount: 0,
    averageProcessingTime: 0,
    jobTypeStats: {
      HTTP_CHECK: { processed: 0, success: 0, errors: 0 },
      HTTPS_CHECK: { processed: 0, success: 0, errors: 0 },
      SSL_CHECK: { processed: 0, success: 0, errors: 0 },
      PING_CHECK: { processed: 0, success: 0, errors: 0 }
    },
    errorBreakdown: {},
    uptime: 0,
    isActive: false
  }
  private lastHeartbeat: Date | null = null
  private processingTimes: number[] = []
  
  constructor(
    private config: {
      queueName: string
      concurrency: number
      redisConfig: {
        host: string
        port: number
        password?: string
        db?: number
      }
    }
  ) {
    this.setupRedisConnection()
  }
  
  /**
   * Setup Redis connection using working BullMQ pattern
   */
  private setupRedisConnection(): void {
    // Use the same pattern as working BullMQ connection
    this.redis = new Redis(this.config.redisConfig)
    
    this.redis.on('connect', () => {
      console.info(`🔗 Redis connected successfully`)
    })
    
    this.redis.on('ready', () => {
      console.info(`✅ Redis ready for operations`)
    })
    
    this.redis.on('error', (error) => {
      this.connectionErrors++
      this.consecutiveFailures++
      console.error(`❌ Redis error (${this.connectionErrors}):`, error.message)
      
      // Check if we should open the circuit breaker
      this.checkCircuitBreaker()
      
      // Implement exponential backoff for reconnection
      if (this.connectionErrors > 5) {
        this.connectionBackoffMs = Math.min(this.connectionBackoffMs * 2, 30000)
        console.warn(`⏳ Connection backoff increased to ${this.connectionBackoffMs}ms`)
      }
    })
    
    this.redis.on('close', () => {
      this.consecutiveFailures++
      // Only log if circuit breaker is closed to avoid spam
      if (!this.circuitBreakerOpen) {
        console.warn(`⚠️ Redis connection closed`)
      }
      this.checkCircuitBreaker()
    })
    
    this.redis.on('reconnecting', (delay: number) => {
      // Only log if circuit breaker is closed to avoid spam
      if (!this.circuitBreakerOpen) {
        console.info(`🔄 Redis reconnecting in ${delay}ms...`)
      }
      this.lastConnectionAttempt = Date.now()
    })
    
    this.redis.on('end', () => {
      if (!this.circuitBreakerOpen) {
        console.warn(`🔌 Redis connection ended`)
      }
    })
    
    // Reset error counter on successful connection
    this.redis.on('ready', () => {
      this.connectionErrors = 0
      this.connectionBackoffMs = 1000
      this.consecutiveFailures = 0
      
      // Close circuit breaker if it was open
      if (this.circuitBreakerOpen) {
        console.info(`🔧 Circuit breaker closed - Redis connection stable`)
        this.circuitBreakerOpen = false
      }
    })
  }
  
  /**
   * Check if circuit breaker should be opened/closed
   */
  private checkCircuitBreaker(): void {
    const now = Date.now()
    const timeSinceLastCheck = now - this.lastCircuitBreakerCheck
    
    // Don't check too frequently
    if (timeSinceLastCheck < 5000) return
    
    this.lastCircuitBreakerCheck = now
    
    // Open circuit breaker if too many consecutive failures
    if (!this.circuitBreakerOpen && this.consecutiveFailures >= 10) {
      this.circuitBreakerOpen = true
      console.warn(`🚨 Circuit breaker opened - stopping BullMQ Worker due to connection instability (${this.consecutiveFailures} consecutive failures)`)
      this.stopWorkerSafely()
    }
  }
  
  /**
   * Safely stop the BullMQ Worker
   */
  private async stopWorkerSafely(): Promise<void> {
    if (this.worker) {
      try {
        console.info(`🔄 Gracefully stopping BullMQ Worker...`)
        await this.worker.close()
        this.worker = null
        this.isRunning = false
        this.stats.isActive = false
        console.info(`✅ BullMQ Worker stopped successfully`)
      } catch (error) {
        console.error(`❌ Error stopping BullMQ Worker:`, error)
        this.worker = null
        this.isRunning = false
        this.stats.isActive = false
      }
    }
  }
  
  /**
   * Attempt to restart when circuit breaker closes
   */
  async attemptRestart(): Promise<boolean> {
    if (this.circuitBreakerOpen || this.isRunning) {
      return false
    }
    
    try {
      console.info(`🔄 Attempting to restart results consumer...`)
      await this.start()
      return true
    } catch (error) {
      console.error(`❌ Failed to restart results consumer:`, error)
      return false
    }
  }
  
  /**
   * Start the results consumer
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('⚠️ Results consumer is already running')
      return
    }
    
    // Check circuit breaker before starting
    if (this.circuitBreakerOpen) {
      console.warn('🚨 Circuit breaker is open - not starting BullMQ Worker')
      this.isRunning = false
      this.stats.isActive = false
      return
    }
    
    try {
      if (!this.redis) {
        throw new Error('Redis connection not established')
      }
      
      // Create BullMQ Worker using the Redis client directly (like working pattern)
      this.worker = new Worker(
        this.config.queueName,
        async (job: Job) => await this.processJob(job),
        {
          connection: this.redis, // Pass the Redis client directly
          concurrency: this.config.concurrency,
          removeOnComplete: { age: 24 * 3600, count: 100 }, // Keep 100 jobs for 24 hours
          removeOnFail: { age: 24 * 3600, count: 50 } // Keep 50 failed jobs for 24 hours
        }
      )
      
      // Setup event listeners
      this.setupEventListeners()
      
      this.isRunning = true
      this.startedAt = new Date()
      this.stats.isActive = true
      
      console.info(`🚀 Results consumer started with ${this.config.concurrency} workers`)
      
    } catch (error) {
      console.error(`💥 Failed to start results consumer:`, error)
      throw error
    }
  }
  
  /**
   * Stop the results consumer
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.warn('⚠️ Results consumer is not running')
      return
    }
    
    try {
      console.info('🛑 Stopping results consumer...')
      
      if (this.worker) {
        await this.worker.close()
        this.worker = null
      }
      
      if (this.redis) {
        await this.redis.quit()
        this.redis = null
      }
      
      this.isRunning = false
      this.stats.isActive = false
      
      console.info('✅ Results consumer stopped successfully')
      
    } catch (error) {
      console.error(`💥 Error stopping results consumer:`, error)
      throw error
    }
  }
  
  /**
   * Process a single job from the queue
   */
  private async processJob(job: Job): Promise<void> {
    const startTime = Date.now()
    this.lastHeartbeat = new Date()
    
    try {
      console.info(`🔄 Processing job ${job.id} of type ${job.data.jobType || 'unknown'}`)
      
      // Extract monitoring result from job data
      const monitoringResult = job.data
      
      // Process the result
      const processingResult = await processMonitoringResult(monitoringResult, {
        jobId: job.id || 'unknown',
        attemptNumber: job.attemptsMade + 1,
        startTime,
        workerId: `worker-${process.pid}`,
        metadata: {
          queueName: this.config.queueName,
          processorVersion: '1.0.0'
        }
      })
      
      // Update statistics
      this.updateStats(processingResult, monitoringResult.jobType, Date.now() - startTime)
      
      if (processingResult.success) {
        console.info(`✅ Successfully processed job ${job.id} in ${Date.now() - startTime}ms`)
      } else {
        console.error(`❌ Failed to process job ${job.id}:`, processingResult.errors)
        throw new Error(`Processing failed: ${processingResult.errors?.[0]?.message || 'Unknown error'}`)
      }
      
    } catch (error) {
      const processingTime = Date.now() - startTime
      console.error(`💥 Job ${job.id} processing failed after ${processingTime}ms:`, error)
      
      // Update error statistics
      this.updateStats({ 
        success: false, 
        errors: [{ field: 'processing', message: error instanceof Error ? error.message : String(error) }],
        processingTime
      }, job.data.jobType || 'unknown', processingTime)
      
      throw error // Re-throw to trigger BullMQ retry logic
    }
  }
  
  /**
   * Setup event listeners for the worker
   */
  private setupEventListeners(): void {
    if (!this.worker) return
    
    this.worker.on('ready', () => {
      console.info('📋 Results worker ready to process jobs')
    })
    
    this.worker.on('active', (job) => {
      console.info(`⚡ Processing job ${job.id} (${job.data.jobType})`)
    })
    
    this.worker.on('completed', (job) => {
      console.info(`✅ Job ${job.id} completed successfully`)
    })
    
    this.worker.on('failed', (job, error) => {
      console.error(`❌ Job ${job?.id} failed:`, error.message)
    })
    
    this.worker.on('stalled', (jobId) => {
      console.warn(`⏰ Job ${jobId} stalled`)
    })
    
    this.worker.on('error', (error) => {
      console.error(`💥 Worker error:`, error)
      
      // Handle connection reset errors
      if (error.message.includes('ECONNRESET') || error.message.includes('Connection lost')) {
        console.warn(`🔄 Connection reset detected, worker will automatically reconnect`)
      }
    })
    
    this.worker.on('closing', () => {
      console.info('🔄 Worker is closing')
    })
    
    this.worker.on('closed', () => {
      console.info('🛑 Worker closed')
    })
  }
  
  /**
   * Update processing statistics
   */
  private updateStats(
    processingResult: any,
    jobType: string,
    processingTime: number
  ): void {
    this.stats.totalProcessed++
    
    if (processingResult.success) {
      this.stats.successCount++
      if (jobType in this.stats.jobTypeStats) {
        this.stats.jobTypeStats[jobType as keyof typeof this.stats.jobTypeStats].success++
      }
    } else {
      this.stats.errorCount++
      if (jobType in this.stats.jobTypeStats) {
        this.stats.jobTypeStats[jobType as keyof typeof this.stats.jobTypeStats].errors++
      }
      
      // Update error breakdown
      if (processingResult.errors) {
        processingResult.errors.forEach((error: any) => {
          this.stats.errorBreakdown[error.field] = (this.stats.errorBreakdown[error.field] || 0) + 1
        })
      }
    }
    
    // Update job type stats
    if (jobType in this.stats.jobTypeStats) {
      this.stats.jobTypeStats[jobType as keyof typeof this.stats.jobTypeStats].processed++
    }
    
    // Update processing times (keep last 1000 for average calculation)
    this.processingTimes.push(processingTime)
    if (this.processingTimes.length > 1000) {
      this.processingTimes.shift()
    }
    
    // Calculate average processing time
    this.stats.averageProcessingTime = this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length
    
    // Update uptime
    if (this.startedAt) {
      this.stats.uptime = Date.now() - this.startedAt.getTime()
    }
    
    // Update last processed timestamp
    this.stats.lastProcessedAt = new Date().toISOString()
  }
  
  /**
   * Get current processor statistics
   */
  getStats(): ResultProcessorStats {
    return { ...this.stats }
  }
  
  /**
   * Get current processor status
   */
  async getStatus(): Promise<ProcessorStatus> {
    let queueStats = {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0
    }
    
    // Get queue stats if redis connection is available
    if (this.redis && this.isRunning && !this.circuitBreakerOpen) {
      try {
        // Check if keys exist and have correct types before querying
        const waitKey = `bull:${this.config.queueName}:wait`
        const activeKey = `bull:${this.config.queueName}:active`
        const completedKey = `bull:${this.config.queueName}:completed`
        const failedKey = `bull:${this.config.queueName}:failed`
        
        // Use TYPE command to verify key types, default to 0 if wrong type or missing
        const [waitType, activeType, completedType, failedType] = await Promise.all([
          this.redis.type(waitKey),
          this.redis.type(activeKey), 
          this.redis.type(completedKey),
          this.redis.type(failedKey)
        ])
        
        const waiting = (waitType === 'list') ? await this.redis.llen(waitKey) : 0
        const active = (activeType === 'list') ? await this.redis.llen(activeKey) : 0
        const completed = (completedType === 'set') ? await this.redis.scard(completedKey) : 0
        const failed = (failedType === 'set') ? await this.redis.scard(failedKey) : 0
        
        queueStats = { waiting, active, completed, failed }
      } catch (error) {
        console.error('Failed to get queue stats:', error)
        // Keep default queueStats if Redis operations fail
      }
    }
    
    // Calculate error rate (last hour)
    const errorRate = this.stats.totalProcessed > 0 
      ? (this.stats.errorCount / this.stats.totalProcessed) * 100 
      : 0
    
    // Calculate throughput (jobs per minute)
    const uptimeMinutes = this.stats.uptime > 0 ? this.stats.uptime / (1000 * 60) : 1
    const throughput = this.stats.totalProcessed / uptimeMinutes
    
    return {
      isRunning: this.isRunning,
      isHealthy: this.isRunning && !this.circuitBreakerOpen && this.worker !== null,
      startedAt: this.startedAt?.toISOString(),
      lastHeartbeat: this.lastHeartbeat?.toISOString(),
      currentJobs: queueStats.active,
      queueStats,
      errorRate,
      throughput,
      circuitBreakerOpen: this.circuitBreakerOpen,
      consecutiveFailures: this.consecutiveFailures,
      connectionErrors: this.connectionErrors
    }
  }
  
  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalProcessed: 0,
      successCount: 0,
      errorCount: 0,
      averageProcessingTime: 0,
      jobTypeStats: {
        HTTP_CHECK: { processed: 0, success: 0, errors: 0 },
        HTTPS_CHECK: { processed: 0, success: 0, errors: 0 },
        SSL_CHECK: { processed: 0, success: 0, errors: 0 },
        PING_CHECK: { processed: 0, success: 0, errors: 0 }
      },
      errorBreakdown: {},
      uptime: this.startedAt ? Date.now() - this.startedAt.getTime() : 0,
      isActive: this.isRunning
    }
    this.processingTimes = []
    console.info('📊 Results processor statistics reset')
  }
  
  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      const status = await this.getStatus()
      const isHealthy = status.isRunning && status.isHealthy
      
      return {
        healthy: isHealthy,
        details: {
          status,
          stats: this.getStats(),
          lastError: this.getLastError()
        }
      }
    } catch (error) {
      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }
  }
  
  /**
   * Get last error from statistics
   */
  private getLastError(): string | null {
    const errors = Object.keys(this.stats.errorBreakdown)
    if (errors.length > 0) {
      const lastError = errors.reduce((a, b) => 
        this.stats.errorBreakdown[a] > this.stats.errorBreakdown[b] ? a : b
      )
      return `${lastError} (${this.stats.errorBreakdown[lastError]} occurrences)`
    }
    return null
  }
}

// Global instance
let globalConsumer: ResultsConsumer | null = null

/**
 * Initialize global results consumer
 */
export function initializeResultsConsumer(): ResultsConsumer {
  if (globalConsumer) {
    return globalConsumer
  }
  
  // Use the same configuration pattern as working scheduler
  const redisConfig: any = {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    username: process.env.REDIS_USERNAME || undefined,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    mode: (process.env.REDIS_MODE as 'direct' | 'upstash') || 'direct'
  }

  if (!redisConfig.url || redisConfig.url === 'redis://localhost:6379') {
    throw new Error('REDIS_URL environment variable is required')
  }
  
  console.info(`🔗 Using Redis URL: ${redisConfig.url.substring(0, 20)}...`)
  
  // Parse Redis URL for ioredis configuration
  const url = new URL(redisConfig.url)
  const ioredisConfig: any = {
    host: url.hostname,
    port: parseInt(url.port) || 6379,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,  // BullMQ Worker requires null for blocking operations
  }

  // Extract credentials from URL or environment variables
  if (url.username) {
    ioredisConfig.username = url.username
  } else if (redisConfig.username) {
    ioredisConfig.username = redisConfig.username
  }
  
  if (url.password) {
    ioredisConfig.password = url.password
  } else if (redisConfig.password) {
    ioredisConfig.password = redisConfig.password
  }

  // Database from URL path or environment variable
  if (url.pathname && url.pathname.length > 1) {
    ioredisConfig.db = parseInt(url.pathname.substring(1), 10) || 0
  } else {
    ioredisConfig.db = redisConfig.db
  }

  // TLS Configuration for Upstash (CRITICAL!)
  if (url.protocol === 'rediss:') {
    ioredisConfig.tls = {
      rejectUnauthorized: false  // Required for Upstash TLS
    }
  }

  console.info(`🔧 Redis config: host=${ioredisConfig.host}, port=${ioredisConfig.port}, username=${ioredisConfig.username ? 'SET' : 'NOT_SET'}, password=${ioredisConfig.password ? 'SET' : 'NOT_SET'}, tls=${ioredisConfig.tls ? 'ENABLED' : 'DISABLED'}`)
  
  const config = {
    queueName: 'results',  // Match the queue name where jobs are being sent
    concurrency: parseInt(process.env.RESULTS_QUEUE_CONCURRENCY || '5'), // Match working BullMQ setup
    redisConfig: ioredisConfig
  }
  
  globalConsumer = new ResultsConsumer(config)
  return globalConsumer
}

/**
 * Get global results consumer instance
 */
export function getResultsConsumer(): ResultsConsumer | null {
  return globalConsumer
}

/**
 * Start global results consumer
 */
export async function startResultsConsumer(): Promise<void> {
  const consumer = initializeResultsConsumer()
  await consumer.start()
}

/**
 * Stop global results consumer
 */
export async function stopResultsConsumer(): Promise<void> {
  if (globalConsumer) {
    await globalConsumer.stop()
    globalConsumer = null
  }
}