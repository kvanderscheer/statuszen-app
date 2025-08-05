import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { MonitorsListResponse, Monitor } from '~/types/monitor'

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

    // Get Supabase client
    const supabase = await serverSupabaseClient(event)

    // Parse query parameters
    const query = getQuery(event)
    const page = Math.max(1, parseInt(query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 20))
    const offset = (page - 1) * limit

    // Optional filters
    const organizationId = query.organizationId as string
    const type = query.type as string
    const isActive = query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined
    const search = query.search as string

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

    if (organizationIds.length === 0) {
      // User has no organizations, return empty list
      const response: MonitorsListResponse = {
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          hasMore: false
        }
      }
      return response
    }

    // Build query for monitors with organization access check
    let monitorsQuery = supabase
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
      .in('organization_id', organizationIds)

    // Apply filters
    if (organizationId) {
      monitorsQuery = monitorsQuery.eq('organization_id', organizationId)
    }

    if (type) {
      monitorsQuery = monitorsQuery.eq('type', type)
    }

    if (isActive !== undefined) {
      monitorsQuery = monitorsQuery.eq('is_active', isActive)
    }

    if (search) {
      monitorsQuery = monitorsQuery.or(`name.ilike.%${search}%,url.ilike.%${search}%`)
    }

    // Get total count for pagination
    const countQuery = supabase
      .from('monitors')
      .select('*', { count: 'exact', head: true })
      .in('organization_id', organizationIds)

    // Apply same filters for counting
    if (organizationId) {
      countQuery.eq('organization_id', organizationId)
    }
    if (type) {
      countQuery.eq('type', type)
    }
    if (isActive !== undefined) {
      countQuery.eq('is_active', isActive)
    }
    if (search) {
      countQuery.or(`name.ilike.%${search}%,url.ilike.%${search}%`)
    }

    const { count: totalCount, error: countError } = await countQuery

    if (countError) {
      console.error('Error counting monitors:', countError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to count monitors'
      })
    }

    // Get paginated results
    const { data: monitorsData, error } = await monitorsQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching monitors:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch monitors'
      })
    }

    // Transform data to match client interface
    const monitors: Monitor[] = monitorsData?.map(item => ({
      id: item.id,
      organizationId: item.organization_id,
      name: item.name,
      url: item.url,
      type: item.type,
      config: item.config || {},
      checkIntervalMinutes: item.check_interval_minutes,
      preferredRegion: item.preferred_region,
      lastScheduledAt: item.last_scheduled_at,
      nextCheckAt: item.next_check_at,
      isActive: item.is_active,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    })) || []

    const response: MonitorsListResponse = {
      success: true,
      data: monitors,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        hasMore: (offset + limit) < (totalCount || 0)
      }
    }

    return response
  } catch (error) {
    console.error('Monitors list error:', error)

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
