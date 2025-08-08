/**
 * BullMQ Specification-Compliant Job Factory
 * Creates jobs that match the exact BullMQ message specification
 */

import type { 
  BullMQJob, 
  HttpCheckJob, 
  HttpsCheckJob, 
  SslCheckJob, 
  PingCheckJob,
  BullMQJobMetadata,
  BullMQJobPriority,
  JobType,
  convertPriorityToBullMQ,
  getJobTypeFromMonitorType
} from '~/types/job-queue'
import type { SchedulableMonitor } from '~/types/scheduler'
import type { MonitorType } from '~/types/monitor'

/**
 * Generate unique BullMQ-compliant job ID
 */
export function generateBullMQJobId(monitorId: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `job_${monitorId}_${timestamp}_${random}`
}

/**
 * Create BullMQ job metadata from monitor
 */
export function createJobMetadata(monitor: SchedulableMonitor): BullMQJobMetadata {
  // Convert check interval to priority
  let priority: BullMQJobPriority = 'normal'
  if (monitor.check_interval_minutes <= 1) {
    priority = 'urgent'
  } else if (monitor.check_interval_minutes <= 5) {
    priority = 'high'
  } else if (monitor.check_interval_minutes >= 60) {
    priority = 'low'
  }

  return {
    scheduledAt: new Date().toISOString(),
    region: monitor.preferred_region,
    priority,
    monitorName: monitor.name,
    tags: [] // Could be populated from monitor tags if available
  }
}

/**
 * Create HTTP Check Job (BullMQ Spec)
 */
export function createHttpCheckJob(monitor: SchedulableMonitor): HttpCheckJob {
  const jobId = generateBullMQJobId(monitor.id)
  const metadata = createJobMetadata(monitor)

  return {
    type: 'HTTP_CHECK',
    jobId,
    monitorId: monitor.id,
    organizationId: monitor.organization_id,
    config: {
      url: monitor.url,
      method: monitor.config?.method || 'GET',
      headers: monitor.config?.headers || {
        'User-Agent': 'StatusZen Monitor/1.0',
        'Accept': '*/*'
      },
      body: monitor.config?.body || undefined,
      timeout: (monitor.config?.timeout || 30) * 1000, // Convert to milliseconds
      followRedirects: monitor.config?.followRedirects !== false,
      maxRedirects: monitor.config?.maxRedirects || 5,
      expectedStatusCodes: monitor.config?.expectedStatus ? [monitor.config.expectedStatus] : [200],
      validateSSL: monitor.config?.validateSSL !== false,
      userAgent: monitor.config?.userAgent || 'StatusZen Monitor/1.0'
    },
    metadata
  }
}

/**
 * Create HTTPS Check Job (BullMQ Spec)
 */
export function createHttpsCheckJob(monitor: SchedulableMonitor): HttpsCheckJob {
  const jobId = generateBullMQJobId(monitor.id)
  const metadata = createJobMetadata(monitor)

  return {
    type: 'HTTPS_CHECK',
    jobId,
    monitorId: monitor.id,
    organizationId: monitor.organization_id,
    config: {
      url: monitor.url,
      method: monitor.config?.method || 'GET',
      headers: monitor.config?.headers || {
        'User-Agent': 'StatusZen Monitor/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache'
      },
      body: monitor.config?.body || undefined,
      timeout: (monitor.config?.timeout || 30) * 1000, // Convert to milliseconds
      followRedirects: monitor.config?.followRedirects !== false,
      maxRedirects: monitor.config?.maxRedirects || 3,
      expectedStatusCodes: monitor.config?.expectedStatus ? [monitor.config.expectedStatus] : [200],
      
      // SSL-Specific Configuration (matching BullMQ spec)
      ssl: {
        validateCertificate: monitor.config?.validateSSL !== false,
        validateHostname: monitor.config?.validateHostname !== false,
        checkExpiry: monitor.config?.sslExpiry !== false,
        expiryWarningDays: monitor.config?.sslExpiryDays || 30,
        allowSelfSigned: monitor.config?.allowSelfSigned === true,
        cipherSuites: monitor.config?.cipherSuites, // Optional
        tlsVersions: monitor.config?.tlsVersions || ['TLSv1.2', 'TLSv1.3']
      },
      
      userAgent: monitor.config?.userAgent || 'StatusZen Monitor/1.0'
    },
    metadata
  }
}

/**
 * Create SSL Check Job (BullMQ Spec)
 */
