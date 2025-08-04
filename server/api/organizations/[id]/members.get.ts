import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { OrganizationMembersResponse } from '~/types/organization'
import type { OrganizationRole } from '~/types/auth'

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

    // Get organization ID from route params
    const organizationId = getRouterParam(event, 'id')

    if (!organizationId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Organization ID is required'
      })
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(organizationId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid organization ID format'
      })
    }

    // Get Supabase client
    const supabase = await serverSupabaseClient(event)

    // Check if user is a member of this organization
    const { data: membershipData, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single()

    if (membershipError) {
      if (membershipError.code === 'PGRST116') {
        // User is not a member of this organization
        throw createError({
          statusCode: 403,
          statusMessage: 'Access denied - You are not a member of this organization'
        })
      }

      console.error('Error checking membership:', membershipError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to verify organization access'
      })
    }

    // First, get organization members
    const { data: membersData, error: membersError } = await supabase
      .from('organization_members')
      .select(`
        organization_id,
        user_id,
        role,
        joined_at
      `)
      .eq('organization_id', organizationId)
      .order('joined_at', { ascending: true })

    if (membersError) {
      console.error('Error fetching organization members:', membersError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch organization members'
      })
    }

    if (!membersData || membersData.length === 0) {
      return {
        success: true,
        data: []
      }
    }

    // Get user IDs for profile lookup
    const userIds = membersData.map(m => m.user_id)

    // Fetch user profiles separately (now with email column)
    const { data: profilesData, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .in('id', userIds)

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch user profiles'
      })
    }

    // Create map for efficient lookup
    const profileMap = new Map()
    profilesData?.forEach((profile) => {
      profileMap.set(profile.id, profile)
    })

    // Transform data to match client interface
    const members = membersData.map((item) => {
      const profile = profileMap.get(item.user_id)
      return {
        organizationId: item.organization_id,
        userId: item.user_id,
        role: item.role as OrganizationRole,
        joinedAt: item.joined_at,
        user: {
          id: item.user_id,
          fullName: profile?.full_name || 'Unknown User',
          email: profile?.email || 'No email provided'
        }
      }
    })

    const response: OrganizationMembersResponse = {
      success: true,
      data: members
    }

    return response
  } catch (error: any) {
    console.error('Organization members fetch error:', error)

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
