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

    // Get token from route params
    const token = getRouterParam(event, 'token')

    if (!token) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invitation token is required'
      })
    }

    // Get Supabase client
    const supabase = await serverSupabaseClient(event)

    // Find the invitation by token
    const { data: invitationData, error: inviteError } = await supabase
      .from('organization_invitations')
      .select(`
        id,
        organization_id,
        email,
        status,
        expires_at,
        organizations!inner (
          id,
          name
        )
      `)
      .eq('token', token)
      .single()

    if (inviteError) {
      if (inviteError.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Invitation not found or invalid token'
        })
      }

      console.error('Error fetching invitation:', inviteError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch invitation details'
      })
    }

    // Check if invitation is still valid
    if (invitationData.status !== 'pending') {
      throw createError({
        statusCode: 409,
        statusMessage: `Invitation has already been ${invitationData.status}`
      })
    }

    // Check if invitation has expired
    const now = new Date()
    const expiresAt = new Date(invitationData.expires_at)
    if (now > expiresAt) {
      // Mark invitation as expired
      await supabase
        .from('organization_invitations')
        .update({ status: 'expired' })
        .eq('id', invitationData.id)

      throw createError({
        statusCode: 410,
        statusMessage: 'Invitation has expired'
      })
    }

    // Verify that the invitation email matches the authenticated user's email
    if (user.email?.toLowerCase() !== invitationData.email.toLowerCase()) {
      throw createError({
        statusCode: 403,
        statusMessage: 'This invitation is for a different email address'
      })
    }

    // Check if user is already a member of this organization
    const { data: existingMember, error: memberCheckError } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', invitationData.organization_id)
      .eq('user_id', user.id)
      .single()

    if (memberCheckError && memberCheckError.code !== 'PGRST116') {
      console.error('Error checking existing membership:', memberCheckError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to check existing membership'
      })
    }

    if (existingMember) {
      // User is already a member, mark invitation as accepted
      await supabase
        .from('organization_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitationData.id)

      throw createError({
        statusCode: 409,
        statusMessage: 'You are already a member of this organization'
      })
    }

    // Add user as member of the organization
    const { error: membershipError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: invitationData.organization_id,
        user_id: user.id,
        role: 'member'
      })

    if (membershipError) {
      console.error('Error creating membership:', membershipError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to add you to the organization'
      })
    }

    // Mark invitation as accepted
    const { error: updateError } = await supabase
      .from('organization_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitationData.id)

    if (updateError) {
      console.error('Error updating invitation status:', updateError)
      // Don't fail the request since the membership was created successfully
    }

    const response: ApiResponse = {
      success: true,
      message: `Successfully joined ${invitationData.organizations.name}`
    }

    return response
  } catch (error: any) {
    console.error('Invitation acceptance error:', error)

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
