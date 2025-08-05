import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { MonitorMutationResponse, Monitor, CreateMonitorData } from '~/types/monitor'
import { validateCreateMonitorData, processMonitorUrl, mergeConfigWithDefaults } from '~/utils/monitor-validation'

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

    // Parse request body
    const body = await readBody(event)
    const createData: CreateMonitorData = {
      name: body.name,
      url: body.url,
      type: body.type,
      config: body.config,
      checkIntervalMinutes: body.checkIntervalMinutes || 5,
      preferredRegion: body.preferredRegion || 'us-east',
      organizationId: body.organizationId
    }

    // Validate input data
    const validationErrors = validateCreateMonitorData(createData)
    if (validationErrors.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Validation failed',
        data: { errors: validationErrors }
      })
    }

    // Get Supabase client
    const supabase = await serverSupabaseClient(event)

    // Verify user has access to the organization
    const { data: memberCheck, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('organization_id', createData.organizationId)
      .eq('user_id', user.id)
      .single()

    if (memberError || !memberCheck) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied - Not a member of this organization'
      })
    }

    // Process URL based on monitor type
    const processedUrl = processMonitorUrl(createData.url, createData.type)

    // Merge configuration with defaults
    const finalConfig = createData.config
      ? mergeConfigWithDefaults(createData.type, createData.config)
      : mergeConfigWithDefaults(createData.type, {})

    // Calculate next check time
    const now = new Date()
    const intervalMinutes = createData.checkIntervalMinutes || 5
    const nextCheckAt = new Date(now.getTime() + (intervalMinutes * 60 * 1000))

    // Create monitor record
    const monitorRecord = {
      organization_id: createData.organizationId,
      name: createData.name.trim(),
      url: processedUrl,
      type: createData.type,
      config: finalConfig,
      check_interval_minutes: intervalMinutes,
      preferred_region: createData.preferredRegion,
      next_check_at: nextCheckAt.toISOString(),
      is_active: true
    }

    const { data: newMonitor, error: insertError } = await supabase
      .from('monitors')
      .insert([monitorRecord])
      .select()
      .single()

    if (insertError) {
      console.error('Error creating monitor:', insertError)

      // Handle specific database errors
      if (insertError.code === '23505') {
        throw createError({
          statusCode: 400,
          statusMessage: 'A monitor with this name already exists in the organization'
        })
      }

      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create monitor'
      })
    }

    // Transform data to match client interface
    const monitor: Monitor = {
      id: newMonitor.id,
      organizationId: newMonitor.organization_id,
      name: newMonitor.name,
      url: newMonitor.url,
      type: newMonitor.type,
      config: newMonitor.config || {},
      checkIntervalMinutes: newMonitor.check_interval_minutes,
      preferredRegion: newMonitor.preferred_region,
      lastScheduledAt: newMonitor.last_scheduled_at,
      nextCheckAt: newMonitor.next_check_at,
      isActive: newMonitor.is_active,
      createdAt: newMonitor.created_at,
      updatedAt: newMonitor.updated_at
    }

    const response: MonitorMutationResponse = {
      success: true,
      data: monitor,
      message: 'Monitor created successfully'
    }

    return response
  } catch (error) {
    console.error('Monitor creation error:', error)

    // If it's already a structured error, re-throw it
    if ((error as any)?.statusCode) {
      throw error
    }

    // Otherwise, create a generic server error
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})