export function createSslCheckJob(monitor: SchedulableMonitor): SslCheckJob {
  const jobId = generateBullMQJobId(monitor.id)
  const metadata = createJobMetadata(monitor)
  
  // Extract hostname and port from URL
  const url = new URL(monitor.url)
  const hostname = url.hostname
  const port = parseInt(url.port) || 443

  return {
    type: 'SSL_CHECK',
    jobId,
    monitorId: monitor.id,
    organizationId: monitor.organization_id,
    config: {
      hostname,
      port,
      timeout: (monitor.config?.timeout || 15) * 1000, // Convert to milliseconds
      
      validation: {
        checkExpiry: monitor.config?.sslExpiry !== false,
        expiryWarningDays: monitor.config?.sslExpiryDays || 30,
        checkChain: monitor.config?.checkChain !== false,
        checkRevocation: monitor.config?.checkRevocation === true,
        allowSelfSigned: monitor.config?.allowSelfSigned === true,
        validateHostname: monitor.config?.validateHostname !== false
      },
      
      protocol: {
        tlsVersions: monitor.config?.tlsVersions || ['TLSv1.2', 'TLSv1.3'],
        cipherSuites: monitor.config?.cipherSuites,
        sni: monitor.config?.sni !== false
      }
    },
    metadata
  }
}

/**
 * Create Ping Check Job (BullMQ Spec)
 */
export function createPingCheckJob(monitor: SchedulableMonitor): PingCheckJob {
  const jobId = generateBullMQJobId(monitor.id)
  const metadata = createJobMetadata(monitor)
  
  // Extract hostname from URL for ping
  const url = new URL(monitor.url)
  const host = url.hostname

  return {
    type: 'PING_CHECK',
    jobId,
    monitorId: monitor.id,
    organizationId: monitor.organization_id,
    config: {
      host,
      timeout: (monitor.config?.timeout || 5) * 1000, // Convert to milliseconds
      interval: monitor.config?.interval || 1000,
      count: monitor.config?.count || 4,
      packetSize: monitor.config?.packetSize || 64,
      ttl: monitor.config?.ttl,
      
      thresholds: {
        maxLatency: monitor.config?.maxResponseTime || 1000,
        minSuccessRate: monitor.config?.minSuccessRate || 95,
        maxPacketLoss: monitor.config?.maxPacketLoss || 5
      }
    },
    metadata
  }
}

/**
 * Factory function to create appropriate BullMQ job based on monitor type
 */
export function createBullMQJobFromMonitor(monitor: SchedulableMonitor): BullMQJob {
  switch (monitor.type) {
    case 'http':
      return createHttpCheckJob(monitor)
    
    case 'https':
      return createHttpsCheckJob(monitor)
    
    case 'ssl':
      return createSslCheckJob(monitor)
    
    case 'ping':
      return createPingCheckJob(monitor)
    
    default:
      throw new Error(`Unsupported monitor type: ${monitor.type}`)
  }
}

/**
 * Validate BullMQ job structure
 */
export function validateBullMQJob(job: BullMQJob): boolean {
  try {
    // Validate required fields
    if (!job.type || !job.jobId || !job.monitorId || !job.organizationId) {
      console.error('Missing required BullMQ job fields')
      return false
    }

    // Validate metadata
    if (!job.metadata?.scheduledAt || !job.metadata?.region || !job.metadata?.priority) {
      console.error('Missing required BullMQ job metadata')
      return false
    }

    // Validate config exists
    if (!job.config) {
      console.error('Missing BullMQ job config')
      return false
    }

    // Type-specific validation
    switch (job.type) {
      case 'HTTP_CHECK':
      case 'HTTPS_CHECK':
        const httpJob = job as HttpCheckJob | HttpsCheckJob
        if (!httpJob.config.url || !httpJob.config.timeout) {
          console.error('Missing required HTTP/HTTPS job config')
          return false
        }
        
        // Validate HTTPS-specific SSL config
        if (job.type === 'HTTPS_CHECK') {
          const httpsJob = job as HttpsCheckJob
          if (!httpsJob.config.ssl) {
            console.error('Missing required HTTPS SSL config')
            return false
          }
        }
        break
        
      case 'SSL_CHECK':
        const sslJob = job as SslCheckJob
        if (!sslJob.config.hostname || !sslJob.config.port) {
          console.error('Missing required SSL job config')
          return false
        }
        break
        
      case 'PING_CHECK':
        const pingJob = job as PingCheckJob
        if (!pingJob.config.host || !pingJob.config.timeout) {
          console.error('Missing required Ping job config')
          return false
        }
        break
    }

    return true
  } catch (error) {
    console.error('BullMQ job validation error:', error)
    return false
  }
}

/**
 * Get sample BullMQ job for testing
 */
export function getSampleHttpsJob(): HttpsCheckJob {
  const monitor: SchedulableMonitor = {
    id: 'monitor_sample_https',
    name: 'Sample HTTPS Monitor',
    url: 'https://httpbin.org/status/200',
    type: 'https',
    check_interval_minutes: 5,
    config: {
      timeout: 30,
      expectedStatus: 200,
      followRedirects: true,
      validateSSL: true,
      sslExpiry: true,
      sslExpiryDays: 30,
      maxResponseTime: 5000
    },
    organization_id: 'org_sample_12345',
    preferred_region: 'us-east',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_scheduled_at: null,
    next_check_at: new Date().toISOString()
  }

  return createHttpsCheckJob(monitor)
}