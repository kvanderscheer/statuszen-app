import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { OrganizationsListResponse } from '~/types/organization'
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

    // Get Supabase client
    const supabase = await serverSupabaseClient(event)

    // Fetch user's organizations with their role
    const { data: organizationsData, error } = await supabase
      .from('organization_members')
      .select(`
        role,
        organization_id,
        joined_at,
        organizations!inner (
          id,
          name,
          description,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })

    if (error) {
      console.error('Error fetching organizations:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch organizations'
      })
    }

    // Transform data to match client interface
    const organizations = organizationsData?.map(item => ({
      id: item.organizations.id,
      name: item.organizations.name,
      description: item.organizations.description || undefined,
      createdAt: item.organizations.created_at,
      updatedAt: item.organizations.updated_at,
      role: item.role as OrganizationRole
    })) || []

    const response: OrganizationsListResponse = {
      success: true,
      data: organizations
    }

    return response
  } catch (error: any) {
    console.error('Organizations list error:', error)

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
