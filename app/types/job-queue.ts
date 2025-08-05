import type { MonitorType, MonitorRegion } from './monitor'

/**
 * Job types for monitoring system
 */
export type JobType = 'HTTP_CHECK' | 'HTTPS_CHECK' | 'PING_CHECK' | 'SSL_CHECK'

/**
 * Job priority levels
 */
export type JobPriority = 1 | 2 | 3 | 4 | 5 // 1 = highest, 5 = lowest

/**
 * Regional queue names mapping
 */
export type QueueName = 'monitoring-us-east' | 'monitoring-eu-west'

/**
 * Job data structure for BullMQ
 */
export interface MonitoringJobData {
  monitor_id: string
  url: string
  type: MonitorType
  config: Record<string, any>
  organization_id: string
  scheduled_at: string
  timeout_seconds?: number
  retry_count?: number
}

/**
 * Job options for BullMQ
 */
export interface MonitoringJobOptions {
  jobId?: string
  priority?: JobPriority
  delay?: number
  attempts?: number
  backoff?: {
    type: 'exponential' | 'fixed'
    delay: number
  }
  removeOnComplete?: number | boolean
  removeOnFail?: number | boolean
  repeat?: {
    cron?: string
    every?: number
  }
}

/**
 * Complete job payload for queue
 */
export interface MonitoringJob {
  id: string
  type: JobType
  data: MonitoringJobData
  opts: MonitoringJobOptions
}

/**
 * Queue configuration
 */
export interface QueueConfig {
  name: QueueName
  region: MonitorRegion
  connection: {
    host: string
    port: number
    password?: string
    db?: number
    family?: 4 | 6
    keepAlive?: number
    lazyConnect?: boolean
  }
  defaultJobOptions: MonitoringJobOptions
  settings?: {
    stalledInterval?: number
    maxStalledCount?: number
    retryProcessDelay?: number
  }
}

/**
 * Job creation result
 */
export interface JobCreationResult {
  success: boolean
  jobId?: string
  queueName: QueueName
  error?: string
  retryable?: boolean
}

/**
 * Batch job creation result
 */
export interface BatchJobCreationResult {
  totalJobs: number
  successfulJobs: number
  failedJobs: number
  results: JobCreationResult[]
  duration: number
  queueDistribution: Record<QueueName, number>
}

/**
 * Queue health metrics
 */
export interface QueueMetrics {
  queueName: QueueName
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  paused: boolean
  processingRate: number
  completionRate: number
  failureRate: number
  averageProcessingTime: number
  lastUpdated: Date
}

/**
 * Job retry configuration
 */
export interface JobRetryConfig {
  attempts: number
  backoffType: 'exponential' | 'fixed'
  initialDelay: number
  maxDelay?: number
  factor?: number
}

/**
 * Regional load balancing configuration
 */
export interface LoadBalancingConfig {
  strategy: 'round_robin' | 'weighted' | 'least_connections' | 'random'
  weights?: Record<MonitorRegion, number>
  healthCheckInterval: number
  failoverThreshold: number
  recoveryThreshold: number
}

/**
 * Queue connection pool configuration
 */
export interface ConnectionPoolConfig {
  maxConnections: number
  minConnections: number
  acquireTimeoutMillis: number
  createTimeoutMillis: number
  destroyTimeoutMillis: number
  idleTimeoutMillis: number
  createRetryIntervalMillis: number
  maxRetries: number
}

/**
 * Job deduplication configuration
 */
export interface DeduplicationConfig {
  enabled: boolean
  windowMinutes: number
  keyStrategy: 'monitor_id' | 'monitor_id_and_config' | 'custom'
  customKeyFunction?: (data: MonitoringJobData) => string
}

/**
 * Queue monitoring and alerting configuration
 */
export interface QueueMonitoringConfig {
  enableMetrics: boolean
  metricsInterval: number
  alerting: {
    enabled: boolean
    failureThreshold: number
    latencyThreshold: number
    queueDepthThreshold: number
    webhookUrl?: string
    emailRecipients?: string[]
  }
}

/**
 * Regional queue routing result
 */
export interface QueueRoutingResult {
  selectedQueue: QueueName
  region: MonitorRegion
  isPreferred: boolean
  isFallback: boolean
  loadFactor: number
  healthScore: number
}

/**
 * Queue operation context
 */
export interface QueueOperationContext {
  operationId: string
  startTime: Date
  queueName: QueueName
  operationType: 'create_job' | 'batch_create' | 'health_check' | 'metrics'
  metadata?: Record<string, any>
}

/**
 * Default configurations
 */
export const DEFAULT_JOB_OPTIONS: MonitoringJobOptions = {
  priority: 3,
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000
  },
  removeOnComplete: 100,
  removeOnFail: 50
}

export const DEFAULT_RETRY_CONFIG: JobRetryConfig = {
  attempts: 3,
  backoffType: 'exponential',
  initialDelay: 1000,
  maxDelay: 30000,
  factor: 2
}

export const DEFAULT_LOAD_BALANCING_CONFIG: LoadBalancingConfig = {
  strategy: 'round_robin',
  healthCheckInterval: 30000, // 30 seconds
  failoverThreshold: 3,
  recoveryThreshold: 2
}

/**
 * Queue name mapping utility
 */
export const QUEUE_REGION_MAP: Record<MonitorRegion, QueueName> = {
  'us-east': 'monitoring-us-east',
  'us-west': 'monitoring-us-east', // Fallback to us-east for now
  'eu-west': 'monitoring-eu-west',
  'eu-central': 'monitoring-eu-west', // Fallback to eu-west
  'ap-south': 'monitoring-us-east', // Fallback to us-east
  'ap-southeast': 'monitoring-us-east' // Fallback to us-east
}

/**
 * Job type mapping from monitor type
 */
export const MONITOR_TYPE_TO_JOB_TYPE: Record<MonitorType, JobType> = {
  http: 'HTTP_CHECK',
  https: 'HTTPS_CHECK',
  ping: 'PING_CHECK',
  ssl: 'SSL_CHECK'
}
