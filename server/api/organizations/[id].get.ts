import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { OrganizationResponse } from '~/types/organization'
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

    // Check if user is a member of this organization and get their role
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

    // Fetch organization details
    const { data: organizationData, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()

    if (orgError) {
      if (orgError.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Organization not found'
        })
      }

      console.error('Error fetching organization:', orgError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch organization details'
      })
    }

    // Get member count
    const { data: memberCountData, error: countError } = await supabase
      .rpc('get_organization_member_count', { org_id: organizationId })

    if (countError) {
      console.error('Error getting member count:', countError)
      // Continue without member count rather than failing
    }

    const memberCount = memberCountData || 0

    // Transform to client format
    const organization = {
      id: organizationData.id,
      name: organizationData.name,
      description: organizationData.description || undefined,
      createdAt: organizationData.created_at,
      updatedAt: organizationData.updated_at,
      role: membershipData.role as OrganizationRole,
      memberCount
    }

    const response: OrganizationResponse = {
      success: true,
      data: organization
    }

    return response
  } catch (error: any) {
    console.error('Organization fetch error:', error)

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
