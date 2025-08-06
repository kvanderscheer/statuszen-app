/**
 * Main Job Scheduler Endpoint
 * POST /api/cron/scheduler
 * 
 * This endpoint orchestrates the complete monitoring job scheduling workflow:
 * 1. Fetches due monitors from database
 * 2. Creates jobs in appropriate regional queues (REST-based)
 * 3. Updates monitor timestamps
 * 4. Reports metrics and results
 */

import { fetchDueMonitors, updateMonitorTimestamps } from '../../utils/scheduler/monitor-query'
import { createMonitoringJobsBatch } from '../../utils/scheduler/job-creator'
import { getQueueHealthStats } from '../../utils/scheduler/regional-router'

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  
  try {
    // Security check: Verify cron secret
    const cronSecret = process.env.CRON_SECRET
    const providedSecret = getHeader(event, 'x-cron-secret') || getQuery(event).secret
    
    if (cronSecret && cronSecret !== providedSecret) {
      console.error('Unauthorized scheduler request - invalid cron secret')
      return {
        success: false,
        error: 'Unauthorized',
        timestamp: new Date().toISOString()
      }
    }

    console.log('🚀 Starting job scheduler cycle...')

    // Phase 1: Fetch due monitors from database
    console.log('📋 Phase 1: Fetching due monitors from database...')
    const dueMonitors = await fetchDueMonitors()
    
    if (dueMonitors.length === 0) {
      console.log('✅ No monitors are due for scheduling')
      return {
        success: true,
        message: 'No monitors due for scheduling',
        stats: {
          monitorsProcessed: 0,
          jobsCreated: 0,
          duration: Date.now() - startTime,
          queueHealth: await getQueueHealthStats()
        },
        timestamp: new Date().toISOString()
      }
    }

    console.log(`📊 Found ${dueMonitors.length} monitors due for scheduling`)

    // Phase 2: Create monitoring jobs in batches using REST queues
    console.log('⚡ Phase 2: Creating monitoring jobs...')
    const batchResult = await createMonitoringJobsBatch(dueMonitors)

    if (batchResult.failedJobs > 0) {
      console.warn(`⚠️ ${batchResult.failedJobs} jobs failed to create out of ${batchResult.totalJobs}`)
    }

    // Phase 3: Update monitor timestamps for successfully created jobs
    console.log('🕒 Phase 3: Updating monitor timestamps...')
    const successfulMonitorIds = batchResult.results
      .filter(result => result.success)
      .map((result, index) => dueMonitors[index].id)
      .filter(Boolean)

    let timestampUpdates = 0
    if (successfulMonitorIds.length > 0) {
      timestampUpdates = await updateMonitorTimestamps(successfulMonitorIds)
      console.log(`✅ Updated ${timestampUpdates} monitor timestamps`)
    }

    // Phase 4: Collect final metrics
    const duration = Date.now() - startTime
    const queueHealth = await getQueueHealthStats()

    const result = {
      success: true,
      message: `Scheduler cycle completed: ${batchResult.successfulJobs}/${batchResult.totalJobs} jobs created`,
      stats: {
        monitorsProcessed: dueMonitors.length,
        jobsCreated: batchResult.successfulJobs,
        jobsFailed: batchResult.failedJobs,
        timestampUpdates,
        duration,
        queueDistribution: batchResult.queueDistribution,
        queueHealth,
        performanceMetrics: {
          averageJobCreationTime: batchResult.duration / batchResult.totalJobs,
          jobsPerSecond: Math.round((batchResult.successfulJobs / duration) * 1000),
          successRate: Math.round((batchResult.successfulJobs / batchResult.totalJobs) * 100)
        }
      },
      timestamp: new Date().toISOString()
    }

    console.log(`🏁 Scheduler cycle completed in ${duration}ms:`, {
      monitorsProcessed: dueMonitors.length,
      jobsCreated: batchResult.successfulJobs,
      successRate: `${Math.round((batchResult.successfulJobs / batchResult.totalJobs) * 100)}%`
    })

    return result

  } catch (error) {
    const duration = Date.now() - startTime
    console.error('❌ Scheduler cycle failed:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown scheduler error',
      stats: {
        duration,
        timestamp: new Date().toISOString()
      }
    }
  }
})
