import type { MonitoringResult, ValidationError, JobType } from '../../../app/types/results'
import type { MonitorRegion } from '../../../app/types/monitor'

/**
 * Validate monitoring result against BullMQ specification
 */
export function validateMonitoringResult(result: any): ValidationError[] {
  const errors: ValidationError[] = []
  
  // Check if result is an object
  if (!result || typeof result !== 'object') {
    errors.push({
      field: 'result',
      message: 'Result must be a valid object',
      value: result
    })
    return errors
  }
  
  // Validate required fields
  validateRequiredFields(result, errors)
  
  // Validate field types and formats
  validateFieldTypes(result, errors)
  
  // Validate job type specific requirements
  validateJobTypeSpecific(result, errors)
  
  // Validate timing data
  validateTiming(result.timing, errors, 'timing')
  
  // Validate execution data
  validateExecution(result.execution, errors)
  
  return errors
}

/**
 * Validate required fields are present
 */
function validateRequiredFields(result: any, errors: ValidationError[]): void {
  const requiredFields = [
    'jobId',
    'monitorId', 
    'organizationId',
    'jobType',
    'success',
    'execution',
    'timing'
  ]
  
  for (const field of requiredFields) {
    if (result[field] === undefined || result[field] === null) {
      errors.push({
        field,
        message: `${field} is required`,
        value: result[field]
      })
    }
  }
}

/**
 * Validate field types and basic formats
 */
function validateFieldTypes(result: any, errors: ValidationError[]): void {
  // String fields
  const stringFields = ['jobId', 'monitorId', 'organizationId', 'errorMessage', 'errorCode']
  for (const field of stringFields) {
    if (result[field] !== undefined && typeof result[field] !== 'string') {
      errors.push({
        field,
        message: `${field} must be a string`,
        value: result[field]
      })
    }
  }
  
  // Boolean fields
  if (result.success !== undefined && typeof result.success !== 'boolean') {
    errors.push({
      field: 'success',
      message: 'success must be a boolean',
      value: result.success
    })
  }
  
  // Number fields
  if (result.statusCode !== undefined) {
    if (typeof result.statusCode !== 'number' || result.statusCode < 100 || result.statusCode > 599) {
      errors.push({
        field: 'statusCode',
        message: 'statusCode must be a valid HTTP status code (100-599)',
        value: result.statusCode
      })
    }
  }
  
  // Job type validation
  if (result.jobType !== undefined) {
    const validJobTypes: JobType[] = ['HTTP_CHECK', 'HTTPS_CHECK', 'SSL_CHECK', 'PING_CHECK']
    if (!validJobTypes.includes(result.jobType)) {
      errors.push({
        field: 'jobType',
        message: `jobType must be one of: ${validJobTypes.join(', ')}`,
        value: result.jobType
      })
    }
  }
  
  // UUID format validation (basic check)
  const uuidFields = ['jobId', 'monitorId', 'organizationId']
  for (const field of uuidFields) {
    if (result[field] && typeof result[field] === 'string') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(result[field])) {
        errors.push({
          field,
          message: `${field} must be a valid UUID`,
          value: result[field]
        })
      }
    }
  }
}

/**
 * Validate execution data
 */
