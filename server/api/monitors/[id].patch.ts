import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { MonitorMutationResponse, Monitor, UpdateMonitorData } from '~/types/monitor'
import { validateUpdateMonitorData, processMonitorUrl, mergeConfigWithDefaults } from '~/utils/monitor-validation'

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

    // Parse request body
    const body = await readBody(event)
    const updateData: UpdateMonitorData = {
      name: body.name,
      url: body.url,
      type: body.type,
      config: body.config,
      checkIntervalMinutes: body.checkIntervalMinutes,
      preferredRegion: body.preferredRegion,
      isActive: body.isActive
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

    // First, fetch the existing monitor to verify access and get current data
    const { data: existingMonitor, error: fetchError } = await supabase
      .from('monitors')
      .select('*')
      .eq('id', monitorId)
      .in('organization_id', organizationIds)
      .single()

    if (fetchError || !existingMonitor) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Monitor not found or access denied'
      })
    }

    // Validate update data with current monitor type
    const validationErrors = validateUpdateMonitorData(updateData, existingMonitor.type)
    if (validationErrors.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Validation failed',
        data: { errors: validationErrors }
      })
    }

    // Prepare update record with only provided fields
    const updateRecord: any = {}

    if (updateData.name !== undefined) {
      updateRecord.name = updateData.name.trim()
    }

    if (updateData.url !== undefined) {
      const finalType = updateData.type || existingMonitor.type
      updateRecord.url = processMonitorUrl(updateData.url, finalType)
    }

    if (updateData.type !== undefined) {
      updateRecord.type = updateData.type

      // If type is changing, reset config to defaults for new type
      if (updateData.type !== existingMonitor.type) {
        updateRecord.config = mergeConfigWithDefaults(updateData.type, {})
      }
    }

    if (updateData.config !== undefined) {
      const finalType = updateData.type || existingMonitor.type
      updateRecord.config = mergeConfigWithDefaults(finalType, updateData.config)
    }

    if (updateData.checkIntervalMinutes !== undefined) {
      updateRecord.check_interval_minutes = updateData.checkIntervalMinutes

      // Recalculate next check time if interval changed
      if (updateData.checkIntervalMinutes !== existingMonitor.check_interval_minutes) {
        const now = new Date()
        updateRecord.next_check_at = new Date(now.getTime() + (updateData.checkIntervalMinutes * 60 * 1000)).toISOString()
      }
    }

    if (updateData.preferredRegion !== undefined) {
      updateRecord.preferred_region = updateData.preferredRegion
    }

    if (updateData.isActive !== undefined) {
      updateRecord.is_active = updateData.isActive

      // If activating a monitor, ensure it has a next check time
      if (updateData.isActive && !existingMonitor.next_check_at) {
        const now = new Date()
        const intervalMinutes = updateData.checkIntervalMinutes || existingMonitor.check_interval_minutes
        updateRecord.next_check_at = new Date(now.getTime() + (intervalMinutes * 60 * 1000)).toISOString()
      }
    }

    // If no fields to update, return current monitor
    if (Object.keys(updateRecord).length === 0) {
      const monitor: Monitor = {
        id: existingMonitor.id,
        organizationId: existingMonitor.organization_id,
        name: existingMonitor.name,
        url: existingMonitor.url,
        type: existingMonitor.type,
        config: existingMonitor.config || {},
        checkIntervalMinutes: existingMonitor.check_interval_minutes,
        preferredRegion: existingMonitor.preferred_region,
        lastScheduledAt: existingMonitor.last_scheduled_at,
        nextCheckAt: existingMonitor.next_check_at,
        isActive: existingMonitor.is_active,
        createdAt: existingMonitor.created_at,
        updatedAt: existingMonitor.updated_at
      }

      return {
        success: true,
        data: monitor,
        message: 'No changes made'
      }
    }

    // Update monitor record
    const { data: updatedMonitor, error: updateError } = await supabase
      .from('monitors')
      .update(updateRecord)
      .eq('id', monitorId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating monitor:', updateError)

      // Handle specific database errors
      if (updateError.code === '23505') {
        throw createError({
          statusCode: 400,
          statusMessage: 'A monitor with this name already exists in the organization'
        })
      }

      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update monitor'
      })
    }

    // Transform data to match client interface
    const monitor: Monitor = {
      id: updatedMonitor.id,
      organizationId: updatedMonitor.organization_id,
      name: updatedMonitor.name,
      url: updatedMonitor.url,
      type: updatedMonitor.type,
      config: updatedMonitor.config || {},
      checkIntervalMinutes: updatedMonitor.check_interval_minutes,
      preferredRegion: updatedMonitor.preferred_region,
      lastScheduledAt: updatedMonitor.last_scheduled_at,
      nextCheckAt: updatedMonitor.next_check_at,
      isActive: updatedMonitor.is_active,
      createdAt: updatedMonitor.created_at,
      updatedAt: updatedMonitor.updated_at
    }

    const response: MonitorMutationResponse = {
      success: true,
      data: monitor,
      message: 'Monitor updated successfully'
    }

    return response
  } catch (error: any) {
    console.error('Monitor update error:', error)

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
