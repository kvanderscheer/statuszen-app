/**
 * Queue Service - Database-driven queue management
 *
 * This service handles:
 * - Loading queue configurations from database
 * - Queue health management
 * - Regional queue mapping
 * - Queue CRUD operations
 */

import type { WorkerQueue, WorkerQueueRecord, QueueName } from '~/types/job-queue'
import type { MonitorRegion } from '~/types/monitor'
import { createClient } from '@supabase/supabase-js'

// Cache for queue configurations
let queueCache: WorkerQueue[] = []
let cacheExpiry: number = 0

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
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Convert database record to WorkerQueue interface
 */
function mapRecordToQueue(record: WorkerQueueRecord): WorkerQueue {
  return {
    id: record.id,
    name: record.name,
    region: record.region,
    endpoint: record.endpoint || undefined,
    isActive: record.is_active,
    healthStatus: record.health_status as 'healthy' | 'unhealthy' | 'unknown',
    priority: record.priority,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  }
}

/**
 * Load all queues from database with caching
 */
export async function getAllQueues(forceRefresh: boolean = false): Promise<WorkerQueue[]> {
  const now = Date.now()
  
  // Return cached data if still valid and not forcing refresh
  if (!forceRefresh && queueCache.length > 0 && now < cacheExpiry) {
    return queueCache
  }

  try {
    // Use service role client for server-side operations
    const supabase = getSupabaseServiceRoleClient()
    
    const { data, error } = await supabase
      .from('worker_queues')
      .select('*')
      .order('priority', { ascending: true })
    
    if (error) {
      console.error('Failed to load queues from database:', error)
      // Return cached data if available, otherwise empty array
      return queueCache.length > 0 ? queueCache : []
    }

    // Update cache
    queueCache = (data || []).map(mapRecordToQueue)
    cacheExpiry = now + CACHE_TTL
    
    return queueCache
  } catch (error) {
    console.error('Database connection error:', error)
    // Return cached data if available
    return queueCache.length > 0 ? queueCache : []
  }
}

/**
 * Get active queues only
 */
export async function getActiveQueues(forceRefresh: boolean = false): Promise<WorkerQueue[]> {
  const allQueues = await getAllQueues(forceRefresh)
  return allQueues.filter(queue => queue.isActive)
}

/**
 * Get queue by name
 */
export async function getQueueByName(name: QueueName): Promise<WorkerQueue | null> {
  const queues = await getAllQueues()
  return queues.find(queue => queue.name === name) || null
}

/**
 * Get queues by region with fallback logic
 */
export async function getQueuesByRegion(region: MonitorRegion): Promise<WorkerQueue[]> {
  const activeQueues = await getActiveQueues()
  
  // First, find exact region matches
  const exactMatches = activeQueues.filter(queue => queue.region === region)
  if (exactMatches.length > 0) {
    return exactMatches.sort((a, b) => a.priority - b.priority)
  }

  // Fallback logic for regions without dedicated queues
  const fallbackRegions: Record<MonitorRegion, MonitorRegion[]> = {
    'us-west': ['us-east'],
    'eu-central': ['eu-west'],
    'ap-south': ['us-east', 'eu-west'],
    'ap-southeast': ['us-east', 'eu-west'],
    'us-east': ['us-west'],
    'eu-west': ['eu-central'],
    'local': ['us-east', 'eu-west']
  }

  const fallbacks = fallbackRegions[region] || []
  for (const fallbackRegion of fallbacks) {
    const fallbackQueues = activeQueues.filter(queue => queue.region === fallbackRegion)
    if (fallbackQueues.length > 0) {
      return fallbackQueues.sort((a, b) => a.priority - b.priority)
    }
  }

  // Last resort: return all active queues
  return activeQueues.sort((a, b) => a.priority - b.priority)
}

/**
 * Get preferred queue for a region (first available queue)
 */
export async function getPreferredQueueForRegion(region: MonitorRegion): Promise<WorkerQueue | null> {
  const queues = await getQueuesByRegion(region)
  return queues.length > 0 ? queues[0] : null
}