function validateExecution(execution: any, errors: ValidationError[]): void {
  if (!execution || typeof execution !== 'object') {
    errors.push({
      field: 'execution',
      message: 'execution must be an object',
      value: execution
    })
    return
  }
  
  // Required execution fields
  const requiredFields = ['region', 'executedAt', 'completedAt', 'attemptNumber', 'workerVersion']
  for (const field of requiredFields) {
    if (execution[field] === undefined || execution[field] === null) {
      errors.push({
        field: `execution.${field}`,
        message: `execution.${field} is required`,
        value: execution[field]
      })
    }
  }
  
  // Region validation
  if (execution.region) {
    const validRegions: MonitorRegion[] = ['us-east', 'us-west', 'eu-west', 'eu-central', 'ap-south', 'ap-southeast', 'local']
    if (!validRegions.includes(execution.region)) {
      errors.push({
        field: 'execution.region',
        message: `execution.region must be one of: ${validRegions.join(', ')}`,
        value: execution.region
      })
    }
  }
  
  // Timestamp validation
  const timestampFields = ['executedAt', 'completedAt']
  for (const field of timestampFields) {
    if (execution[field]) {
      const date = new Date(execution[field])
      if (isNaN(date.getTime())) {
        errors.push({
          field: `execution.${field}`,
          message: `execution.${field} must be a valid ISO 8601 timestamp`,
          value: execution[field]
        })
      }
    }
  }
  
  // Attempt number validation
  if (execution.attemptNumber !== undefined) {
    if (typeof execution.attemptNumber !== 'number' || execution.attemptNumber < 1 || execution.attemptNumber > 10) {
      errors.push({
        field: 'execution.attemptNumber',
        message: 'execution.attemptNumber must be a number between 1 and 10',
        value: execution.attemptNumber
      })
    }
  }
}

/**
 * Validate timing data
 */
function validateTiming(timing: any, errors: ValidationError[], prefix = ''): void {
  if (!timing || typeof timing !== 'object') {
    errors.push({
      field: prefix || 'timing',
      message: `${prefix || 'timing'} must be an object`,
      value: timing
    })
    return
  }
  
  // Total timing is required
  if (typeof timing.total !== 'number' || timing.total < 0) {
    errors.push({
      field: `${prefix}.total`,
      message: `${prefix}.total must be a non-negative number`,
      value: timing.total
    })
  }
  
  // Optional timing fields must be non-negative numbers if present
  const optionalTimingFields = ['dns', 'connect', 'ssl', 'send', 'wait', 'receive']
  for (const field of optionalTimingFields) {
    if (timing[field] !== undefined) {
      if (typeof timing[field] !== 'number' || timing[field] < 0) {
        errors.push({
          field: `${prefix}.${field}`,
          message: `${prefix}.${field} must be a non-negative number`,
          value: timing[field]
        })
      }
    }
  }
}

/**
 * Validate job type specific requirements
 */
function validateJobTypeSpecific(result: any, errors: ValidationError[]): void {
  if (!result.jobType) return
  
  switch (result.jobType) {
    case 'HTTP_CHECK':
    case 'HTTPS_CHECK':
      validateHttpResult(result, errors)
      if (result.jobType === 'HTTPS_CHECK') {
        validateHttpsResult(result, errors)
      }
      break
    case 'SSL_CHECK':
      validateSslResult(result, errors)
      break
    case 'PING_CHECK':
      validatePingResult(result, errors)
      break
  }
}

/**
 * Validate HTTP result data
 */
