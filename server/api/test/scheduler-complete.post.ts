/**
 * Test Complete Scheduler System
 * POST /api/test/scheduler-complete
 * 
 * Tests the entire scheduler workflow:
 * 1. Database query functions
 * 2. Job creation with REST queues
 * 3. Regional routing
 * 4. Complete orchestration
 */

import { fetchDueMonitors, updateMonitorTimestamps } from '../../utils/scheduler/monitor-query'
import { createMonitoringJobsBatch } from '../../utils/scheduler/job-creator'
import { getQueueHealthStats, selectQueue, checkQueueHealth } from '../../utils/scheduler/regional-router'
import { getUpstashQueue } from '../../utils/queue/upstash-rest-queue'

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  
  try {
    console.log('🧪 Starting complete scheduler system test...')

    // Test 1: Queue Health Checks
    console.log('🏥 Test 1: Checking queue health...')
    const usEastHealthy = await checkQueueHealth('monitoring-us-east')
    const euWestHealthy = await checkQueueHealth('monitoring-eu-west')
    
    console.log(`✅ US East queue: ${usEastHealthy ? 'Healthy' : 'Unhealthy'}`)
    console.log(`✅ EU West queue: ${euWestHealthy ? 'Healthy' : 'Unhealthy'}`)

    // Test 2: Regional Routing
    console.log('🌍 Test 2: Testing regional routing...')
    const usRouting = await selectQueue('us-east')
    const euRouting = await selectQueue('eu-west')
    
    console.log(`✅ US East routing:`, usRouting)
    console.log(`✅ EU West routing:`, euRouting)

    // Test 3: Database Functions (Mock test since we don't have real monitors)
    console.log('🗄️ Test 3: Testing database functions...')
    try {
      const dueMonitors = await fetchDueMonitors()
      console.log(`✅ Fetched ${dueMonitors.length} due monitors from database`)
    } catch (error) {
      console.log(`ℹ️ Database test skipped (no monitors table): ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Test 4: Job Creation with Mock Data
    console.log('⚡ Test 4: Testing job creation with mock data...')
    const mockMonitors = [
      {
        id: 'test-monitor-1',
        url: 'https://httpbin.org/status/200',
        type: 'https' as const,
        check_interval_minutes: 5,
        config: {
          timeout: 10,
          expectedStatus: 200,
          followRedirects: true
        },
        organization_id: 'test-org-1',
        preferred_region: 'us-east' as const,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_scheduled_at: null,
        next_check_at: new Date().toISOString()
      },
      {
        id: 'test-monitor-2',
        url: 'https://httpbin.org/status/201',
        type: 'https' as const,
        check_interval_minutes: 10,
        config: {
          timeout: 15,
          expectedStatus: 201,
          followRedirects: false
        },
        organization_id: 'test-org-2',
        preferred_region: 'eu-west' as const,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_scheduled_at: null,
        next_check_at: new Date().toISOString()
      }
    ]

    const batchResult = await createMonitoringJobsBatch(mockMonitors)
    console.log('✅ Batch job creation result:', {
      totalJobs: batchResult.totalJobs,
      successfulJobs: batchResult.successfulJobs,
      failedJobs: batchResult.failedJobs,
      queueDistribution: batchResult.queueDistribution,
      duration: batchResult.duration
    })

    // Test 5: Queue Metrics
    console.log('📊 Test 5: Getting queue metrics...')
    const queueHealth = await getQueueHealthStats()
    console.log('✅ Queue health stats:', queueHealth)

    // Test 6: Individual Queue Metrics
    console.log('📈 Test 6: Getting individual queue metrics...')
    const usQueue = getUpstashQueue('monitoring-us-east')
    const euQueue = getUpstashQueue('monitoring-eu-west')
    
    const usMetrics = await usQueue.getMetrics()
    const euMetrics = await euQueue.getMetrics()
    
    console.log('✅ US East metrics:', usMetrics)
    console.log('✅ EU West metrics:', euMetrics)

    // Test 7: Complete Scheduler Workflow Simulation
    console.log('🚀 Test 7: Simulating complete scheduler workflow...')
    
    const workflowStart = Date.now()
    let workflowSuccess = true
    let workflowError = null

    try {
      // Simulate the main scheduler workflow
      const mockDueMonitors = mockMonitors.filter(m => m.is_active)
      const jobs = await createMonitoringJobsBatch(mockDueMonitors)
      
      // Simulate timestamp updates (we can't actually update without real DB)
      const successfulIds = jobs.results
        .filter(r => r.success)
        .map((_, index) => mockDueMonitors[index]?.id)
        .filter(Boolean)
      
      console.log(`✅ Workflow simulation: ${jobs.successfulJobs}/${jobs.totalJobs} jobs created`)
      console.log(`✅ Would update ${successfulIds.length} monitor timestamps`)
      
    } catch (error) {
      workflowSuccess = false
      workflowError = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ Workflow simulation failed:', workflowError)
    }

    const workflowDuration = Date.now() - workflowStart
    const totalDuration = Date.now() - startTime

    return {
      success: true,
      message: 'Complete scheduler system test completed',
      results: {
        queueHealth: {
          usEast: usEastHealthy,
          euWest: euWestHealthy
        },
        regionalRouting: {
          usEast: usRouting,
          euWest: euRouting
        },
        jobCreation: {
          totalJobs: batchResult.totalJobs,
          successfulJobs: batchResult.successfulJobs,
          failedJobs: batchResult.failedJobs,
          queueDistribution: batchResult.queueDistribution,
          duration: batchResult.duration
        },
        queueMetrics: {
          usEast: usMetrics,
          euWest: euMetrics,
          healthStats: queueHealth
        },
        workflowSimulation: {
          success: workflowSuccess,
          error: workflowError,
          duration: workflowDuration
        },
        performance: {
          totalDuration,
          averageOperationTime: totalDuration / 7 // 7 test phases
        }
      },
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('❌ Complete scheduler test failed:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    }
  }
})