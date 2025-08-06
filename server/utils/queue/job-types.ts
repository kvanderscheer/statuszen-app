/**
 * Job type definitions and interfaces
 *
 * This module handles:
 * - Job type mappings
 * - Job validation
 * - Job priority calculation
 */

import type { JobType, JobPriority, MonitoringJobData } from '~/types/job-queue'
import type { MonitorType } from '~/types/monitor'

/**
 * Convert monitor type to job type
 */
export function getJobType(monitorType: MonitorType): JobType {
  const typeMap: Record<MonitorType, JobType> = {
    'http': 'HTTP_CHECK',
    'https': 'HTTPS_CHECK',
    'ping': 'PING_CHECK',
    'ssl': 'SSL_CHECK'
  }

  const jobType = typeMap[monitorType]
  if (!jobType) {
    throw new Error(`Unknown monitor type: ${monitorType}`)
  }

  return jobType
}

/**
 * Calculate job priority based on monitor configuration
 */
export function calculateJobPriority(jobData: MonitoringJobData): JobPriority {
  // Priority calculation logic:
  // 1 = Critical/Highest Priority
  // 2 = High Priority  
  // 3 = Normal Priority (default)
  // 4 = Low Priority
  // 5 = Lowest Priority

  // Default priority
  let priority: JobPriority = 3

  // Higher priority for shorter check intervals (more critical)
  const intervalMinutes = jobData.config?.check_interval_minutes || 10
  if (intervalMinutes <= 1) {
    priority = 1 // Critical - every minute
  } else if (intervalMinutes <= 5) {
    priority = 2 // High - every 5 minutes or less
  } else if (intervalMinutes <= 15) {
    priority = 3 // Normal - every 15 minutes or less
  } else if (intervalMinutes <= 60) {
    priority = 4 // Low - hourly or less frequent
  } else {
    priority = 5 // Lowest - more than hourly
  }

  // Adjust for monitor type (SSL checks can be lower priority)
  if (jobData.type === 'ssl') {
    priority = Math.min(priority + 1, 5) as JobPriority
  }

  // Adjust for retry count (failed jobs get higher priority)
  const retryCount = jobData.retry_count || 0
  if (retryCount > 0) {
    priority = Math.max(priority - 1, 1) as JobPriority
  }

  return priority
}

/**
 * Validate job data structure
 */
export function validateJobData(jobData: MonitoringJobData): boolean {
  try {
    // Required fields
    if (!jobData.monitor_id || typeof jobData.monitor_id !== 'string') {
      console.error('Invalid monitor_id:', jobData.monitor_id)
      return false
    }

    if (!jobData.url || typeof jobData.url !== 'string') {
      console.error('Invalid url:', jobData.url)
      return false
    }

    if (!jobData.type) {
      console.error('Missing type:', jobData.type)
      return false
    }

    if (!jobData.organization_id || typeof jobData.organization_id !== 'string') {
      console.error('Invalid organization_id:', jobData.organization_id)
      return false
    }

    if (!jobData.scheduled_at || typeof jobData.scheduled_at !== 'string') {
      console.error('Invalid scheduled_at:', jobData.scheduled_at)
      return false
    }

    // Validate URL format
    try {
      new URL(jobData.url)
    } catch {
      console.error('Invalid URL format:', jobData.url)
      return false
    }

    // Validate scheduled_at is a valid ISO string
    try {
      new Date(jobData.scheduled_at)
    } catch {
      console.error('Invalid scheduled_at format:', jobData.scheduled_at)
      return false
    }

    // Validate optional fields if present
    if (jobData.timeout_seconds !== undefined) {
      if (typeof jobData.timeout_seconds !== 'number' || jobData.timeout_seconds <= 0) {
        console.error('Invalid timeout_seconds:', jobData.timeout_seconds)
        return false
      }
    }

    if (jobData.retry_count !== undefined) {
      if (typeof jobData.retry_count !== 'number' || jobData.retry_count < 0) {
        console.error('Invalid retry_count:', jobData.retry_count)
        return false
      }
    }

    // Validate config is an object
    if (jobData.config && typeof jobData.config !== 'object') {
      console.error('Invalid config - must be an object:', jobData.config)
      return false
    }

    return true
  } catch (error) {
    console.error('Job data validation error:', error)
    return false
  }
}

/**
 * Create job data from schedulable monitor
 */
export function createJobDataFromMonitor(monitor: any): MonitoringJobData {
  const now = new Date()
  
  return {
    monitor_id: monitor.id,
    url: monitor.url,
    type: monitor.type,
    config: {
      ...monitor.config,
      check_interval_minutes: monitor.check_interval_minutes,
      preferred_region: monitor.preferred_region
    },
    organization_id: monitor.organization_id,
    scheduled_at: now.toISOString(),
    timeout_seconds: monitor.config?.timeout || 30,
    retry_count: 0
  }
}

/**
 * Get default timeout for job type
 */
export function getDefaultTimeout(jobType: JobType): number {
  const timeouts: Record<JobType, number> = {
    'HTTP_CHECK': 30,
    'HTTPS_CHECK': 30,
    'PING_CHECK': 10,
    'SSL_CHECK': 15
  }

  return timeouts[jobType] || 30
}

/**
 * Check if job data needs deduplication
 */
export function needsDeduplication(jobData: MonitoringJobData, windowMinutes: number = 1): string {
  // Create deduplication key based on monitor ID and time window
  const now = new Date()
  const windowStart = new Date(now.getTime() - (windowMinutes * 60 * 1000))
  const timeWindow = Math.floor(windowStart.getTime() / (windowMinutes * 60 * 1000))
  
  return `${jobData.monitor_id}:${timeWindow}`
}

/**
 * Sanitize job data for logging (remove sensitive information)
 */
export function sanitizeJobDataForLogging(jobData: MonitoringJobData): any {
  const sanitized = { ...jobData }
  
  // Remove or mask sensitive data
  if (sanitized.config?.headers) {
    sanitized.config.headers = '[REDACTED]'
  }
  
  if (sanitized.config?.body) {
    sanitized.config.body = '[REDACTED]'
  }

  return sanitized
}
