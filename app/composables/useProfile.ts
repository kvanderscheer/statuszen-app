import type { UserProfile, ProfileUpdateData } from '~/types/auth'

interface ProfileResponse {
  success: boolean
  data: UserProfile
}

interface ProfileUpdateResponse {
  success: boolean
  message: string
  data: Partial<UserProfile>
}

export const useProfile = () => {
  // Reactive state
  const profile = ref<UserProfile | null>(null)
  const isLoading = ref(false)
  const isUpdating = ref(false)
  const error = ref<string | null>(null)

  // Composables
  const toast = useToast()
  const user = useSupabaseUser()

  // Fetch user profile from API
  const fetchProfile = async (): Promise<UserProfile | null> => {
    if (!user.value) {
      error.value = 'User not authenticated'
      return null
    }

    isLoading.value = true
    error.value = null

    try {
      // Get the current session to pass the access token
      const supabase = useSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      const headers: Record<string, string> = {}
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const response = await $fetch<ProfileResponse>('/api/profile', {
        method: 'GET',
        headers
      })

      if (response.success && response.data) {
        profile.value = response.data
        return response.data
      } else {
        throw new Error('Invalid response format')
      }
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Failed to fetch profile'
      error.value = errorMessage
      console.error('Profile fetch error:', err)

      toast.add({
        title: 'Error',
        description: errorMessage,
        icon: 'i-lucide-alert-circle',
        color: 'error'
      })

      return null
    } finally {
      isLoading.value = false
    }
  }

  // Update user profile
  const updateProfile = async (updateData: ProfileUpdateData): Promise<boolean> => {
    if (!user.value) {
      error.value = 'User not authenticated'
      return false
    }

    // Validate that we have at least one field to update
    const hasValidFields = Object.values(updateData).some(value =>
      value !== undefined && value !== null && value !== ''
    )

    if (!hasValidFields) {
      error.value = 'No valid fields provided for update'
      toast.add({
        title: 'Validation Error',
        description: 'Please provide at least one field to update',
        icon: 'i-lucide-alert-circle',
        color: 'error'
      })
      return false
    }

    isUpdating.value = true
    error.value = null

    try {
      // Get the current session to pass the access token
      const supabase = useSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      const headers: Record<string, string> = {}
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const response = await $fetch<ProfileUpdateResponse>('/api/profile', {
        method: 'PATCH',
        body: updateData,
        headers
      })

      if (response.success) {
        // Update local profile state with returned data
        if (profile.value && response.data) {
          profile.value = {
            ...profile.value,
            ...response.data,
            updatedAt: response.data.updatedAt || new Date().toISOString()
          }
        }

        toast.add({
          title: 'Success',
          description: response.message || 'Profile updated successfully',
          icon: 'i-lucide-check-circle',
          color: 'success'
        })

        return true
      } else {
        throw new Error('Update failed')
      }
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Failed to update profile'
      error.value = errorMessage
      console.error('Profile update error:', err)

      toast.add({
        title: 'Update Failed',
        description: errorMessage,
        icon: 'i-lucide-alert-circle',
        color: 'error'
      })

      return false
    } finally {
      isUpdating.value = false
    }
  }

  // Refresh profile data
  const refreshProfile = async (): Promise<void> => {
    await fetchProfile()
  }

  // Clear error state
  const clearError = (): void => {
    error.value = null
  }

  // Initialize profile on first use
  const initializeProfile = async (): Promise<void> => {
    if (!profile.value && user.value) {
      await fetchProfile()
    }
  }

  // Watch for user authentication changes
  watch(user, async (newUser) => {
    if (newUser) {
      await fetchProfile()
    } else {
      profile.value = null
      error.value = null
    }
  }, { immediate: true })

  return {
    // State
    profile: readonly(profile),
    isLoading: readonly(isLoading),
    isUpdating: readonly(isUpdating),
    error: readonly(error),

    // Actions
    fetchProfile,
    updateProfile,
    refreshProfile,
    clearError,
    initializeProfile
  }
}
