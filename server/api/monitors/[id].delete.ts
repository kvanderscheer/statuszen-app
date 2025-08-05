import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { MonitorDeleteResponse } from '~/types/monitor'

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

    // First, verify the monitor exists and user has access
    const { data: existingMonitor, error: fetchError } = await supabase
      .from('monitors')
      .select('id, organization_id, name')
      .eq('id', monitorId)
      .in('organization_id', organizationIds)
      .single()

    if (fetchError || !existingMonitor) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Monitor not found or access denied'
      })
    }

    // Check if user wants soft delete or hard delete
    const query = getQuery(event)
    const hardDelete = query.hard === 'true'

    if (hardDelete) {
      // Hard delete - permanently remove the monitor
      const { error: deleteError } = await supabase
        .from('monitors')
        .delete()
        .eq('id', monitorId)

      if (deleteError) {
        console.error('Error deleting monitor:', deleteError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to delete monitor'
        })
      }
    } else {
      // Soft delete - mark as inactive
      const { error: updateError } = await supabase
        .from('monitors')
        .update({
          is_active: false,
          next_check_at: null // Stop scheduling checks
        })
        .eq('id', monitorId)

      if (updateError) {
        console.error('Error deactivating monitor:', updateError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to deactivate monitor'
        })
      }
    }

    const response: MonitorDeleteResponse = {
      success: true,
      data: {
        id: monitorId,
        deleted: hardDelete
      },
      message: hardDelete
        ? 'Monitor permanently deleted'
        : 'Monitor deactivated successfully'
    }

    return response
  } catch (error: any) {
    console.error('Monitor deletion error:', error)

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
