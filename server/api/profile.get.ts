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

    // Fetch user profile from database with organization context
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
        email: user.email || null,
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

    // Fetch user's organizations
    let organizations: Array<{ id: string, name: string, role: string }> = []
    let currentOrganizationId = profile.current_organization_id

    try {
      const { data: orgsData, error: orgsError } = await supabase
        .from('organization_members')
        .select(`
          role,
          organizations!inner (
            id,
            name,
            description,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id)

      if (orgsError) {
        console.error('Error fetching user organizations:', orgsError)
      } else if (orgsData) {
        organizations = orgsData.map((item: any) => ({
          id: item.organizations.id,
          name: item.organizations.name,
          role: item.role
        }))
      }

      // If user has no current organization set but has organizations, set the first one
      if (!currentOrganizationId && organizations.length > 0) {
        currentOrganizationId = organizations[0].id

        // Update the user's current organization
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ current_organization_id: currentOrganizationId })
          .eq('id', user.id)

        if (updateError) {
          console.error('Error setting current organization:', updateError)
        }
      }

      // If user has no organizations at all, create a personal one
      if (organizations.length === 0) {
        try {
          console.log('Creating personal organization for existing user:', user.id)

          const { data: orgData, error: orgError } = await supabase
            .rpc('create_organization_with_owner', {
              org_name: `${profile.full_name}'s Organization`,
              org_description: 'Personal organization',
              owner_id: user.id
            })

          if (!orgError && orgData && orgData.length > 0) {
            const newOrg = orgData[0]
            currentOrganizationId = newOrg.id

            organizations.push({
              id: newOrg.id,
              name: newOrg.name,
              role: 'owner'
            })

            // Update user's current organization
            await supabase
              .from('user_profiles')
              .update({ current_organization_id: newOrg.id })
              .eq('id', user.id)

            console.log('✅ Personal organization created for existing user')
          }
        } catch (orgCreateError) {
          console.error('Failed to create personal organization for existing user:', orgCreateError)
        }
      }
    } catch (err) {
      console.error('Error in organization setup:', err)
    }

    // Transform database record to client format
    const userProfile: UserProfile = {
      id: profile.id,
      email: user.email || '',
      fullName: profile.full_name,
      emailVerified: profile.email_verified,
      phoneNumber: profile.phone_number || undefined,
      timezone: profile.timezone || 'UTC',
      createdAt: profile.created_at || '',
      updatedAt: profile.updated_at || '',
      currentOrganizationId: currentOrganizationId || undefined,
      organizations: organizations
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
