import type { MonitorType, MonitorRegion } from './monitor'

/**
 * Job types for monitoring system
 */
export type JobType = 'HTTP_CHECK' | 'HTTPS_CHECK' | 'PING_CHECK' | 'SSL_CHECK'

/**
 * Job priority levels (for BullMQ spec compliance)
 */
export type BullMQJobPriority = 'low' | 'normal' | 'high' | 'urgent'

/**
 * Legacy job priority levels (keep for backward compatibility)
 */
export type JobPriority = 1 | 2 | 3 | 4 | 5 // 1 = highest, 5 = lowest

/**
 * Queue name - now dynamic, loaded from database
 */
export type QueueName = string

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
 * Worker queue configuration from database
 */
export interface WorkerQueue {
  id: string
  name: string
  region: MonitorRegion
  endpoint?: string
  isActive: boolean
  healthStatus: 'healthy' | 'unhealthy' | 'unknown'
  priority: number
  createdAt: string
  updatedAt: string
}

/**
 * Database record structure for worker_queues table
 */
export interface WorkerQueueRecord {
  id: string
  name: string
  region: MonitorRegion
  endpoint?: string
  is_active: boolean
  health_status: string
  priority: number
  created_at: string
  updated_at: string
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
 * Queue name mapping utility - now loaded dynamically from database
 * This constant is deprecated and will be removed in favor of database-driven mapping
 * @deprecated Use QueueService.getQueueByRegion() instead
 */

/**
 * Job type mapping from monitor type
 */
export const MONITOR_TYPE_TO_JOB_TYPE: Record<MonitorType, JobType> = {
  http: 'HTTP_CHECK',
  https: 'HTTPS_CHECK',
  ping: 'PING_CHECK',
  ssl: 'SSL_CHECK'
}

// ========================================
// BullMQ Specification-Compliant Types
// ========================================

/**
 * BullMQ Job Metadata (common to all job types)
 */
export interface BullMQJobMetadata {
  scheduledAt: string           // ISO 8601 timestamp
  region: MonitorRegion         // Execution region
  priority: BullMQJobPriority   // Job priority
  monitorName: string           // Human-readable name
  tags?: string[]               // Optional categorization tags
}

/**
 * Base interface for all BullMQ jobs
 */
export interface BaseBullMQJob {
  type: JobType
  jobId: string
  monitorId: string
  organizationId: string
  metadata: BullMQJobMetadata
}

/**
 * HTTP Check Job (BullMQ Spec Compliant)
 */
export interface HttpCheckJob extends BaseBullMQJob {
  type: 'HTTP_CHECK'
  config: {
    url: string
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD'
    headers?: Record<string, string>
    body?: string
    timeout: number
    followRedirects: boolean
    maxRedirects: number
    expectedStatusCodes: number[]
    validateSSL: boolean
    userAgent?: string
  }
}

/**
 * HTTPS Check Job (BullMQ Spec Compliant)
 */
export interface HttpsCheckJob extends BaseBullMQJob {
  type: 'HTTPS_CHECK'
  config: {
    url: string
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD'
    headers?: Record<string, string>
    body?: string
    timeout: number
    followRedirects: boolean
    maxRedirects: number
    expectedStatusCodes: number[]
    
    // SSL-Specific Configuration
    ssl: {
      validateCertificate: boolean
      validateHostname: boolean
      checkExpiry: boolean
      expiryWarningDays: number
      allowSelfSigned: boolean
      cipherSuites?: string[]
      tlsVersions: string[]
    }
    
    userAgent?: string
  }
}

/**
 * SSL Check Job (BullMQ Spec Compliant)
 */
export interface SslCheckJob extends BaseBullMQJob {
  type: 'SSL_CHECK'
  config: {
    hostname: string
    port: number
    timeout: number
    
    validation: {
      checkExpiry: boolean
      expiryWarningDays: number
      checkChain: boolean
      checkRevocation: boolean
      allowSelfSigned: boolean
      validateHostname: boolean
    }
    
    protocol: {
      tlsVersions: string[]
      cipherSuites?: string[]
      sni: boolean
    }
  }
}

/**
 * Ping Check Job (BullMQ Spec Compliant)
 */
export interface PingCheckJob extends BaseBullMQJob {
  type: 'PING_CHECK'
  config: {
    host: string
    timeout: number
    interval: number
    count: number
    packetSize: number
    ttl?: number
    
    thresholds: {
      maxLatency: number
      minSuccessRate: number
      maxPacketLoss: number
    }
  }
}

/**
 * Union type for all BullMQ job types
 */
export type BullMQJob = HttpCheckJob | HttpsCheckJob | SslCheckJob | PingCheckJob

/**
 * Helper to convert priority from legacy to BullMQ format
 */
export function convertPriorityToBullMQ(legacyPriority: JobPriority): BullMQJobPriority {
  switch (legacyPriority) {
    case 1: return 'urgent'
    case 2: return 'high'
    case 3: return 'normal'
    case 4: 
    case 5: return 'low'
    default: return 'normal'
  }
}

/**
 * Helper to convert monitor type to BullMQ job type
 */
export function getJobTypeFromMonitorType(monitorType: MonitorType): JobType {
  return MONITOR_TYPE_TO_JOB_TYPE[monitorType]
}