function validateHttpResult(result: any, errors: ValidationError[]): void {
  const httpResult = result.httpResult
  if (!httpResult) {
    errors.push({
      field: 'httpResult',
      message: 'httpResult is required for HTTP_CHECK and HTTPS_CHECK jobs',
      value: httpResult
    })
    return
  }
  
  // Required HTTP fields
  const requiredFields = ['statusCode', 'statusText', 'headers', 'bodySize', 'finalUrl', 'redirectCount', 'contentType', 'firstByteTime', 'downloadTime', 'expectedStatus']
  for (const field of requiredFields) {
    if (httpResult[field] === undefined) {
      errors.push({
        field: `httpResult.${field}`,
        message: `httpResult.${field} is required`,
        value: httpResult[field]
      })
    }
  }
  
  // Validate status code
  if (typeof httpResult.statusCode !== 'number' || httpResult.statusCode < 100 || httpResult.statusCode > 599) {
    errors.push({
      field: 'httpResult.statusCode',
      message: 'httpResult.statusCode must be a valid HTTP status code (100-599)',
      value: httpResult.statusCode
    })
  }
  
  // Validate body size
  if (typeof httpResult.bodySize !== 'number' || httpResult.bodySize < 0) {
    errors.push({
      field: 'httpResult.bodySize',
      message: 'httpResult.bodySize must be a non-negative number',
      value: httpResult.bodySize
    })
  }
  
  // Validate redirect count
  if (typeof httpResult.redirectCount !== 'number' || httpResult.redirectCount < 0) {
    errors.push({
      field: 'httpResult.redirectCount',
      message: 'httpResult.redirectCount must be a non-negative number',
      value: httpResult.redirectCount
    })
  }
  
  // Validate timing fields
  if (typeof httpResult.firstByteTime !== 'number' || httpResult.firstByteTime < 0) {
    errors.push({
      field: 'httpResult.firstByteTime',
      message: 'httpResult.firstByteTime must be a non-negative number',
      value: httpResult.firstByteTime
    })
  }
  
  if (typeof httpResult.downloadTime !== 'number' || httpResult.downloadTime < 0) {
    errors.push({
      field: 'httpResult.downloadTime',
      message: 'httpResult.downloadTime must be a non-negative number',
      value: httpResult.downloadTime
    })
  }
}

/**
 * Validate HTTPS result data
 */
function validateHttpsResult(result: any, errors: ValidationError[]): void {
  const httpsResult = result.httpsResult || result.httpResult
  if (!httpsResult || !httpsResult.ssl) {
    errors.push({
      field: 'httpsResult.ssl',
      message: 'httpsResult.ssl is required for HTTPS_CHECK jobs',
      value: httpsResult?.ssl
    })
    return
  }
  
  const ssl = httpsResult.ssl
  
  // Required SSL fields
  const requiredFields = ['valid', 'protocol', 'cipher', 'certificate', 'security']
  for (const field of requiredFields) {
    if (ssl[field] === undefined) {
      errors.push({
        field: `httpsResult.ssl.${field}`,
        message: `httpsResult.ssl.${field} is required`,
        value: ssl[field]
      })
    }
  }
  
  // Validate certificate
  if (ssl.certificate) {
    const cert = ssl.certificate
    const certRequiredFields = ['subject', 'issuer', 'validFrom', 'validTo', 'daysUntilExpiry', 'fingerprint', 'serialNumber']
    for (const field of certRequiredFields) {
      if (cert[field] === undefined) {
        errors.push({
          field: `httpsResult.ssl.certificate.${field}`,
          message: `httpsResult.ssl.certificate.${field} is required`,
          value: cert[field]
        })
      }
    }
  }
  
  // Validate security grade
  if (ssl.security && ssl.security.grade) {
    const validGrades = ['A+', 'A', 'B', 'C', 'D', 'F']
    if (!validGrades.includes(ssl.security.grade)) {
      errors.push({
        field: 'httpsResult.ssl.security.grade',
        message: `httpsResult.ssl.security.grade must be one of: ${validGrades.join(', ')}`,
        value: ssl.security.grade
      })
    }
  }
}

/**
 * Validate SSL result data
 */
function validateSslResult(result: any, errors: ValidationError[]): void {
  const sslResult = result.sslResult
  if (!sslResult) {
    errors.push({
      field: 'sslResult',
      message: 'sslResult is required for SSL_CHECK jobs',
      value: sslResult
    })
    return
  }
  
  // Required SSL fields
  const requiredFields = ['connected', 'certificates', 'chainValid', 'chainLength', 'rootCaKnown', 'security']
  for (const field of requiredFields) {
    if (sslResult[field] === undefined) {
      errors.push({
        field: `sslResult.${field}`,
        message: `sslResult.${field} is required`,
        value: sslResult[field]
      })
    }
  }
  
  // Validate certificates array
  if (Array.isArray(sslResult.certificates)) {
    sslResult.certificates.forEach((cert: any, index: number) => {
      const certRequiredFields = ['subject', 'issuer', 'validFrom', 'validTo', 'daysUntilExpiry', 'fingerprint', 'serialNumber', 'chainPosition']
      for (const field of certRequiredFields) {
        if (cert[field] === undefined) {
          errors.push({
            field: `sslResult.certificates[${index}].${field}`,
            message: `sslResult.certificates[${index}].${field} is required`,
            value: cert[field]
          })
        }
      }
    })
  }
}

