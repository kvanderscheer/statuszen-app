import type { JobType, BullMQJobPriority } from './job-queue'
import type { MonitorRegion } from './monitor'

/**
 * Core monitoring result interface matching the database schema
 */
export interface MonitoringResult {
  jobId: string
  monitorId: string
  organizationId: string
  jobType: JobType
  success: boolean
  statusCode?: number
  errorMessage?: string
  errorCode?: string
  
  execution: {
    region: MonitorRegion
    executedAt: string
    completedAt: string
    attemptNumber: number
    workerVersion: string
    workerId?: string
  }
  
  timing: {
    total: number
    dns?: number
    connect?: number
    ssl?: number
    send?: number
    wait?: number
    receive?: number
  }
  
  metadata: {
    targetIp?: string
    targetLocation?: string
    networkPath?: 'direct' | 'cdn' | 'proxy'
    userAgent?: string
  }
  
  httpResult?: HttpResult
  httpsResult?: HttpsResult
  sslResult?: SslResult
  pingResult?: PingResult
}

/**
 * HTTP Result Details
 */
export interface HttpResult {
  statusCode: number
  statusText: string
  headers: Record<string, string>
  bodySize: number
  finalUrl: string
  redirectCount: number
  redirectChain?: string[]
  contentType: string
  encoding?: string
  firstByteTime: number
  downloadTime: number
  expectedStatus: boolean
  sslValid?: boolean
}

/**
 * HTTPS Result Details (extends HTTP)
 */
export interface HttpsResult extends HttpResult {
  ssl: {
    valid: boolean
    protocol: string
    cipher: string
    certificate: {
      subject: string
      issuer: string
      validFrom: string
      validTo: string
      daysUntilExpiry: number
      fingerprint: string
      serialNumber: string
      subjectAltNames: string[]
      hostnameMatch: boolean
      chainValid: boolean
      selfSigned: boolean
      revoked: boolean
    }
    security: {
      grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'
      weakCipher: boolean
      deprecatedProtocol: boolean
      vulnerabilities: string[]
    }
  }
}

/**
 * SSL Result Details
 */
export interface SslResult {
  connected: boolean
  protocol: string
  cipher: string
  certificates: SslCertificate[]
  chainValid: boolean
  chainLength: number
  rootCaKnown: boolean
  security: {
    grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'
    issues: string[]
    recommendations: string[]
  }
  ocsp?: {
    status: 'good' | 'revoked' | 'unknown'
    responseTime: number
    responderUrl: string
  }
}

/**
 * SSL Certificate Details
 */
export interface SslCertificate {
  subject: string
  issuer: string
  validFrom: string
  validTo: string
  daysUntilExpiry: number
  fingerprint: string
  serialNumber: string
  publicKeyAlgorithm: string
  publicKeySize: number
  signatureAlgorithm: string
  subjectAltNames: string[]
  hostnameMatch: boolean
  selfSigned: boolean
  revoked: boolean
  chainPosition: number
}

/**
 * Ping Result Details
 */
export interface PingResult {
  packetsTransmitted: number
  packetsReceived: number
  packetLossPercentage: number
  timing: {
    min: number
    max: number
    avg: number
    stddev: number
    median: number
  }
  pings: IndividualPing[]
  targetIp: string
  targetHostname: string
  thresholds: {
    latencyPassed: boolean
    successRatePassed: boolean
    packetLossPassed: boolean
  }
}

/**
 * Individual Ping Details
 */
export interface IndividualPing {
  sequence: number
  responseTime: number
  ttl: number
  success: boolean
  errorMessage?: string
}

/**
 * Processed result ready for database insertion
 */
export interface ProcessedResult {
  monitoringResult: {
    job_id: string
    monitor_id: string
    organization_id: string
    job_type: JobType
    success: boolean
    status_code?: number
    error_message?: string
    error_code?: string
    execution_region: MonitorRegion
    executed_at: string
    completed_at: string
    attempt_number: number
    worker_version: string
    worker_id?: string
    target_ip?: string
    target_location?: string
    network_path?: 'direct' | 'cdn' | 'proxy'
    user_agent?: string
  }
  
