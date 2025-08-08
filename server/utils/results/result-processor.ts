import type { 
  MonitoringResult, 
  ProcessedResult, 
  ProcessingResult, 
  ValidationError,
  ProcessingContext
} from '../../../app/types/results'
import { validateMonitoringResult, hasCriticalErrors, formatValidationErrors } from './result-validator'
import { writeResultToDatabase } from './database-writer'

/**
 * Process a monitoring result from the queue
 */
export async function processMonitoringResult(
  rawResult: any,
  context?: ProcessingContext
): Promise<ProcessingResult> {
  const startTime = Date.now()
  
  try {
    console.info(`🔄 Processing result for job ${rawResult?.jobId || 'unknown'}`)
    
    // 1. Validate the incoming result
    const validationErrors = validateMonitoringResult(rawResult)
    
    if (validationErrors.length > 0) {
      console.warn(`⚠️ Validation errors for job ${rawResult?.jobId}:`, validationErrors)
      
      // Check if errors are critical
      if (hasCriticalErrors(validationErrors)) {
        return {
          success: false,
          errors: validationErrors,
          processingTime: Date.now() - startTime
        }
      }
      
      // Continue processing with warnings for non-critical errors
      console.warn(`⚠️ Continuing with non-critical validation errors: ${formatValidationErrors(validationErrors)}`)
    }
    
    // 2. Transform to database format
    const processedResult = transformToProcessedResult(rawResult as MonitoringResult)
    
    // 3. Write to database
    const writeResult = await writeResultToDatabase(processedResult)
    
    if (!writeResult.success) {
      return {
        success: false,
        errors: [{
          field: 'database',
          message: writeResult.error || 'Database write failed'
        }],
        processingTime: Date.now() - startTime
      }
    }
    
    const processingTime = Date.now() - startTime
    console.info(`✅ Successfully processed result for job ${rawResult.jobId} in ${processingTime}ms`)
    
    return {
      success: true,
      resultId: writeResult.resultId,
      processingTime
    }
    
  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error(`💥 Error processing result for job ${rawResult?.jobId}:`, error)
    
    return {
      success: false,
      errors: [{
        field: 'processing',
        message: error instanceof Error ? error.message : String(error)
      }],
      processingTime
    }
  }
}

/**
 * Transform monitoring result to database format
 */
