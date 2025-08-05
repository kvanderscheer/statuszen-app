import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { MonitorResponse, Monitor } from '~/types/monitor'

export default defineEventHandler(async (event) => {
  try {
    // Get authenticated user
    const user = await serverSupabaseUser(event)

    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - User not authenticated'
      })
    }

    // Get monitor ID from route parameters
    const monitorId = getRouterParam(event, 'id')

    if (!monitorId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Monitor ID is required'
      })
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(monitorId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid monitor ID format'
      })
    }

    // Get Supabase client
    const supabase = await serverSupabaseClient(event)

    // First get user's organization IDs
    const { data: userOrgs, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)

    if (orgError) {
      console.error('Error fetching user organizations:', orgError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch user organizations'
      })
    }

    const organizationIds = userOrgs?.map(row => row.organization_id) || []

    // Fetch monitor with organization access check
    const { data: monitorData, error } = await supabase
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
        is_active,
        created_at,
        updated_at
      `)
      .eq('id', monitorId)
      .in('organization_id', organizationIds)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Monitor not found or access denied'
        })
      }

      console.error('Error fetching monitor:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch monitor'
      })
    }

    if (!monitorData) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Monitor not found or access denied'
      })
    }

    // Transform data to match client interface
    const monitor: Monitor = {
      id: monitorData.id,
      organizationId: monitorData.organization_id,
      name: monitorData.name,
      url: monitorData.url,
      type: monitorData.type,
      config: monitorData.config || {},
      checkIntervalMinutes: monitorData.check_interval_minutes,
      preferredRegion: monitorData.preferred_region,
      lastScheduledAt: monitorData.last_scheduled_at,
      nextCheckAt: monitorData.next_check_at,
      isActive: monitorData.is_active,
      createdAt: monitorData.created_at,
      updatedAt: monitorData.updated_at
    }

    const response: MonitorResponse = {
      success: true,
      data: monitor
    }

    return response
  } catch (error: any) {
    console.error('Monitor fetch error:', error)

    // If it's already a structured error, re-throw it
    if (error.statusCode) {
      throw error
    }

    // Otherwise, create a generic server error
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})
