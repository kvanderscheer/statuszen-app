import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { CreateOrganizationData, OrganizationMutationResponse } from '~/types/organization'

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
    const body = await readBody(event) as CreateOrganizationData

    // Validate input
    if (!body.name || typeof body.name !== 'string') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Organization name is required'
      })
    }

    const name = body.name.trim()
    if (name.length < 2 || name.length > 100) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Organization name must be between 2 and 100 characters'
      })
    }

    const description = body.description?.trim() || null
    if (description && description.length > 500) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Organization description cannot exceed 500 characters'
      })
    }

    // Get Supabase client
    const supabase = await serverSupabaseClient(event)

    // Use the helper function to create organization with owner
    const { data: orgId, error: createError } = await supabase
      .rpc('create_organization_with_owner', {
        org_name: name,
        org_description: description,
        owner_id: user.id
      })

    if (createError) {
      console.error('Error creating organization:', createError)

      // Handle specific database errors
      if (createError.code === '23505') {
        throw createError({
          statusCode: 409,
          statusMessage: 'An organization with this name already exists'
        })
      }

      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create organization'
      })
    }

    // Fetch the created organization details
    const { data: organizationData, error: fetchError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single()

    if (fetchError || !organizationData) {
      console.error('Error fetching created organization:', fetchError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Organization created but failed to fetch details'
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
      message: 'Organization created successfully'
    }

    return response
  } catch (error: any) {
    console.error('Organization creation error:', error)

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