export function transformToProcessedResult(result: MonitoringResult): ProcessedResult {
  // Generate result ID for database relationships
  const resultId = crypto.randomUUID()
  
  // Transform core monitoring result
  const processedResult: ProcessedResult = {
    monitoringResult: {
      job_id: result.jobId,
      monitor_id: result.monitorId,
      organization_id: result.organizationId,
      job_type: result.jobType,
      success: result.success,
      status_code: result.statusCode || null,
      error_message: result.errorMessage || null,
      error_code: result.errorCode || null,
      execution_region: result.execution.region,
      executed_at: result.execution.executedAt,
      completed_at: result.execution.completedAt,
      attempt_number: result.execution.attemptNumber,
      worker_version: result.execution.workerVersion,
      worker_id: result.execution.workerId || null,
      target_ip: result.metadata.targetIp || null,
      target_location: result.metadata.targetLocation || null,
      network_path: result.metadata.networkPath || null,
      user_agent: result.metadata.userAgent || null
    },
    
    timing: {
      result_id: resultId,
      total_ms: Math.round(result.timing.total),
      dns_ms: result.timing.dns ? Math.round(result.timing.dns) : null,
      connect_ms: result.timing.connect ? Math.round(result.timing.connect) : null,
      ssl_ms: result.timing.ssl ? Math.round(result.timing.ssl) : null,
      send_ms: result.timing.send ? Math.round(result.timing.send) : null,
      wait_ms: result.timing.wait ? Math.round(result.timing.wait) : null,
      receive_ms: result.timing.receive ? Math.round(result.timing.receive) : null,
      first_byte_ms: extractFirstByteTime(result) ? Math.round(extractFirstByteTime(result)!) : null,
      download_ms: extractDownloadTime(result) ? Math.round(extractDownloadTime(result)!) : null
    }
  }
  
  // Add job-type specific data
  if (result.jobType === 'HTTP_CHECK' || result.jobType === 'HTTPS_CHECK') {
    if (result.httpResult) {
      processedResult.httpResult = {
        result_id: resultId,
        status_text: result.httpResult.statusText,
        headers: result.httpResult.headers,
        body_size_bytes: result.httpResult.bodySize,
        final_url: result.httpResult.finalUrl,
        redirect_count: result.httpResult.redirectCount,
        redirect_chain: result.httpResult.redirectChain || null,
        content_type: result.httpResult.contentType,
        encoding: result.httpResult.encoding || null,
        expected_status_met: result.httpResult.expectedStatus,
        ssl_valid: result.httpResult.sslValid || null
      }
    }
    
    // Handle HTTPS-specific SSL data
    if (result.jobType === 'HTTPS_CHECK' && result.httpsResult?.ssl) {
      processedResult.sslResult = transformHttpsSslToSslResult(result.httpsResult.ssl, resultId)
    }
  }
  
  if (result.jobType === 'SSL_CHECK' && result.sslResult) {
    processedResult.sslResult = {
      result_id: resultId,
      connected: result.sslResult.connected,
      protocol: result.sslResult.protocol || null,
      cipher: result.sslResult.cipher || null,
      chain_valid: result.sslResult.chainValid,
      chain_length: result.sslResult.chainLength,
      root_ca_known: result.sslResult.rootCaKnown,
      security_grade: result.sslResult.security.grade || null,
      security_issues: result.sslResult.security.issues || [],
      security_recommendations: result.sslResult.security.recommendations || [],
      ocsp_status: result.sslResult.ocsp?.status || null,
      ocsp_response_time_ms: result.sslResult.ocsp?.responseTime || null,
      ocsp_responder_url: result.sslResult.ocsp?.responderUrl || null
    }
    
    // Transform SSL certificates
    if (result.sslResult.certificates && result.sslResult.certificates.length > 0) {
      processedResult.sslCertificates = result.sslResult.certificates.map(cert => ({
        ssl_result_id: resultId,
        chain_position: cert.chainPosition,
        subject: cert.subject,
        issuer: cert.issuer,
        valid_from: cert.validFrom,
        valid_to: cert.validTo,
        days_until_expiry: cert.daysUntilExpiry,
        fingerprint_sha256: cert.fingerprint,
        serial_number: cert.serialNumber,
        public_key_algorithm: cert.publicKeyAlgorithm,
        public_key_size: cert.publicKeySize,
        signature_algorithm: cert.signatureAlgorithm,
        subject_alt_names: cert.subjectAltNames || [],
        hostname_match: cert.hostnameMatch,
        self_signed: cert.selfSigned,
        revoked: cert.revoked
      }))
    }
  }
  
  if (result.jobType === 'PING_CHECK' && result.pingResult) {
    processedResult.pingResult = {
      result_id: resultId,
      packets_transmitted: result.pingResult.packetsTransmitted,
      packets_received: result.pingResult.packetsReceived,
      packet_loss_percent: result.pingResult.packetLossPercentage,
      min_rtt_ms: result.pingResult.timing.min,
      max_rtt_ms: result.pingResult.timing.max,
      avg_rtt_ms: result.pingResult.timing.avg,
      stddev_rtt_ms: result.pingResult.timing.stddev,
      median_rtt_ms: result.pingResult.timing.median,
      target_hostname: result.pingResult.targetHostname,
      latency_threshold_met: result.pingResult.thresholds.latencyPassed,
      success_rate_threshold_met: result.pingResult.thresholds.successRatePassed,
      packet_loss_threshold_met: result.pingResult.thresholds.packetLossPassed
    }
    
    // Transform individual pings
    if (result.pingResult.pings && result.pingResult.pings.length > 0) {
      processedResult.individualPings = result.pingResult.pings.map(ping => ({
        ping_result_id: resultId,
        sequence: ping.sequence,
        response_time_ms: ping.responseTime || null,
        ttl: ping.ttl || null,
        success: ping.success,
        error_message: ping.errorMessage || null
      }))
    }
  }
  
  return processedResult
}

/**
 * Transform HTTPS SSL data to SSL result format
 */
