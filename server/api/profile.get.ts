import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { UserProfileRecord, UserProfile } from '~/types/auth'

export default defineEventHandler(async (event) => {
  try {
    // Debug: Log all cookies and headers
    const cookies = parseCookies(event)
    const authHeader = getHeader(event, 'authorization')

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

    // Fetch user profile from database
    const { data: profileData, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single() as { data: UserProfileRecord | null, error: any }

    if (error && error.code !== 'PGRST116') {
      // Only throw error if it's not a "no rows found" error
      console.error('Error fetching profile:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch user profile'
      })
    }

    let profile = profileData

    if (!profile) {
      // Create a basic profile if it doesn't exist
      const defaultProfile = {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        company: null,
        plan: 'free' as const,
        email_verified: !!user.email_confirmed_at,
        timezone: 'UTC'
      }

      const { data: newProfile, error: insertError } = await supabase
        .from('user_profiles')
        .insert(defaultProfile as any)
        .select()
        .single() as { data: UserProfileRecord | null, error: any }

      if (insertError || !newProfile) {
        console.error('Error creating default profile:', insertError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to create user profile'
        })
      }

      profile = newProfile
    }

    // Transform database record to client format
    const userProfile: UserProfile = {
      id: profile.id,
      email: user.email || '',
      fullName: profile.full_name,
      company: profile.company || undefined,
      plan: profile.plan,
      emailVerified: profile.email_verified,
      phoneNumber: profile.phone_number || undefined,
      timezone: profile.timezone || 'UTC',
      createdAt: profile.created_at || '',
      updatedAt: profile.updated_at || ''
    }

    return {
      success: true,
      data: userProfile
    }
  } catch (error: any) {
    console.error('Profile fetch error:', error)

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
