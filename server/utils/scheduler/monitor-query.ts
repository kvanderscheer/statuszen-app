/**
 * Database query functions for monitor scheduling
 *
 * This module handles:
 * - Fetching monitors due for checking
 * - Updating scheduling timestamps
 * - Database optimization for large-scale queries
 */

import { createClient } from '@supabase/supabase-js'
import type { SchedulableMonitor, MonitorQueryFilters, MonitorTimestampUpdate } from '../../types/scheduler'

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
 * Fetch monitors that are due for checking
 */
export async function fetchDueMonitors(filters?: MonitorQueryFilters): Promise<SchedulableMonitor[]> {
  try {
    // Use service role client for server-side operations
    const supabase = getSupabaseServiceRoleClient()

    // Build query for monitors due for checking
    let query = supabase
      .from('monitors')
      .select(`
        id,
        organization_id,
        name,
        url,
        type,
        config,
        check_interval_minutes,
        preferred_region,
        last_scheduled_at,
        next_check_at,
        is_active
      `)
      .eq('is_active', true)
      .lte('next_check_at', new Date().toISOString())

    // Apply optional filters
    if (filters?.organizationIds && filters.organizationIds.length > 0) {
      query = query.in('organization_id', filters.organizationIds)
    }

    if (filters?.regions && filters.regions.length > 0) {
      query = query.in('preferred_region', filters.regions)
    }

    if (filters?.types && filters.types.length > 0) {
      query = query.in('type', filters.types)
    }

    if (filters?.beforeTime) {
      query = query.lte('next_check_at', filters.beforeTime.toISOString())
    }

    // Apply limit with default maximum
    const limit = Math.min(filters?.maxResults || 1000, 1000)
    query = query.limit(limit)

    // Order by next_check_at for fairest scheduling
    query = query.order('next_check_at', { ascending: true })

    const { data, error } = await query

    if (error) {
      // Handle the case where monitors table doesn't exist yet
      if (error.message.includes('relation "monitors" does not exist') || 
          error.message.includes('table "monitors" doesn\'t exist')) {
        console.warn('Monitors table does not exist yet, returning empty array')
        return []
      }
      
      console.error('Error fetching due monitors:', error)
      throw new Error(`Database query failed: ${error.message}`)
    }

    // Transform to SchedulableMonitor format
    return data?.map((item: any) => ({
      id: item.id,
      organization_id: item.organization_id,
      name: item.name,
      url: item.url,
      type: item.type,
      config: item.config || {},
      check_interval_minutes: item.check_interval_minutes,
      preferred_region: item.preferred_region,
      last_scheduled_at: item.last_scheduled_at,
      next_check_at: item.next_check_at,
      is_active: item.is_active
    })) || []
  } catch (error) {
    console.error('fetchDueMonitors error:', error)
    throw error
  }
}

/**
 * Update scheduling timestamps for processed monitors
 */
/**
 * Update timestamps for monitors using their individual check intervals
 */
export async function updateMonitorTimestamps(monitorsOrIds: string[] | SchedulableMonitor[]): Promise<number> {
  if (monitorsOrIds.length === 0) return 0

  try {
    const supabase = getSupabaseServiceRoleClient()
    const now = new Date().toISOString()

    let updatedCount = 0

    // Check if we have monitor objects or just IDs
    const isMonitorObjects = monitorsOrIds.length > 0 && typeof monitorsOrIds[0] === 'object'

    if (isMonitorObjects) {
      // We have full monitor objects with intervals - more efficient
      const monitors = monitorsOrIds as SchedulableMonitor[]

      for (const monitor of monitors) {
        try {
          // Calculate next check time using the monitor's specific interval
          const nextCheck = calculateNextCheckTime(monitor.check_interval_minutes, new Date()).toISOString()

          // Update the timestamps
          const { error } = await supabase
            .from('monitors')
            .update({
              last_scheduled_at: now,
              next_check_at: nextCheck
            })
            .eq('id', monitor.id)

          if (!error) {
            updatedCount++
          } else {
            console.warn(`Failed to update timestamps for monitor ${monitor.id}:`, error)
          }
        } catch (err) {
          console.warn(`Error processing monitor ${monitor.id}:`, err)
        }
      }
    } else {
      // We only have IDs - need to fetch intervals
      const monitorIds = monitorsOrIds as string[]

      for (const monitorId of monitorIds) {
        try {
          // First, get the monitor's check interval
          const { data: monitor, error: fetchError } = await supabase
            .from('monitors')
            .select('check_interval_minutes')
            .eq('id', monitorId)
            .single()

          if (fetchError || !monitor) {
            console.warn(`Failed to fetch monitor ${monitorId}:`, fetchError)
            continue
          }

          // Calculate next check time using the monitor's specific interval
          const nextCheck = calculateNextCheckTime(monitor.check_interval_minutes, new Date()).toISOString()

          // Update the timestamps
          const { error } = await supabase
            .from('monitors')
            .update({
              last_scheduled_at: now,
              next_check_at: nextCheck
            })
            .eq('id', monitorId)

          if (!error) {
            updatedCount++
          } else {
            console.warn(`Failed to update timestamps for monitor ${monitorId}:`, error)
          }
        } catch (err) {
          console.warn(`Error processing monitor ${monitorId}:`, err)
        }
      }
    }

    return updatedCount
  } catch (error) {
    console.error('updateMonitorTimestamps error:', error)
    return 0
  }
}