/**
 * Get all queue names (for backward compatibility)
 */
export async function getAllQueueNames(): Promise<QueueName[]> {
  const queues = await getActiveQueues()
  return queues.map(queue => queue.name)
}

/**
 * Update queue health status
 */
export async function updateQueueHealth(name: QueueName, healthStatus: 'healthy' | 'unhealthy' | 'unknown'): Promise<boolean> {
  try {
    const supabase = getSupabaseServiceRoleClient()
    
    const { error } = await supabase
      .from('worker_queues')
      .update({ 
        health_status: healthStatus,
        updated_at: new Date().toISOString()
      })
      .eq('name', name)
    
    if (error) {
      console.error(`Failed to update health status for queue ${name}:`, error)
      return false
    }

    // Invalidate cache to force refresh
    cacheExpiry = 0
    
    return true
  } catch (error) {
    console.error(`Database error updating health for queue ${name}:`, error)
    return false
  }
}

/**
 * Create new queue
 */
export async function createQueue(queueData: {
  name: string
  region: MonitorRegion
  endpoint?: string
  priority?: number
}): Promise<WorkerQueue | null> {
  try {
    const supabase = getSupabaseServiceRoleClient()
    
    const { data, error } = await supabase
      .from('worker_queues')
      .insert({
        name: queueData.name,
        region: queueData.region,
        endpoint: queueData.endpoint || null,
        priority: queueData.priority || 1,
        is_active: true,
        health_status: 'unknown'
      })
      .select()
      .single()
    
    if (error) {
      console.error('Failed to create queue:', error)
      return null
    }

    // Invalidate cache
    cacheExpiry = 0
    
    return mapRecordToQueue(data)
  } catch (error) {
    console.error('Database error creating queue:', error)
    return null
  }
}

/**
 * Update queue configuration
 */
export async function updateQueue(
  name: string, 
  updates: Partial<{
    region: MonitorRegion
    endpoint: string
    isActive: boolean
    priority: number
  }>
): Promise<WorkerQueue | null> {
  try {
    const supabase = getSupabaseServiceRoleClient()
    
    const updateData: any = {}
    if (updates.region !== undefined) updateData.region = updates.region
    if (updates.endpoint !== undefined) updateData.endpoint = updates.endpoint
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive
    if (updates.priority !== undefined) updateData.priority = updates.priority
    
    const { data, error } = await supabase
      .from('worker_queues')
      .update(updateData)
      .eq('name', name)
      .select()
      .single()
    
    if (error) {
      console.error(`Failed to update queue ${name}:`, error)
      return null
    }

    // Invalidate cache
    cacheExpiry = 0
    
    return mapRecordToQueue(data)
  } catch (error) {
    console.error(`Database error updating queue ${name}:`, error)
    return null
  }
}

/**
 * Delete queue
 */
export async function deleteQueue(name: string): Promise<boolean> {
  try {
    const supabase = getSupabaseServiceRoleClient()
    
    const { error } = await supabase
      .from('worker_queues')
      .delete()
      .eq('name', name)
    
    if (error) {
      console.error(`Failed to delete queue ${name}:`, error)
      return false
    }

    // Invalidate cache
    cacheExpiry = 0
    
    return true
  } catch (error) {
    console.error(`Database error deleting queue ${name}:`, error)
    return false
  }
}

/**
 * Clear queue cache (useful for testing or manual refresh)
 */
export function clearQueueCache(): void {
  queueCache = []
  cacheExpiry = 0
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  total: number
  active: number
  regions: string[]
  healthStatus: Record<string, number>
}> {
  const allQueues = await getAllQueues()
  
  const stats = {
    total: allQueues.length,
    active: allQueues.filter(q => q.isActive).length,
    regions: [...new Set(allQueues.map(q => q.region))],
    healthStatus: {
      healthy: allQueues.filter(q => q.healthStatus === 'healthy').length,
      unhealthy: allQueues.filter(q => q.healthStatus === 'unhealthy').length,
      unknown: allQueues.filter(q => q.healthStatus === 'unknown').length
    }
  }
  
  return stats
}