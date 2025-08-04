import type { SignupFormData, SignupResponse, ValidationError, UserProfileRecord } from '~/types/auth'
import { validateAllFields } from '~/utils/validation'

export const useSignup = () => {
  const supabase = useSupabaseClient()
  const toast = useToast()

  const isLoading = ref(false)
  const errors = ref<ValidationError[]>([])

  const validateForm = (data: SignupFormData): boolean => {
    const validationErrors = validateAllFields({
      email: data.email,
      password: data.password,
      fullName: data.fullName,
      company: data.company || ''
    })

    errors.value = validationErrors
    return validationErrors.length === 0
  }

  const createUserProfile = async (userId: string, data: SignupFormData) => {
    try {
      console.log('✨ Creating user profile for:', userId)
      console.log('📋 User profile data:', {
        id: userId,
        full_name: data.fullName,
        email_verified: false
      })

      const profileData: UserProfileRecord = {
        id: userId,
        full_name: data.fullName,
        email_verified: false,
        timezone: 'UTC'
      }

      const { error } = await supabase
        .from('user_profiles')
        .insert(profileData as never)

      if (error) {
        console.error('❌ Profile creation error:', error)
        throw error
      }

      console.log('✅ User profile created successfully')
    } catch (err) {
      console.error('❌ Unexpected error creating profile:', err)
      throw err
    }
  }

  const createPersonalOrganization = async (userId: string, fullName: string) => {
    try {
      console.log('✨ Creating personal organization for:', userId)

      // Create personal organization using the Supabase function
      const { data: orgData, error: orgError } = await supabase
        .rpc('create_organization_with_owner', {
          org_name: `${fullName}'s Organization`,
          org_description: 'Personal organization',
          owner_id: userId
        })

      if (orgError) {
        console.error('❌ Organization creation error:', orgError)
        throw orgError
      }

      if (orgData && orgData.length > 0) {
        const organization = orgData[0]
        console.log('✅ Personal organization created:', organization.id)

        // Set this as the user's current organization
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ current_organization_id: organization.id })
          .eq('id', userId)

        if (updateError) {
          console.error('⚠️ Warning: Could not set current organization:', updateError)
          // Don't throw error - organization was created successfully
        } else {
          console.log('✅ Set current organization for user')
        }

        return organization
      } else {
        throw new Error('Organization creation returned no data')
      }
    } catch (err) {
      console.error('❌ Unexpected error creating organization:', err)
      throw err
    }
  }

  const signUp = async (data: SignupFormData): Promise<SignupResponse> => {
    if (!validateForm(data)) {
      return {
        user: null,
        session: null,
        error: { message: 'Please fix the validation errors' }
      }
    }

    isLoading.value = true
    errors.value = []

    try {
      console.log('🚀 Starting signup process for:', data.email)

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            company: data.company,
            plan: data.plan
          }
        }
      })

      console.log('📊 Supabase signup response:', {
        authData: authData,
        authError: authError,
        hasUser: !!authData?.user,
        hasSession: !!authData?.session,
        userCreatedAt: authData?.user?.created_at,
        userConfirmed: authData?.user?.email_confirmed_at
      })

      if (authError) {
        console.error('❌ Supabase signup error:', authError)
        let errorMessage = authError.message

        // Handle specific Supabase errors with user-friendly messages
        if (authError.message.includes('already_registered')) {
          errorMessage = 'An account with this email already exists. Please try logging in instead.'
        } else if (authError.message.includes('invalid_email')) {
          errorMessage = 'Please enter a valid email address.'
        } else if (authError.message.includes('weak_password')) {
          errorMessage = 'Password is too weak. Please choose a stronger password.'
        }

        toast.add({
          title: 'Signup Failed',
          description: errorMessage,
          icon: 'i-lucide-alert-circle',
          color: 'error'
        })

        return {
          user: null,
          session: null,
          error: { message: errorMessage, code: authError.message }
        }
      }

      if (authData.user) {
        console.log('✅ User created successfully:', authData.user.id)
        console.log('📧 Email confirmed:', authData.user.email_confirmed_at)
        console.log('👤 User data:', authData.user)
        console.log('🆔 User created at:', authData.user.created_at)

        // Check if this signup actually created a new user or if user already existed
        // When email confirmations are enabled, Supabase may create a new user
        // even if one exists with the same email but unconfirmed

        // If no session was created, it likely means user already existed
        if (!authData.session) {
          console.log('⚠️ No session created - likely existing user with unconfirmed email')

          toast.add({
            title: 'Check Your Email',
            description: 'We\'ve sent a new verification email. Please check your inbox and click the link to verify your account.',
            icon: 'i-lucide-mail',
            color: 'warning'
          })

          return {
            user: authData.user,
            session: null,
            error: undefined
          }
        }

        // Check if this is actually a new user or existing user
        // Additional check: if user was created more than a few seconds ago, it might be existing
        const userCreatedAt = new Date(authData.user.created_at!)
        const now = new Date()
        const timeDifferenceSeconds = (now.getTime() - userCreatedAt.getTime()) / 1000

        // If user was created more than 30 seconds ago, it's likely an existing user
        if (timeDifferenceSeconds > 30) {
          console.log('⚠️ Existing user detected, created at:', authData.user.created_at)

          toast.add({
            title: 'Account Already Exists',
            description: 'An account with this email already exists. Please check your email for verification or try logging in.',
            icon: 'i-lucide-info',
            color: 'warning'
          })

          return {
            user: null,
            session: null,
            error: {
              message: 'An account with this email already exists. Please check your email for verification or try logging in.',
              code: 'user_already_exists'
            }
          }
        }

        // This is genuinely a new user
        console.log('🎉 New user confirmed - created just now')

        // Create user profile
        await createUserProfile(authData.user.id, data)

        // Create personal organization
        try {
          await createPersonalOrganization(authData.user.id, data.fullName)
          console.log('✅ Personal organization setup complete')
        } catch (orgError) {
          console.error('⚠️ Organization creation failed, but user was created:', orgError)
          // Don't fail the entire signup if organization creation fails
          // User can create organizations later through the UI
        }

        toast.add({
          title: 'Account Created Successfully!',
          description: 'Please check your email to verify your account.',
          icon: 'i-lucide-check-circle',
          color: 'success'
        })

        return {
          user: authData.user,
          session: authData.session,
          error: undefined
        }
      }

      return {
        user: null,
        session: null,
        error: { message: 'Unknown error occurred during signup' }
      }
    } catch (err: unknown) {
      const errorMessage = (err as Error)?.message || 'An unexpected error occurred. Please try again.'

      toast.add({
        title: 'Signup Error',
        description: errorMessage,
        icon: 'i-lucide-alert-circle',
        color: 'error'
      })

      return {
        user: null,
        session: null,
        error: { message: errorMessage }
      }
    } finally {
      isLoading.value = false
    }
  }

  const clearErrors = () => {
    errors.value = []
  }

  const getFieldError = (fieldName: string): string | null => {
    const error = errors.value.find(err => err.field === fieldName)
    return error ? error.message : null
  }

  return {
    signUp,
    isLoading: readonly(isLoading),
    errors: readonly(errors),
    clearErrors,
    getFieldError,
    validateForm
  }
}