/**
 * Original batch update function (preserved for full implementation)
 */
export async function updateMonitorTimestampsBatch(updates: MonitorTimestampUpdate[]): Promise<boolean> {
  try {
    const supabase = getSupabaseServiceRoleClient()

    // Process updates in batches of 50 for performance
    const batchSize = 50
    const batches = []

    for (let i = 0; i < updates.length; i += batchSize) {
      batches.push(updates.slice(i, i + batchSize))
    }

    // Execute all batches
    for (const batch of batches) {
      const updatePromises = batch.map(update =>
        supabase
          .from('monitors')
          .update({
            last_scheduled_at: update.timestamps.last_scheduled_at,
            next_check_at: update.timestamps.next_check_at
          })
          .eq('id', update.monitorId)
      )

      const results = await Promise.allSettled(updatePromises)

      // Check for any failures
      const failures = results.filter(result => result.status === 'rejected')
      if (failures.length > 0) {
        console.error('Some timestamp updates failed:', failures)
        // Continue processing but log the failures
      }
    }

    return true
  } catch (error) {
    console.error('updateMonitorTimestamps error:', error)
    throw new Error(`Failed to update monitor timestamps: ${error}`)
  }
}

/**
 * Calculate next check time based on interval
 */
export function calculateNextCheckTime(intervalMinutes: number, lastScheduled?: Date): Date {
  const baseTime = lastScheduled || new Date()
  const nextCheck = new Date(baseTime.getTime() + (intervalMinutes * 60 * 1000))
  return nextCheck
}

/**
 * Generate batch timestamp updates for monitors
 */
export function generateTimestampUpdates(monitors: SchedulableMonitor[]): MonitorTimestampUpdate[] {
  const now = new Date()
  
  return monitors.map(monitor => ({
    monitorId: monitor.id,
    timestamps: {
      last_scheduled_at: now.toISOString(),
      next_check_at: calculateNextCheckTime(monitor.check_interval_minutes, now).toISOString()
    }
  }))
}

/**
 * Get count of monitors due for checking (for monitoring/metrics)
 */
export async function getMonitorsDueCount(filters?: MonitorQueryFilters): Promise<number> {
  try {
    const supabase = getSupabaseServiceRoleClient()

    let query = supabase
      .from('monitors')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .lte('next_check_at', new Date().toISOString())

    // Apply same filters as fetchDueMonitors
    if (filters?.organizationIds && filters.organizationIds.length > 0) {
      query = query.in('organization_id', filters.organizationIds)
    }

    if (filters?.regions && filters.regions.length > 0) {
      query = query.in('preferred_region', filters.regions)
    }

    if (filters?.types && filters.types.length > 0) {
      query = query.in('type', filters.types)
    }

    if (filters?.beforeTime) {
      query = query.lte('next_check_at', filters.beforeTime.toISOString())
    }

    const { count, error } = await query

    if (error) {
      console.error('Error counting due monitors:', error)
      throw new Error(`Count query failed: ${error.message}`)
    }

    return count || 0
  } catch (error) {
    console.error('getMonitorsDueCount error:', error)
    throw error
  }
}