/**
 * Validate ping result data
 */
function validatePingResult(result: any, errors: ValidationError[]): void {
  const pingResult = result.pingResult
  if (!pingResult) {
    errors.push({
      field: 'pingResult',
      message: 'pingResult is required for PING_CHECK jobs',
      value: pingResult
    })
    return
  }
  
  // Required ping fields
  const requiredFields = ['packetsTransmitted', 'packetsReceived', 'packetLossPercentage', 'timing', 'pings', 'targetIp', 'targetHostname', 'thresholds']
  for (const field of requiredFields) {
    if (pingResult[field] === undefined) {
      errors.push({
        field: `pingResult.${field}`,
        message: `pingResult.${field} is required`,
        value: pingResult[field]
      })
    }
  }
  
  // Validate packet counts
  if (typeof pingResult.packetsTransmitted !== 'number' || pingResult.packetsTransmitted < 0) {
    errors.push({
      field: 'pingResult.packetsTransmitted',
      message: 'pingResult.packetsTransmitted must be a non-negative number',
      value: pingResult.packetsTransmitted
    })
  }
  
  if (typeof pingResult.packetsReceived !== 'number' || pingResult.packetsReceived < 0) {
    errors.push({
      field: 'pingResult.packetsReceived',
      message: 'pingResult.packetsReceived must be a non-negative number',
      value: pingResult.packetsReceived
    })
  }
  
  // Validate packet loss percentage
  if (typeof pingResult.packetLossPercentage !== 'number' || pingResult.packetLossPercentage < 0 || pingResult.packetLossPercentage > 100) {
    errors.push({
      field: 'pingResult.packetLossPercentage',
      message: 'pingResult.packetLossPercentage must be a number between 0 and 100',
      value: pingResult.packetLossPercentage
    })
  }
  
  // Validate timing
  if (pingResult.timing) {
    validateTiming(pingResult.timing, errors, 'pingResult.timing')
  }
  
  // Validate individual pings array
  if (Array.isArray(pingResult.pings)) {
    pingResult.pings.forEach((ping: any, index: number) => {
      const pingRequiredFields = ['sequence', 'success']
      for (const field of pingRequiredFields) {
        if (ping[field] === undefined) {
          errors.push({
            field: `pingResult.pings[${index}].${field}`,
            message: `pingResult.pings[${index}].${field} is required`,
            value: ping[field]
          })
        }
      }
      
      // If successful, response time and TTL should be present
      if (ping.success) {
        if (typeof ping.responseTime !== 'number' || ping.responseTime < 0) {
          errors.push({
            field: `pingResult.pings[${index}].responseTime`,
            message: `pingResult.pings[${index}].responseTime must be a non-negative number for successful pings`,
            value: ping.responseTime
          })
        }
        
        if (typeof ping.ttl !== 'number' || ping.ttl < 1 || ping.ttl > 255) {
          errors.push({
            field: `pingResult.pings[${index}].ttl`,
            message: `pingResult.pings[${index}].ttl must be a number between 1 and 255 for successful pings`,
            value: ping.ttl
          })
        }
      }
    })
  }
}

/**
 * Check if validation errors contain any critical errors that should prevent processing
 */
export function hasCriticalErrors(errors: ValidationError[]): boolean {
  const criticalFields = ['jobId', 'monitorId', 'organizationId', 'jobType', 'success', 'execution', 'timing']
  return errors.some(error => criticalFields.some(field => error.field.startsWith(field)))
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map(error => `${error.field}: ${error.message}`).join('; ')
}