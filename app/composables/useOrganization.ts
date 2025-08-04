import type {
  Organization,
  OrganizationMember,
  OrganizationInvitation,
  OrganizationRole
} from '~/types/auth'
import type {
  CreateOrganizationData,
  UpdateOrganizationData,
  InviteMemberData,
  OrganizationsListResponse,
  OrganizationResponse,
  OrganizationMembersResponse,
  ApiResponse
} from '~/types/organization'

// Global state using useState
const useOrganizationStore = () => {
  const currentOrganization = useState<Organization | null>('organization.current', () => null)
  const organizations = useState<Array<Organization & { role: OrganizationRole }>>('organization.list', () => [])
  const members = useState<OrganizationMember[]>('organization.members', () => [])
  const invitations = useState<OrganizationInvitation[]>('organization.invitations', () => [])
  const isUpdating = useState<boolean>('organization.updating', () => false)
  const error = useState<string | null>('organization.error', () => null)

  return {
    currentOrganization,
    organizations,
    members,
    invitations,
    isUpdating,
    error
  }
}

// Initialize watchers only once - simplified approach
let watchersInitialized = false

const initializeWatchers = () => {
  if (watchersInitialized) return
  watchersInitialized = true

  const { currentOrganization, organizations, members, invitations, error } = useOrganizationStore()
  const user = useSupabaseUser()

  // Only watch for user logout to clear state
  watch(user, (newUser) => {
    if (!newUser) {
      currentOrganization.value = null
      organizations.value = []
      members.value = []
      invitations.value = []
      error.value = null
    }
  })
}

