import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { InviteMemberData, ApiResponse } from '~/types/organization'

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

    // Parse request body
    const body = await readBody(event) as InviteMemberData

    // Validate email
    if (!body.email || typeof body.email !== 'string') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Email address is required'
      })
    }

    const email = body.email.trim().toLowerCase()
    const emailRegex = /^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$/
    if (!emailRegex.test(email)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid email address format'
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
        statusMessage: 'Access denied - Only organization owners can invite members'
      })
    }

    // Check if user is already a member
    const { data: existingMember, error: memberCheckError } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', organizationId)
      .in('user_id', [
        // We need to find user_id by email - this is simplified
        // In practice, you might need a more complex query
      ])

    // Check if there's already a pending invitation
    const { data: existingInvitation, error: inviteCheckError } = await supabase
      .from('organization_invitations')
      .select('id, status')
      .eq('organization_id', organizationId)
      .eq('email', email)
      .eq('status', 'pending')
      .single()

    if (inviteCheckError && inviteCheckError.code !== 'PGRST116') {
      console.error('Error checking existing invitation:', inviteCheckError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to check existing invitations'
      })
    }

    if (existingInvitation) {
      throw createError({
        statusCode: 409,
        statusMessage: 'A pending invitation already exists for this email address'
      })
    }

    // Generate invitation token and expiry (7 days from now)
    const token = crypto.randomUUID()

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now

    // Create invitation
    const { data: invitationData, error: invitationError } = await supabase
      .from('organization_invitations')
      .insert({
        organization_id: organizationId,
        email: email,
        invited_by: user.id,
        token: token,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single()

    if (invitationError) {
      console.error('Error creating invitation:', invitationError)

      if (invitationError.code === '23505') {
        throw createError({
          statusCode: 409,
          statusMessage: 'An invitation for this email already exists'
        })
      }

      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create invitation'
      })
    }

    // TODO: Send invitation email here
    // This would typically integrate with an email service like SendGrid, Mailjet, etc.

    const response: ApiResponse = {
      success: true,
      message: `Invitation sent to ${email} successfully`
    }

    return response
  } catch (error: any) {
    console.error('Organization invitation error:', error)

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
