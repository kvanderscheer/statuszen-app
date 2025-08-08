import type { ManualProcessRequest, ManualProcessResponse } from '../../../app/types/results'
import { processMonitoringResult } from '../../utils/results/result-processor'
import { validateMonitoringResult } from '../../utils/results/result-validator'

/**
 * Manually process a monitoring result for testing purposes
 */
export default defineEventHandler(async (event): Promise<ManualProcessResponse> => {
  try {
    // Parse request body
    const body = await readBody(event) as ManualProcessRequest
    
    if (!body || !body.result) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Request body must contain a result object'
      })
    }
    
    const { result, skipValidation = false } = body
    const startTime = Date.now()
    
    // Optional validation step
    let validationErrors: any[] = []
    if (!skipValidation) {
      validationErrors = validateMonitoringResult(result)
      if (validationErrors.length > 0) {
        console.warn('⚠️ Validation errors in manual processing:', validationErrors)
      }
    }
    
    console.info(`🔄 Manual processing for job ${result.jobId}`)
    
    // Process the result
    const processingResult = await processMonitoringResult(result, {
      jobId: result.jobId || 'manual',
      attemptNumber: 1,
      startTime,
      workerId: 'manual-processor',
      metadata: {
        source: 'manual',
        skipValidation,
        endpoint: '/api/results/manual-process'
      }
    })
    
    const processingTime = Date.now() - startTime
    
    if (processingResult.success) {
      console.info(`✅ Manual processing successful for job ${result.jobId} in ${processingTime}ms`)
      
      return {
        success: true,
        resultId: processingResult.resultId,
        processingTime,
        validationSkipped: skipValidation,
        ...(validationErrors.length > 0 && { validationWarnings: validationErrors })
      }
    } else {
      console.error(`❌ Manual processing failed for job ${result.jobId}:`, processingResult.errors)
      
      return {
        success: false,
        errors: processingResult.errors,
        processingTime,
        validationSkipped: skipValidation
      }
    }
    
  } catch (error) {
    console.error('💥 Manual processing error:', error)
    
    // Handle different error types
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error // Re-throw HTTP errors
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    return {
      success: false,
      errors: [{
        field: 'processing',
        message: errorMessage
      }],
      processingTime: 0
    }
  }
})