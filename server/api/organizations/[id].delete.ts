import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { ApiResponse } from '~/types/organization'

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

    // Check if user is an owner of this organization
    const { data: membershipData, error: ownerCheckError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single()

    if (ownerCheckError) {
      console.error('Error checking ownership:', ownerCheckError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to verify organization ownership'
      })
    }

    if (!membershipData || membershipData.role !== 'owner') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied - Only organization owners can delete organizations'
      })
    }

    // Check if organization exists
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
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
        statusMessage: 'Failed to verify organization exists'
      })
    }

    // Get all members of this organization
    const { data: members, error: membersError } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', organizationId)

    if (membersError) {
      console.error('Error fetching organization members:', membersError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch organization members'
      })
    }

    // Safety check: Prevent deletion if it would leave any user without an organization
    // Check if any member would be left without an organization
    if (members && members.length > 0) {
      for (const member of members) {
        const { data: userOrgsCount, error: countError } = await supabase
          .from('organization_members')
          .select('organization_id', { count: 'exact' })
          .eq('user_id', member.user_id)

        if (countError) {
          console.error('Error counting user organizations:', countError)
          throw createError({
            statusCode: 500,
            statusMessage: 'Failed to verify member organizations'
          })
        }

        // If user only belongs to this organization, we cannot delete it
        if (userOrgsCount && userOrgsCount.length <= 1) {
          throw createError({
            statusCode: 409,
            statusMessage: 'Cannot delete organization - some members would be left without an organization. Please ensure all members belong to other organizations first.'
          })
        }
      }
    }

    // Delete the organization (CASCADE will handle members and invitations)
    const { error: deleteError } = await supabase
      .from('organizations')
      .delete()
      .eq('id', organizationId)

    if (deleteError) {
      console.error('Error deleting organization:', deleteError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to delete organization'
      })
    }

    const response: ApiResponse = {
      success: true,
      message: `Organization "${orgData.name}" deleted successfully`
    }

    return response
  } catch (error: any) {
    console.error('Organization deletion error:', error)

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