export const useOrganization = () => {
  // Initialize watchers on first call
  initializeWatchers()

  // Get the shared state
  const { currentOrganization, organizations, members, invitations, isUpdating, error } = useOrganizationStore()
  
  // Local loading states (not shared to avoid component re-mounting)
  const isLoading = ref(false)
  const isMembersLoading = ref(false)

  // Composables
  const toast = useToast()
  const user = useSupabaseUser()

  // Helper function to get auth headers
  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const supabase = useSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    const headers: Record<string, string> = {}
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`
    }
    return headers
  }

  // Fetch user's organizations
  const fetchOrganizations = async (): Promise<Array<Organization & { role: OrganizationRole }>> => {
    if (!user.value) {
      error.value = 'User not authenticated'
      return []
    }

    isLoading.value = true
    error.value = null

    try {
      const headers = await getAuthHeaders()

      const response = await $fetch<OrganizationsListResponse>('/api/organizations', {
        method: 'GET',
        headers
      })

      if (response.success && response.data) {
        organizations.value = response.data

        // Set current organization if not set and we have organizations
        if (!currentOrganization.value && response.data.length > 0) {
          const firstOrg = response.data[0]
          if (firstOrg) {
            const { role, ...org } = firstOrg
            currentOrganization.value = org
          }
        }

        return response.data
      } else {
        throw new Error('Invalid response format')
      }
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Failed to fetch organizations'
      error.value = errorMessage
      console.error('Organizations fetch error:', err)

      toast.add({
        title: 'Error',
        description: errorMessage,
        icon: 'i-lucide-alert-circle',
        color: 'error'
      })

      return []
    } finally {
      isLoading.value = false
    }
  }

  // Create new organization
  const createOrganization = async (data: CreateOrganizationData): Promise<boolean> => {
    if (!user.value) {
      error.value = 'User not authenticated'
      return false
    }

    // Validate required fields
    if (!data.name || !data.name.trim()) {
      error.value = 'Organization name is required'
      toast.add({
        title: 'Validation Error',
        description: 'Organization name is required',
        icon: 'i-lucide-alert-circle',
        color: 'error'
      })
      return false
    }

    isUpdating.value = true
    error.value = null

    try {
      const headers = await getAuthHeaders()

      const response = await $fetch<OrganizationResponse>('/api/organizations', {
        method: 'POST',
        body: data,
        headers
      })

      if (response.success && response.data) {
        // Add to organizations list
        organizations.value.push(response.data)

        // Set as current organization
        currentOrganization.value = response.data

        toast.add({
          title: 'Success',
          description: `Organization "${response.data.name}" created successfully`,
          icon: 'i-lucide-check-circle',
          color: 'success'
        })

        return true
      } else {
        throw new Error('Creation failed')
      }
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Failed to create organization'
      error.value = errorMessage
      console.error('Organization creation error:', err)

      toast.add({
        title: 'Creation Failed',
        description: errorMessage,
        icon: 'i-lucide-alert-circle',
        color: 'error'
      })

      return false
    } finally {
      isUpdating.value = false
    }
  }

  // Update organization
  const updateOrganization = async (id: string, data: UpdateOrganizationData): Promise<boolean> => {
    if (!user.value) {
      error.value = 'User not authenticated'
      return false
    }

    // Validate that we have at least one field to update
    const hasValidFields = Object.values(data).some(value =>
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
      const headers = await getAuthHeaders()

      const response = await $fetch<OrganizationResponse>('/api/organizations/' + id, {
        method: 'PATCH',
        body: data,
        headers
      })

      if (response.success && response.data) {
        // Update in organizations list
        const index = organizations.value.findIndex((org: Organization & { role: OrganizationRole }) => org.id === id)
        if (index !== -1) {
          const currentOrg = organizations.value[index]
          if (currentOrg) {
            organizations.value[index] = { ...response.data, role: currentOrg.role }
          }
        }

        // Update current organization if it's the one being updated
        if (currentOrganization.value?.id === id) {
          currentOrganization.value = response.data
        }

        toast.add({
          title: 'Success',
          description: `Organization "${response.data.name}" updated successfully`,
          icon: 'i-lucide-check-circle',
          color: 'success'
        })

        return true
      } else {
        throw new Error('Update failed')
      }
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Failed to update organization'
      error.value = errorMessage
      console.error('Organization update error:', err)

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

  // Delete organization
  const deleteOrganization = async (id: string): Promise<boolean> => {
    if (!user.value) {
      error.value = 'User not authenticated'
      return false
    }

    isUpdating.value = true
    error.value = null

    try {
      const headers = await getAuthHeaders()

      const response = await $fetch<ApiResponse>('/api/organizations/' + id, {
        method: 'DELETE',
        headers
      })

      if (response.success) {
        // Remove from organizations list
        organizations.value = organizations.value.filter((org: Organization & { role: OrganizationRole }) => org.id !== id)

        // Clear current organization if it's the one being deleted
        if (currentOrganization.value?.id === id) {
          if (organizations.value.length > 0) {
            const firstOrg = organizations.value[0]
            if (firstOrg) {
              const { role, ...org } = firstOrg
              currentOrganization.value = org
            }
          } else {
            currentOrganization.value = null
          }
        }

        toast.add({
          title: 'Success',
          description: response.message || 'Organization deleted successfully',
          icon: 'i-lucide-check-circle',
          color: 'success'
        })

        return true
      } else {
        throw new Error('Deletion failed')
      }
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Failed to delete organization'
      error.value = errorMessage
      console.error('Organization deletion error:', err)

      toast.add({
        title: 'Deletion Failed',
        description: errorMessage,
        icon: 'i-lucide-alert-circle',
        color: 'error'
      })

      return false
    } finally {
      isUpdating.value = false
    }
  }

  // Switch current organization
  const switchOrganization = (organizationId: string): boolean => {
    const organization = organizations.value.find((org: Organization & { role: OrganizationRole }) => org.id === organizationId)

    if (!organization) {
      error.value = 'Organization not found'
      toast.add({
        title: 'Error',
        description: 'Selected organization not found',
        icon: 'i-lucide-alert-circle',
        color: 'error'
      })
      return false
    }

    const { role, ...org } = organization
    currentOrganization.value = org

    // Clear members and invitations when switching organizations
    members.value = []
    invitations.value = []

    toast.add({
      title: 'Switched Organization',
      description: `Now viewing ${organization.name}`,
      icon: 'i-lucide-building-2',
      color: 'success'
    })

    return true
  }

  // Fetch organization members
  const fetchMembers = async (organizationId?: string): Promise<OrganizationMember[]> => {
    const orgId = organizationId || currentOrganization.value?.id

    if (!user.value || !orgId) {
      error.value = 'User not authenticated or no organization selected'
      return []
    }

    isMembersLoading.value = true
    error.value = null

    try {
      const headers = await getAuthHeaders()

      const response = await $fetch<OrganizationMembersResponse>(`/api/organizations/${orgId}/members`, {
        method: 'GET',
        headers
      })

      if (response.success && response.data) {
        members.value = response.data
        return response.data
      } else {
        throw new Error('Invalid response format')
      }
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Failed to fetch members'
      error.value = errorMessage
      console.error('Members fetch error:', err)

      toast.add({
        title: 'Error',
        description: errorMessage,
        icon: 'i-lucide-alert-circle',
        color: 'error'
      })

      return []
    } finally {
      isMembersLoading.value = false
    }
  }

  // Invite member
  const inviteMember = async (organizationId: string, data: InviteMemberData): Promise<boolean> => {
    if (!user.value) {
      error.value = 'User not authenticated'
      return false
    }

    // Validate email
    if (!data.email || !data.email.trim()) {
      error.value = 'Email address is required'
      toast.add({
        title: 'Validation Error',
        description: 'Email address is required',
        icon: 'i-lucide-alert-circle',
        color: 'error'
      })
      return false
    }

    const emailRegex = /^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$/
    if (!emailRegex.test(data.email)) {
      error.value = 'Invalid email address format'
      toast.add({
        title: 'Validation Error',
        description: 'Please enter a valid email address',
        icon: 'i-lucide-alert-circle',
        color: 'error'
      })
      return false
    }

    isUpdating.value = true
    error.value = null

    try {
      const headers = await getAuthHeaders()

      const response = await $fetch<ApiResponse>(`/api/organizations/${organizationId}/invite`, {
        method: 'POST',
        body: data,
        headers
      })

      if (response.success) {
        toast.add({
          title: 'Success',
          description: response.message || 'Invitation sent successfully',
          icon: 'i-lucide-check-circle',
          color: 'success'
        })

        // Refresh invitations if we're viewing this organization
        if (currentOrganization.value?.id === organizationId) {
          await fetchInvitations(organizationId)
        }

        return true
      } else {
        throw new Error('Invitation failed')
      }
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Failed to send invitation'
      error.value = errorMessage
      console.error('Member invitation error:', err)

      toast.add({
        title: 'Invitation Failed',
        description: errorMessage,
        icon: 'i-lucide-alert-circle',
        color: 'error'
      })

      return false
    } finally {
      isUpdating.value = false
    }
  }

  // Fetch organization invitations (placeholder - endpoint not implemented yet)
  const fetchInvitations = async (organizationId?: string): Promise<OrganizationInvitation[]> => {
    const orgId = organizationId || currentOrganization.value?.id

    if (!user.value || !orgId) {
      error.value = 'User not authenticated or no organization selected'
      return []
    }

    // TODO: Implement when endpoint is available
    console.log('fetchInvitations - endpoint not yet implemented')
    return []
  }

  // Accept invitation
  const acceptInvitation = async (token: string): Promise<boolean> => {
    if (!user.value) {
      error.value = 'User not authenticated'
      return false
    }

    isUpdating.value = true
    error.value = null

    try {
      const headers = await getAuthHeaders()

      const response = await $fetch<ApiResponse>(`/api/invitations/${token}/accept`, {
        method: 'POST',
        headers
      })

      if (response.success) {
        toast.add({
          title: 'Success',
          description: response.message || 'Invitation accepted successfully',
          icon: 'i-lucide-check-circle',
          color: 'success'
        })

        // Refresh organizations list
        await fetchOrganizations()

        return true
      } else {
        throw new Error('Acceptance failed')
      }
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Failed to accept invitation'
      error.value = errorMessage
      console.error('Invitation acceptance error:', err)

      toast.add({
        title: 'Acceptance Failed',
        description: errorMessage,
        icon: 'i-lucide-alert-circle',
        color: 'error'
      })

      return false
    } finally {
      isUpdating.value = false
    }
  }

  // Decline invitation (placeholder - endpoint not implemented yet)
  const declineInvitation = async (_token: string): Promise<boolean> => {
    if (!user.value) {
      error.value = 'User not authenticated'
      return false
    }

    // TODO: Implement when endpoint is available
    console.log('declineInvitation - endpoint not yet implemented')

    toast.add({
      title: 'Feature Not Available',
      description: 'Invitation decline functionality is not yet implemented',
      icon: 'i-lucide-info',
      color: 'info'
    })

    return false
  }

  // Clear error state
  const clearError = (): void => {
    error.value = null
  }

  // Initialize organizations on first use
  const initializeOrganizations = async (): Promise<void> => {
    if (organizations.value.length === 0 && user.value) {
      await fetchOrganizations()
    }
  }

  return {
    // State
    currentOrganization,
    organizations,
    members,
    invitations,
    isLoading,
    isMembersLoading,
    isUpdating,
    error,

    // Organization CRUD operations
    fetchOrganizations,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    switchOrganization,

    // Member management
    fetchMembers,
    inviteMember,

    // Invitation management
    fetchInvitations,
    acceptInvitation,
    declineInvitation,

    // Utilities
    clearError,
    initializeOrganizations,
    refreshOrganizations: fetchOrganizations
  }
}