  timing: {
    result_id: string
    total_ms: number
    dns_ms?: number
    connect_ms?: number
    ssl_ms?: number
    send_ms?: number
    wait_ms?: number
    receive_ms?: number
    first_byte_ms?: number
    download_ms?: number
  }
  
  httpResult?: {
    result_id: string
    status_text: string
    headers: Record<string, string>
    body_size_bytes: number
    final_url: string
    redirect_count: number
    redirect_chain?: string[]
    content_type: string
    encoding?: string
    expected_status_met: boolean
    ssl_valid?: boolean
  }
  
  sslResult?: {
    result_id: string
    connected: boolean
    protocol: string
    cipher: string
    chain_valid: boolean
    chain_length: number
    root_ca_known: boolean
    security_grade?: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'
    security_issues: string[]
    security_recommendations: string[]
    ocsp_status?: 'good' | 'revoked' | 'unknown'
    ocsp_response_time_ms?: number
    ocsp_responder_url?: string
  }
  
  sslCertificates?: Array<{
    ssl_result_id: string
    chain_position: number
    subject: string
    issuer: string
    valid_from: string
    valid_to: string
    days_until_expiry: number
    fingerprint_sha256: string
    serial_number: string
    public_key_algorithm: string
    public_key_size: number
    signature_algorithm: string
    subject_alt_names: string[]
    hostname_match: boolean
    self_signed: boolean
    revoked: boolean
  }>
  
  pingResult?: {
    result_id: string
    packets_transmitted: number
    packets_received: number
    packet_loss_percent: number
    min_rtt_ms: number
    max_rtt_ms: number
    avg_rtt_ms: number
    stddev_rtt_ms: number
    median_rtt_ms: number
    target_hostname: string
    latency_threshold_met: boolean
    success_rate_threshold_met: boolean
    packet_loss_threshold_met: boolean
  }
  
  individualPings?: Array<{
    ping_result_id: string
    sequence: number
    response_time_ms?: number
    ttl?: number
    success: boolean
    error_message?: string
  }>
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string
  message: string
  value?: any
}

/**
 * Processing result
 */
export interface ProcessingResult {
  success: boolean
  resultId?: string
  errors?: ValidationError[]
  processingTime: number
}

/**
 * Processor statistics
 */
export interface ResultProcessorStats {
  totalProcessed: number
  successCount: number
  errorCount: number
  averageProcessingTime: number
  lastProcessedAt?: string
  jobTypeStats: Record<JobType, {
    processed: number
    success: number
    errors: number
  }>
  errorBreakdown: Record<string, number>
  uptime: number
  isActive: boolean
}

/**
 * Processor status
 */
export interface ProcessorStatus {
  isRunning: boolean
  isHealthy: boolean
  startedAt?: string
  lastHeartbeat?: string
  currentJobs: number
  queueStats: {
    waiting: number
    active: number
    completed: number
    failed: number
  }
  errorRate: number
  throughput: number
  circuitBreakerOpen: boolean
  consecutiveFailures: number
  connectionErrors: number
}

/**
 * Manual processing request
 */
export interface ManualProcessRequest {
  result: MonitoringResult
  skipValidation?: boolean
}

/**
 * Manual processing response
 */
export interface ManualProcessResponse {
  success: boolean
  resultId?: string
  errors?: ValidationError[]
  processingTime: number
  validationSkipped?: boolean
}

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig {
  maxRetries: number
  retryDelay: number
  deadLetterQueue: string
  enableLogging: boolean
  logLevel: 'error' | 'warn' | 'info' | 'debug'
}

/**
 * Database transaction context
 */
export interface DatabaseTransactionContext {
  client: any
  startTime: number
  operationId: string
}

/**
 * Result processing context
 */
export interface ProcessingContext {
  jobId: string
  attemptNumber: number
  startTime: number
  workerId?: string
  metadata?: Record<string, any>
}