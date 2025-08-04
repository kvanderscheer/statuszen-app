import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { UpdateOrganizationData, OrganizationMutationResponse } from '~/types/organization'

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

    // Parse request body
    const body = await readBody(event) as UpdateOrganizationData

    // Validate that we have at least one field to update
    if (!body.name && !body.description && body.description !== '') {
      throw createError({
        statusCode: 400,
        statusMessage: 'At least one field must be provided for update'
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
        statusMessage: 'Access denied - Only organization owners can update organization details'
      })
    }

    // Prepare update data
    const updateData: any = {}

    if (body.name !== undefined) {
      const name = body.name.trim()
      if (name.length < 2 || name.length > 100) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Organization name must be between 2 and 100 characters'
        })
      }
      updateData.name = name
    }

    if (body.description !== undefined) {
      const description = body.description.trim()
      if (description.length > 500) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Organization description cannot exceed 500 characters'
        })
      }
      updateData.description = description || null
    }

    // Update organization
    const { data: organizationData, error: updateError } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating organization:', updateError)

      // Handle specific database errors
      if (updateError.code === '23505') {
        throw createError({
          statusCode: 409,
          statusMessage: 'An organization with this name already exists'
        })
      }

      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update organization'
      })
    }

    // Transform to client format
    const organization = {
      id: organizationData.id,
      name: organizationData.name,
      description: organizationData.description || undefined,
      createdAt: organizationData.created_at,
      updatedAt: organizationData.updated_at
    }

    const response: OrganizationMutationResponse = {
      success: true,
      data: organization,
      message: 'Organization updated successfully'
    }

    return response
  } catch (error: any) {
    console.error('Organization update error:', error)

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