function transformHttpsSslToSslResult(sslData: any, resultId: string): any {
  return {
    result_id: resultId,
    connected: sslData.valid || false,
    protocol: sslData.protocol || null,
    cipher: sslData.cipher || null,
    chain_valid: sslData.certificate?.chainValid || false,
    chain_length: 1, // HTTPS typically only returns leaf cert info
    root_ca_known: true, // Assume true for HTTPS if connection succeeded
    security_grade: sslData.security?.grade || null,
    security_issues: sslData.security?.vulnerabilities || [],
    security_recommendations: [], // Not typically provided in HTTPS results
    ocsp_status: null, // Not typically provided in HTTPS results
    ocsp_response_time_ms: null,
    ocsp_responder_url: null
  }
}

/**
 * Extract first byte time from result
 */
function extractFirstByteTime(result: MonitoringResult): number | null {
  if (result.httpResult?.firstByteTime !== undefined) {
    return result.httpResult.firstByteTime
  }
  if (result.httpsResult?.firstByteTime !== undefined) {
    return result.httpsResult.firstByteTime
  }
  return null
}

/**
 * Extract download time from result
 */
function extractDownloadTime(result: MonitoringResult): number | null {
  if (result.httpResult?.downloadTime !== undefined) {
    return result.httpResult.downloadTime
  }
  if (result.httpsResult?.downloadTime !== undefined) {
    return result.httpsResult.downloadTime
  }
  return null
}

/**
 * Batch process multiple results
 */
export async function batchProcessResults(
  rawResults: any[],
  maxConcurrency = 5
): Promise<{
  totalResults: number
  successCount: number
  failureCount: number
  results: ProcessingResult[]
  totalProcessingTime: number
}> {
  const startTime = Date.now()
  const results: ProcessingResult[] = []
  let successCount = 0
  let failureCount = 0
  
  // Process results in batches
  for (let i = 0; i < rawResults.length; i += maxConcurrency) {
    const batch = rawResults.slice(i, i + maxConcurrency)
    
    const batchPromises = batch.map(rawResult => processMonitoringResult(rawResult))
    const batchResults = await Promise.all(batchPromises)
    
    for (const result of batchResults) {
      results.push(result)
      if (result.success) {
        successCount++
      } else {
        failureCount++
      }
    }
  }
  
  return {
    totalResults: rawResults.length,
    successCount,
    failureCount,
    results,
    totalProcessingTime: Date.now() - startTime
  }
}

/**
 * Validate processed result before database write
 */
export function validateProcessedResult(processedResult: ProcessedResult): ValidationError[] {
  const errors: ValidationError[] = []
  
  // Validate required fields in monitoring result
  const monitoringResult = processedResult.monitoringResult
  if (!monitoringResult.job_id) {
    errors.push({ field: 'job_id', message: 'job_id is required' })
  }
  if (!monitoringResult.monitor_id) {
    errors.push({ field: 'monitor_id', message: 'monitor_id is required' })
  }
  if (!monitoringResult.organization_id) {
    errors.push({ field: 'organization_id', message: 'organization_id is required' })
  }
  
  // Validate timing data
  const timing = processedResult.timing
  if (!timing.total_ms || timing.total_ms < 0) {
    errors.push({ field: 'total_ms', message: 'total_ms must be a positive number' })
  }
  
  return errors
}

/**
 * Generate processing statistics
 */
export function generateProcessingStats(results: ProcessingResult[]): {
  totalProcessed: number
  successRate: number
  averageProcessingTime: number
  errorBreakdown: Record<string, number>
} {
  const totalProcessed = results.length
  const successCount = results.filter(r => r.success).length
  const successRate = totalProcessed > 0 ? (successCount / totalProcessed) * 100 : 0
  
  const totalProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0)
  const averageProcessingTime = totalProcessed > 0 ? totalProcessingTime / totalProcessed : 0
  
  const errorBreakdown: Record<string, number> = {}
  results.filter(r => !r.success).forEach(result => {
    if (result.errors) {
      result.errors.forEach(error => {
        errorBreakdown[error.field] = (errorBreakdown[error.field] || 0) + 1
      })
    }
  })
  
  return {
    totalProcessed,
    successRate,
    averageProcessingTime,
    errorBreakdown
  }
}