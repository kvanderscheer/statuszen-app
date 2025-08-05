import type { MonitorType, MonitorRegion } from './monitor'

/**
 * Scheduling operation result
 */
export interface SchedulingResult {
  success: boolean
  processedCount: number
  failedCount: number
  duration: number
  errors: SchedulingError[]
  timestamp: string
}

/**
 * Scheduling error with context
 */
export interface SchedulingError {
  monitorId?: string
  error: string
  code: SchedulingErrorCode
  context?: Record<string, any>
}

/**
 * Scheduling error codes
 */
export type SchedulingErrorCode
  = | 'DATABASE_CONNECTION_FAILED'
    | 'REDIS_CONNECTION_FAILED'
    | 'MONITOR_QUERY_FAILED'
    | 'JOB_CREATION_FAILED'
    | 'QUEUE_UNAVAILABLE'
    | 'INVALID_MONITOR_DATA'
    | 'TIMEOUT_EXCEEDED'
    | 'REGION_UNAVAILABLE'
    | 'DEDUPLICATION_FAILED'
    | 'TIMESTAMP_UPDATE_FAILED'

/**
 * Monitor scheduling data from database
 */
export interface SchedulableMonitor {
  id: string
  organization_id: string
  name: string
  url: string
  type: MonitorType
  config: Record<string, any>
  check_interval_minutes: number
  preferred_region: MonitorRegion
  last_scheduled_at?: string
  next_check_at: string
  is_active: boolean
}

/**
 * Calculated scheduling timestamps
 */
export interface SchedulingTimestamps {
  last_scheduled_at: string
  next_check_at: string
}

/**
 * Scheduling cycle configuration
 */
export interface SchedulingConfig {
  maxMonitorsPerCycle: number
  timeoutSeconds: number
  batchSize: number
  retryAttempts: number
  retryDelayMs: number
  enableCircuitBreaker: boolean
  circuitBreakerThreshold: number
  circuitBreakerTimeoutMs: number
}

/**
 * Scheduling metrics for monitoring
 */
export interface SchedulingMetrics {
  cycleStartTime: Date
  cycleEndTime?: Date
  totalMonitors: number
  processedMonitors: number
  failedMonitors: number
  skippedMonitors: number
  jobsCreated: number
  jobsFailedCreation: number
  averageProcessingTime: number
  queueDistribution: Record<string, number>
  errors: SchedulingError[]
}

/**
 * Regional queue health status
 */
export interface QueueHealthStatus {
  region: MonitorRegion
  queueName: string
  isHealthy: boolean
  lastChecked: Date
  responseTime?: number
  errorCount: number
  consecutiveFailures: number
}

/**
 * Circuit breaker state
 */
export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
  failureCount: number
  lastFailureTime?: Date
  nextAttemptTime?: Date
}

/**
 * Scheduling context for error handling and logging
 */
export interface SchedulingContext {
  requestId: string
  startTime: Date
  config: SchedulingConfig
  metrics: SchedulingMetrics
  queueHealth: Record<string, QueueHealthStatus>
  circuitBreakers: Record<string, CircuitBreakerState>
}

/**
 * Database query filters for monitors
 */
export interface MonitorQueryFilters {
  organizationIds?: string[]
  regions?: MonitorRegion[]
  types?: MonitorType[]
  maxResults?: number
  beforeTime?: Date
}

/**
 * Batch update operation for monitor timestamps
 */
export interface MonitorTimestampUpdate {
  monitorId: string
  timestamps: SchedulingTimestamps
}

/**
 * Scheduling operation statistics
 */
export interface SchedulingStats {
  totalCycles: number
  successfulCycles: number
  failedCycles: number
  averageCycleDuration: number
  averageMonitorsPerCycle: number
  totalMonitorsProcessed: number
  totalJobsCreated: number
  lastSuccessfulCycle?: Date
  lastFailedCycle?: Date
  uptimePercentage: number
}
