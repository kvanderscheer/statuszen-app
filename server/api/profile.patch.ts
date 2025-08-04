import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { ProfileUpdateData, ProfileUpdateRecord, UserProfileRecord } from '~/types/auth'

// Validation helpers
const validatePhoneNumber = (phone: string): boolean => {
  // Basic E.164 format validation (+ followed by 1-15 digits)
  const phoneRegex = /^\+[1-9]\d{1,14}$/
  return phoneRegex.test(phone)
}

const validateTimezone = (timezone: string): boolean => {
  // Basic timezone validation - should be a valid IANA timezone
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

const validateFullName = (name: string): boolean => {
  // Name should be 2-100 characters, allow letters, spaces, hyphens, apostrophes
  const nameRegex = /^[a-zA-Z\s'-]{2,100}$/
  return nameRegex.test(name.trim())
}

export default defineEventHandler(async (event) => {
  try {
    // Debug: Log all cookies and headers
    const cookies = parseCookies(event)
    const authHeader = getHeader(event, 'authorization')
    console.log('PATCH All cookies:', Object.keys(cookies))
    console.log('PATCH Supabase auth cookie:', cookies['sb-hxdwufyndudktvawiyks-auth-token'] ? 'Present' : 'Missing')
    console.log('PATCH Authorization header:', authHeader ? 'Present' : 'Missing')

    // Get authenticated user
    const user = await serverSupabaseUser(event)

    console.log('PATCH Authenticated user:', user ? { id: user.id, email: user.email } : 'No user')

    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - User not authenticated'
      })
    }

    // Parse and validate request body
    const body = await readBody(event) as ProfileUpdateData

    if (!body || typeof body !== 'object') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request body'
      })
    }

    // Validate each field if provided
    const errors: string[] = []

    if (body.fullName !== undefined) {
      if (!body.fullName || !validateFullName(body.fullName)) {
        errors.push('Full name must be 2-100 characters and contain only letters, spaces, hyphens, and apostrophes')
      }
    }

    if (body.phoneNumber !== undefined && body.phoneNumber !== '') {
      if (!validatePhoneNumber(body.phoneNumber)) {
        errors.push('Phone number must be in international format (e.g., +1234567890)')
      }
    }

    if (body.timezone !== undefined) {
      console.log('Received timezone:', body.timezone, 'Type:', typeof body.timezone)
      if (!body.timezone || !validateTimezone(body.timezone)) {
        console.log('Timezone validation failed for:', body.timezone)
        errors.push('Invalid timezone provided')
      } else {
        console.log('Timezone validation passed for:', body.timezone)
      }
    }

    if (body.company !== undefined && body.company.length > 100) {
      errors.push('Company name cannot exceed 100 characters')
    }

    if (errors.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: `Validation errors: ${errors.join(', ')}`
      })
    }

    // Prepare update data for database
    const updateData: ProfileUpdateRecord = {}

    if (body.fullName !== undefined) {
      updateData.full_name = body.fullName.trim()
    }

    if (body.company !== undefined) {
      updateData.company = body.company.trim() || null
    }

    if (body.phoneNumber !== undefined) {
      updateData.phone_number = body.phoneNumber || null
    }

    if (body.timezone !== undefined) {
      updateData.timezone = body.timezone
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No valid fields provided for update'
      })
    }

    // Get Supabase client and update profile
    const supabase = await serverSupabaseClient(event)

    const { data: updatedProfile, error } = await supabase
      .from('user_profiles')
      .update(updateData as any)
      .eq('id', user.id)
      .select()
      .single() as { data: UserProfileRecord | null, error: any }

    if (error || !updatedProfile) {
      console.error('Error updating profile:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update user profile'
      })
    }

    // Also update Supabase auth user metadata if name changed
    if (body.fullName !== undefined) {
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: body.fullName.trim()
        }
      })

      if (authError) {
        console.warn('Failed to update auth metadata:', authError)
        // Don't fail the request, just log the warning
      }
    }

    return {
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updatedProfile.id,
        fullName: updatedProfile.full_name,
        company: updatedProfile.company || undefined,
        phoneNumber: updatedProfile.phone_number || undefined,
        timezone: updatedProfile.timezone,
        updatedAt: updatedProfile.updated_at
      }
    }
  } catch (error: any) {
    console.error('Profile update error:', error)

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
