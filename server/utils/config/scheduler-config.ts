import type { LoadBalancingConfig, JobRetryConfig, DeduplicationConfig } from '~/types/job-queue'
import type { SchedulingConfig } from '~/types/scheduler'

/**
 * Environment configuration for job scheduler
 */
export interface SchedulerEnvConfig {
  redis: {
    url: string
    password?: string
    db: number
  }
  scheduler: SchedulingConfig
  queues: {
    usEastName: string
    euWestName: string
    defaultRegion: string
  }
  jobs: {
    defaultAttempts: number
    backoffType: 'exponential' | 'fixed'
    backoffDelay: number
    removeOnComplete: number
    removeOnFail: number
  }
  cron: {
    secret: string
  }
  monitoring: {
    logLevel: string
    enableMetrics: boolean
    metricsInterval: number
  }
}

/**
 * Get scheduler configuration from environment variables
 */
export function getSchedulerConfig(): SchedulerEnvConfig {
  const config: SchedulerEnvConfig = {
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0', 10)
    },
    scheduler: {
      maxMonitorsPerCycle: parseInt(process.env.SCHEDULER_MAX_MONITORS_PER_CYCLE || '1000', 10),
      timeoutSeconds: parseInt(process.env.SCHEDULER_TIMEOUT_SECONDS || '45', 10),
      batchSize: parseInt(process.env.SCHEDULER_BATCH_SIZE || '50', 10),
      retryAttempts: parseInt(process.env.SCHEDULER_RETRY_ATTEMPTS || '3', 10),
      retryDelayMs: parseInt(process.env.SCHEDULER_RETRY_DELAY_MS || '2000', 10),
      enableCircuitBreaker: process.env.SCHEDULER_ENABLE_CIRCUIT_BREAKER === 'true',
      circuitBreakerThreshold: parseInt(process.env.SCHEDULER_CIRCUIT_BREAKER_THRESHOLD || '5', 10),
      circuitBreakerTimeoutMs: parseInt(process.env.SCHEDULER_CIRCUIT_BREAKER_TIMEOUT_MS || '60000', 10)
    },
    queues: {
      usEastName: process.env.QUEUE_US_EAST_NAME || 'monitoring-us-east',
      euWestName: process.env.QUEUE_EU_WEST_NAME || 'monitoring-eu-west',
      defaultRegion: process.env.QUEUE_DEFAULT_REGION || 'us-east'
    },
    jobs: {
      defaultAttempts: parseInt(process.env.JOB_DEFAULT_ATTEMPTS || '3', 10),
      backoffType: (process.env.JOB_BACKOFF_TYPE as 'exponential' | 'fixed') || 'exponential',
      backoffDelay: parseInt(process.env.JOB_BACKOFF_DELAY || '2000', 10),
      removeOnComplete: parseInt(process.env.JOB_REMOVE_ON_COMPLETE || '100', 10),
      removeOnFail: parseInt(process.env.JOB_REMOVE_ON_FAIL || '50', 10)
    },
    cron: {
      secret: process.env.CRON_SECRET || ''
    },
    monitoring: {
      logLevel: process.env.SCHEDULER_LOG_LEVEL || 'info',
      enableMetrics: process.env.SCHEDULER_ENABLE_METRICS === 'true',
      metricsInterval: parseInt(process.env.SCHEDULER_METRICS_INTERVAL || '30000', 10)
    }
  }

  // Validate required configuration
  validateSchedulerConfig(config)

  return config
}

/**
 * Validate scheduler configuration
 */
function validateSchedulerConfig(config: SchedulerEnvConfig): void {
  const errors: string[] = []

  // Redis validation
  if (!config.redis.url) {
    errors.push('REDIS_URL is required')
  }

  // Scheduler validation
  if (config.scheduler.maxMonitorsPerCycle <= 0) {
    errors.push('SCHEDULER_MAX_MONITORS_PER_CYCLE must be greater than 0')
  }

  if (config.scheduler.timeoutSeconds <= 0 || config.scheduler.timeoutSeconds > 60) {
    errors.push('SCHEDULER_TIMEOUT_SECONDS must be between 1 and 60')
  }

  if (config.scheduler.batchSize <= 0) {
    errors.push('SCHEDULER_BATCH_SIZE must be greater than 0')
  }

  // Queue validation
  if (!config.queues.usEastName) {
    errors.push('QUEUE_US_EAST_NAME is required')
  }

  if (!config.queues.euWestName) {
    errors.push('QUEUE_EU_WEST_NAME is required')
  }

  // Job validation
  if (config.jobs.defaultAttempts <= 0) {
    errors.push('JOB_DEFAULT_ATTEMPTS must be greater than 0')
  }

  if (!['exponential', 'fixed'].includes(config.jobs.backoffType)) {
    errors.push('JOB_BACKOFF_TYPE must be either "exponential" or "fixed"')
  }

  // Cron validation
  if (!config.cron.secret) {
    errors.push('CRON_SECRET is required for security')
  }

  if (errors.length > 0) {
    throw new Error(`Scheduler configuration validation failed:\n${errors.join('\n')}`)
  }
}

/**
 * Get default job retry configuration
 */
export function getDefaultJobRetryConfig(): JobRetryConfig {
  const config = getSchedulerConfig()

  return {
    attempts: config.jobs.defaultAttempts,
    backoffType: config.jobs.backoffType,
    initialDelay: config.jobs.backoffDelay,
    maxDelay: config.jobs.backoffDelay * 10,
    factor: 2
  }
}

/**
 * Get default load balancing configuration
 */
export function getDefaultLoadBalancingConfig(): LoadBalancingConfig {
  return {
    strategy: 'round_robin',
    healthCheckInterval: 30000,
    failoverThreshold: 3,
    recoveryThreshold: 2
  }
}

/**
 * Get default deduplication configuration
 */
export function getDefaultDeduplicationConfig(): DeduplicationConfig {
  return {
    enabled: true,
    windowMinutes: 1,
    keyStrategy: 'monitor_id'
  }
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

/**
 * Get Redis connection URL with proper formatting
 */
export function getRedisConnectionUrl(): string {
  const config = getSchedulerConfig()
  const url = new URL(config.redis.url)

  if (config.redis.password) {
    url.password = config.redis.password
  }

  if (config.redis.db !== 0) {
    url.pathname = `/${config.redis.db}`
  }

  return url.toString()
}
