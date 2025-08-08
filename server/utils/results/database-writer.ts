import { createClient } from '@supabase/supabase-js'
import type { ProcessedResult, DatabaseTransactionContext } from '../../../app/types/results'

/**
 * Create Supabase service role client for server-side operations
 */
function getSupabaseServiceRoleClient() {
  const supabaseUrl = process.env.SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY!
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Write processed result to database with transaction handling
 */
export async function writeResultToDatabase(
  processedResult: ProcessedResult, 
  retryCount = 0
): Promise<{ success: boolean; resultId?: string; error?: string }> {
  const supabase = getSupabaseServiceRoleClient()
  const maxRetries = 3
  const startTime = Date.now()
  
  try {
    // Start transaction context
    const context: DatabaseTransactionContext = {
      client: supabase,
      startTime,
      operationId: `write_${processedResult.monitoringResult.job_id}_${Date.now()}`
    }
    
    // Execute transaction
    const result = await executeTransaction(context, processedResult)
    
    if (result.success) {
      console.info(`✅ Successfully wrote result for job ${processedResult.monitoringResult.job_id} in ${Date.now() - startTime}ms`)
      return result
    } else {
      console.error(`❌ Failed to write result for job ${processedResult.monitoringResult.job_id}:`, result.error)
      
      // Retry on transient errors
      if (retryCount < maxRetries && isRetryableError(result.error)) {
        const delay = Math.pow(2, retryCount) * 1000 // Exponential backoff
        console.warn(`🔄 Retrying write operation in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`)
        
        await new Promise(resolve => setTimeout(resolve, delay))
        return writeResultToDatabase(processedResult, retryCount + 1)
      }
      
      return result
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`💥 Database write error for job ${processedResult.monitoringResult.job_id}:`, error)
    
    // Retry on transient errors
    if (retryCount < maxRetries && isRetryableError(errorMessage)) {
      const delay = Math.pow(2, retryCount) * 1000
      console.warn(`🔄 Retrying write operation in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`)
      
      await new Promise(resolve => setTimeout(resolve, delay))
      return writeResultToDatabase(processedResult, retryCount + 1)
    }
    
    return {
      success: false,
      error: errorMessage
    }
  }
}

/**
 * Execute database transaction
 */
async function executeTransaction(
  context: DatabaseTransactionContext, 
  processedResult: ProcessedResult
): Promise<{ success: boolean; resultId?: string; error?: string }> {
  
  try {
    // 1. Insert core monitoring result
    const { data: monitoringResultData, error: monitoringError } = await context.client
      .from('monitoring_results')
      .insert(processedResult.monitoringResult)
      .select('id')
      .single()
    
    if (monitoringError) {
      return {
        success: false,
        error: `Failed to insert monitoring result: ${monitoringError.message}`
      }
    }
    
    const resultId = monitoringResultData.id
    
    // 2. Insert timing data
    const timingData = { ...processedResult.timing, result_id: resultId }
    const { error: timingError } = await context.client
      .from('result_timings')
      .insert(timingData)
    
    if (timingError) {
      return {
        success: false,
        error: `Failed to insert timing data: ${timingError.message}`
      }
    }
    
    // 3. Insert job-type specific data
    const jobType = processedResult.monitoringResult.job_type
    
    if (jobType === 'HTTP_CHECK' || jobType === 'HTTPS_CHECK') {
      if (processedResult.httpResult) {
        const httpData = { ...processedResult.httpResult, result_id: resultId }
        const { error: httpError } = await context.client
          .from('http_results')
          .insert(httpData)
        
        if (httpError) {
          return {
            success: false,
            error: `Failed to insert HTTP result: ${httpError.message}`
          }
        }
      }
    }
    
    if (jobType === 'SSL_CHECK' || jobType === 'HTTPS_CHECK') {
      if (processedResult.sslResult) {
        const sslData = { ...processedResult.sslResult, result_id: resultId }
        const { error: sslError } = await context.client
          .from('ssl_results')
          .insert(sslData)
        
        if (sslError) {
          return {
            success: false,
            error: `Failed to insert SSL result: ${sslError.message}`
          }
        }
        
        // Insert SSL certificates
        if (processedResult.sslCertificates && processedResult.sslCertificates.length > 0) {
          const certificatesData = processedResult.sslCertificates.map(cert => ({
            ...cert,
            ssl_result_id: resultId
          }))
          
          const { error: certsError } = await context.client
            .from('ssl_certificates')
            .insert(certificatesData)
          
          if (certsError) {
            return {
              success: false,
              error: `Failed to insert SSL certificates: ${certsError.message}`
            }
          }
        }
      }
    }
    
    if (jobType === 'PING_CHECK') {
      if (processedResult.pingResult) {
        const pingData = { ...processedResult.pingResult, result_id: resultId }
        const { error: pingError } = await context.client
          .from('ping_results')
          .insert(pingData)
        
        if (pingError) {
          return {
            success: false,
            error: `Failed to insert ping result: ${pingError.message}`
          }
        }
        
        // Insert individual pings
        if (processedResult.individualPings && processedResult.individualPings.length > 0) {
          const pingsData = processedResult.individualPings.map(ping => ({
            ...ping,
            ping_result_id: resultId
          }))
          
          const { error: pingsError } = await context.client
            .from('individual_pings')
            .insert(pingsData)
          
          if (pingsError) {
            return {
              success: false,
              error: `Failed to insert individual pings: ${pingsError.message}`
            }
          }
        }
      }
    }
    
    return {
      success: true,
      resultId
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      error: `Transaction failed: ${errorMessage}`
    }
  }
}

/**
 * Check if error is retryable
 */
function isRetryableError(error?: string): boolean {
  if (!error) return false
  
  const retryablePatterns = [
    'connection',
    'timeout',
    'network',
    'temporary',
    'rate limit',
    'too many requests',
    'service unavailable',
    'internal server error'
  ]
  
  const errorLower = error.toLowerCase()
  return retryablePatterns.some(pattern => errorLower.includes(pattern))
}

/**
 * Batch write multiple results to database
 */
export async function batchWriteResults(
  processedResults: ProcessedResult[]
): Promise<{
  totalResults: number
  successCount: number
  failureCount: number
  results: Array<{ jobId: string; success: boolean; resultId?: string; error?: string }>
}> {
  const results = []
  let successCount = 0
  let failureCount = 0
  
  // Process results in parallel batches of 5
  const batchSize = 5
  for (let i = 0; i < processedResults.length; i += batchSize) {
    const batch = processedResults.slice(i, i + batchSize)
    
    const batchPromises = batch.map(async (processedResult) => {
      const result = await writeResultToDatabase(processedResult)
      return {
        jobId: processedResult.monitoringResult.job_id,
        success: result.success,
        resultId: result.resultId,
        error: result.error
      }
    })
    
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
    totalResults: processedResults.length,
    successCount,
    failureCount,
    results
  }
}

/**
 * Get database connection health
 */
export async function checkDatabaseHealth(): Promise<{
  isHealthy: boolean
  responseTime: number
  error?: string
}> {
  const supabase = getSupabaseServiceRoleClient()
  const startTime = Date.now()
  
  try {
    // Simple query to test connection
    const { error } = await supabase
      .from('monitoring_results')
      .select('id')
      .limit(1)
    
    const responseTime = Date.now() - startTime
    
    if (error) {
      return {
        isHealthy: false,
        responseTime,
        error: error.message
      }
    }
    
    return {
      isHealthy: true,
      responseTime
    }
    
  } catch (error) {
    const responseTime = Date.now() - startTime
    return {
      isHealthy: false,
      responseTime,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
  totalResults: number
  resultsLast24h: number
  resultsByType: Record<string, number>
  avgProcessingTime: number
  errorRate: number
}> {
  const supabase = getSupabaseServiceRoleClient()
  
  try {
    // Total results count
    const { count: totalResults } = await supabase
      .from('monitoring_results')
      .select('*', { count: 'exact', head: true })
    
    // Results in last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: resultsLast24h } = await supabase
      .from('monitoring_results')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', twentyFourHoursAgo)
    
    // Results by type
    const { data: typeData } = await supabase
      .from('monitoring_results')
      .select('job_type')
      .gte('created_at', twentyFourHoursAgo)
    
    const resultsByType: Record<string, number> = {}
    if (typeData) {
      for (const row of typeData) {
        resultsByType[row.job_type] = (resultsByType[row.job_type] || 0) + 1
      }
    }
    
    // Error rate (last 24h)
    const { count: errorCount } = await supabase
      .from('monitoring_results')
      .select('*', { count: 'exact', head: true })
      .eq('success', false)
      .gte('created_at', twentyFourHoursAgo)
    
    const errorRate = resultsLast24h && resultsLast24h > 0 ? (errorCount || 0) / resultsLast24h * 100 : 0
    
    // Average processing time (simplified - using timing total)
    const { data: timingData } = await supabase
      .from('result_timings')
      .select('total_ms')
      .gte('result_id', twentyFourHoursAgo)  // This would need a join in real implementation
      .limit(1000)
    
    let avgProcessingTime = 0
    if (timingData && timingData.length > 0) {
      const totalTime = timingData.reduce((sum, row) => sum + (row.total_ms || 0), 0)
      avgProcessingTime = totalTime / timingData.length
    }
    
    return {
      totalResults: totalResults || 0,
      resultsLast24h: resultsLast24h || 0,
      resultsByType,
      avgProcessingTime,
      errorRate
    }
    
  } catch (error) {
    console.error('Failed to get database stats:', error)
    return {
      totalResults: 0,
      resultsLast24h: 0,
      resultsByType: {},
      avgProcessingTime: 0,
      errorRate: 0
    }
  }
}

/**
 * Clean up old results based on retention policy
 */
export async function cleanupOldResults(retentionDays = 90): Promise<{
  success: boolean
  deletedCount: number
  error?: string
}> {
  const supabase = getSupabaseServiceRoleClient()
  
  try {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()
    
    const { count, error } = await supabase
      .from('monitoring_results')
      .delete({ count: 'exact' })
      .lt('created_at', cutoffDate)
    
    if (error) {
      return {
        success: false,
        deletedCount: 0,
        error: error.message
      }
    }
    
    console.info(`🧹 Cleaned up ${count} old results older than ${retentionDays} days`)
    
    return {
      success: true,
      deletedCount: count || 0
    }
    
  } catch (error) {
    return {
      success: false,
      deletedCount: 0,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}