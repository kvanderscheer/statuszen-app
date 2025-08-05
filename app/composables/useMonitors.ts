import type {
  Monitor,
  MonitorWithMetadata,
  MonitorStatus,
  MonitorType,
  CreateMonitorData,
  UpdateMonitorData,
  MonitorsListResponse,
  MonitorResponse,
  MonitorMutationResponse,
  MonitorDeleteResponse,
  MonitorListQuery,
  HttpMonitorConfig,
  PingMonitorConfig,
  SslMonitorConfig
} from '~/types/monitor'
import { MONITOR_TYPES } from '~/types/monitor'
import {
  validateCreateMonitorData,
  validateUpdateMonitorData,
  validateMonitorField,
  processMonitorUrl
} from '~/utils/monitor-validation'

// Global state using useState
const useMonitorStore = () => {
  const monitors = useState<MonitorWithMetadata[]>('monitor.list', () => [])
  const currentMonitor = useState<Monitor | null>('monitor.current', () => null)
  const isUpdating = useState<boolean>('monitor.updating', () => false)
  const error = useState<string | null>('monitor.error', () => null)
  const lastFetch = useState<Date | null>('monitor.lastFetch', () => null)

  return {
    monitors,
    currentMonitor,
    isUpdating,
    error,
    lastFetch
  }
}

// Initialize watchers only once
let watchersInitialized = false

const initializeWatchers = () => {
  if (watchersInitialized) return
  watchersInitialized = true

  const { monitors, currentMonitor, error } = useMonitorStore()
  const user = useSupabaseUser()

  // Clear state when user logs out
  watch(user, (newUser) => {
    if (!newUser) {
      monitors.value = []
      currentMonitor.value = null
      error.value = null
    }
  })
}

// Helper function to calculate monitor status
const calculateMonitorStatus = (monitor: Monitor): MonitorStatus => {
  if (!monitor.isActive) return 'inactive'
  if (!monitor.lastScheduledAt) return 'pending'
  return 'active'
}

// Helper function to get status text
const getStatusText = (status: MonitorStatus): string => {
  switch (status) {
    case 'active': return 'Active'
    case 'inactive': return 'Inactive'
    case 'pending': return 'Pending'
    case 'error': return 'Error'
    default: return 'Unknown'
  }
}

// Helper function to get human readable time until next check
const getNextCheckIn = (nextCheckAt?: string): string | undefined => {
  if (!nextCheckAt) return undefined

  const nextCheck = new Date(nextCheckAt)
  const now = new Date()
  const diff = nextCheck.getTime() - now.getTime()

  if (diff <= 0) return 'Overdue'

  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  return `${minutes}m`
}

// Helper function to get configuration summary
const getConfigSummary = (monitor: Monitor): string => {
  const type = MONITOR_TYPES.find(t => t.value === monitor.type)
  if (!type) return 'Unknown configuration'

  const parts: string[] = []

  switch (monitor.type) {
    case 'http':
    case 'https': {
      const config = monitor.config as HttpMonitorConfig
      if (config.timeout) parts.push(`${config.timeout}s timeout`)
      if (config.expectedStatus) parts.push(`${config.expectedStatus} status`)
      if (config.method && config.method !== 'GET') parts.push(config.method)
      break
    }
    case 'ping': {
      const config = monitor.config as PingMonitorConfig
      if (config.timeout) parts.push(`${config.timeout}s timeout`)
      if (config.packetCount) parts.push(`${config.packetCount} packets`)
      break
    }
    case 'ssl': {
      const config = monitor.config as SslMonitorConfig
      if (config.daysBeforeExpiryAlert) parts.push(`${config.daysBeforeExpiryAlert}d alert`)
      if (config.verifyChain) parts.push('verify chain')
      break
    }
  }

  return parts.length > 0 ? parts.join(', ') : 'Default configuration'
}

// Helper function to enhance monitor with metadata
const enhanceMonitorWithMetadata = (monitor: Monitor): MonitorWithMetadata => {
  const status = calculateMonitorStatus(monitor)

  return {
    ...monitor,
    status,
    statusText: getStatusText(status),
    nextCheckIn: getNextCheckIn(monitor.nextCheckAt),
    canEdit: true, // TODO: Add permission logic
    canDelete: true, // TODO: Add permission logic
    canToggle: true, // TODO: Add permission logic
    configSummary: getConfigSummary(monitor)
  }
}

export const useMonitors = () => {
  // Initialize watchers on first call
  initializeWatchers()

  // Get the shared state
  const { monitors, currentMonitor, isUpdating, error, lastFetch } = useMonitorStore()

  // Local loading states
  const isLoading = ref(false)
  const isDeleting = ref(false)

  // Composables
  const toast = useToast()
  const user = useSupabaseUser()
  const { currentOrganization } = useOrganization()

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

  // Fetch monitors with optional organization filtering
  const fetchMonitors = async (organizationId?: string, query?: MonitorListQuery): Promise<MonitorWithMetadata[]> => {
    const orgId = organizationId || currentOrganization.value?.id

    if (!user.value || !orgId) {
      error.value = 'User not authenticated or no organization selected'
      return []
    }

    isLoading.value = true
    error.value = null

    try {
      const headers = await getAuthHeaders()

      // Build query parameters
      const params = new URLSearchParams()
      params.append('organizationId', orgId)

      if (query?.page) params.append('page', query.page.toString())
      if (query?.limit) params.append('limit', query.limit.toString())

      // Add filters
      if (query?.filters) {
        const filters = query.filters
        if (filters.type?.length) params.append('type', filters.type.join(','))
        if (filters.status?.length) params.append('status', filters.status.join(','))
        if (filters.region?.length) params.append('region', filters.region.join(','))
        if (filters.search) params.append('search', filters.search)
      }

      // Add sorting
      if (query?.sort) {
        params.append('sortField', query.sort.field)
        params.append('sortDirection', query.sort.direction)
      }

      const response = await $fetch<MonitorsListResponse>(`/api/monitors?${params.toString()}`, {
        method: 'GET',
        headers
      })

      if (response.success && response.data) {
        const enhancedMonitors = response.data.map(enhanceMonitorWithMetadata)

        // Update global state only if no specific organization filter was provided
        if (!organizationId) {
          monitors.value = enhancedMonitors
          lastFetch.value = new Date()
        }

        return enhancedMonitors
      } else {
        throw new Error('Invalid response format')
      }
    } catch (err: unknown) {
      const errorMessage = (err as { data?: { message?: string }, message?: string })?.data?.message
        || (err as { message?: string })?.message
        || 'Failed to fetch monitors'
      error.value = errorMessage
      console.error('Monitors fetch error:', err)

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

  // Create new monitor with optimistic updates
  const createMonitor = async (data: CreateMonitorData): Promise<Monitor | null> => {
    if (!user.value) {
      error.value = 'User not authenticated'
      return null
    }

    // Use current organization if not specified
    if (!data.organizationId && currentOrganization.value) {
      data.organizationId = currentOrganization.value.id
    }

    if (!data.organizationId) {
      error.value = 'No organization selected'
      toast.add({
        title: 'Validation Error',
        description: 'Please select an organization',
        icon: 'i-lucide-alert-circle',
        color: 'error'
      })
      return null
    }

    // Client-side validation
    const validationErrors = validateCreateMonitorData(data)
    if (validationErrors.length > 0) {
      const firstError = validationErrors[0]!
      error.value = firstError.message
      toast.add({
        title: 'Validation Error',
        description: firstError.message,
        icon: 'i-lucide-alert-circle',
        color: 'error'
      })
      return null
    }

    // Process URL based on monitor type
    const processedData = {
      ...data,
      url: processMonitorUrl(data.url, data.type)
    }

    isUpdating.value = true
    error.value = null

    // Create optimistic monitor for immediate UI feedback
    const optimisticMonitor: Monitor = {
      id: `temp-${Date.now()}`,
      organizationId: processedData.organizationId,
      name: processedData.name,
      url: processedData.url,
      type: processedData.type,
      config: processedData.config || {},
      checkIntervalMinutes: processedData.checkIntervalMinutes || 10,
      preferredRegion: processedData.preferredRegion || 'us-east',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const enhancedOptimistic = enhanceMonitorWithMetadata(optimisticMonitor)

    // Add optimistic monitor to the list
    monitors.value.unshift(enhancedOptimistic)

    try {
      const headers = await getAuthHeaders()

      const response = await $fetch<MonitorMutationResponse>('/api/monitors', {
        method: 'POST',
        body: processedData,
        headers
      })

      if (response.success && response.data) {
        // Replace optimistic monitor with real one
        const realMonitor = enhanceMonitorWithMetadata(response.data)
        const optimisticIndex = monitors.value.findIndex(m => m.id === optimisticMonitor.id)

        if (optimisticIndex !== -1) {
          monitors.value[optimisticIndex] = realMonitor
        } else {
          // Fallback: add to beginning if not found
          monitors.value.unshift(realMonitor)
        }

        toast.add({
          title: 'Success',
          description: `Monitor "${response.data.name}" created successfully`,
          icon: 'i-lucide-check-circle',
          color: 'success'
        })

        return response.data
      } else {
        throw new Error('Creation failed')
      }
    } catch (err: unknown) {
      // Remove optimistic monitor on error
      const optimisticIndex = monitors.value.findIndex(m => m.id === optimisticMonitor.id)
      if (optimisticIndex !== -1) {
        monitors.value.splice(optimisticIndex, 1)
      }

      const errorMessage = (err as { data?: { message?: string }, message?: string })?.data?.message
        || (err as { message?: string })?.message
        || 'Failed to create monitor'
      error.value = errorMessage
      console.error('Monitor creation error:', err)

      toast.add({
        title: 'Creation Failed',
        description: errorMessage,
        icon: 'i-lucide-alert-circle',
        color: 'error'
      })

      return null
    } finally {
      isUpdating.value = false
    }
  }

  // Update monitor with local state synchronization
  const updateMonitor = async (id: string, data: UpdateMonitorData): Promise<Monitor | null> => {
    if (!user.value) {
      error.value = 'User not authenticated'
      return null
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
      return null
    }

    // Get current monitor for validation context
    const existingMonitor = monitors.value.find(m => m.id === id)
    const currentType = existingMonitor?.type

    // Client-side validation
    const validationErrors = validateUpdateMonitorData(data, currentType)
    if (validationErrors.length > 0) {
      const firstError = validationErrors[0]!
      error.value = firstError.message
      toast.add({
        title: 'Validation Error',
        description: firstError.message,
        icon: 'i-lucide-alert-circle',
        color: 'error'
      })
      return null
    }

    // Process URL if being updated
    const processedData = {
      ...data,
      ...(data.url ? { url: processMonitorUrl(data.url, data.type || currentType!) } : {})
    }

    isUpdating.value = true
    error.value = null

    // Store original state for rollback
    const monitorIndex = monitors.value.findIndex(m => m.id === id)
    let originalMonitor: MonitorWithMetadata | null = null

    if (monitorIndex !== -1) {
      originalMonitor = { ...monitors.value[monitorIndex]! }

      // Apply optimistic update - cast to Monitor for metadata enhancement
      const updatedMonitor = { ...originalMonitor, ...processedData, updatedAt: new Date().toISOString() } as Monitor
      monitors.value[monitorIndex] = enhanceMonitorWithMetadata(updatedMonitor)
    }

    try {
      const headers = await getAuthHeaders()

      const response = await $fetch<MonitorMutationResponse>(`/api/monitors/${id}`, {
        method: 'PATCH',
        body: processedData,
        headers
      })

      if (response.success && response.data) {
        // Update with real data from server
        if (monitorIndex !== -1) {
          monitors.value[monitorIndex] = enhanceMonitorWithMetadata(response.data)
        }

        // Update current monitor if it's the one being updated
        if (currentMonitor.value?.id === id) {
          currentMonitor.value = response.data
        }

        toast.add({
          title: 'Success',
          description: `Monitor "${response.data.name}" updated successfully`,
          icon: 'i-lucide-check-circle',
          color: 'success'
        })

        return response.data
      } else {
        throw new Error('Update failed')
      }
    } catch (err: unknown) {
      // Rollback optimistic update on error
      if (monitorIndex !== -1 && originalMonitor) {
        monitors.value[monitorIndex] = originalMonitor
      }

      const errorMessage = (err as { data?: { message?: string }, message?: string })?.data?.message
        || (err as { message?: string })?.message
        || 'Failed to update monitor'
      error.value = errorMessage
      console.error('Monitor update error:', err)

      toast.add({
        title: 'Update Failed',
        description: errorMessage,
        icon: 'i-lucide-alert-circle',
        color: 'error'
      })

      return null
    } finally {
      isUpdating.value = false
    }
  }

  // Delete monitor with confirmation
  const deleteMonitor = async (id: string, skipConfirmation = false): Promise<boolean> => {
    if (!user.value) {
      error.value = 'User not authenticated'
      return false
    }

    const monitor = monitors.value.find(m => m.id === id)
    if (!monitor) {
      error.value = 'Monitor not found'
      return false
    }

    // Show confirmation unless skipped
    if (!skipConfirmation) {
      const confirmed = confirm(`Are you sure you want to delete the monitor "${monitor.name}"? This action cannot be undone.`)
      if (!confirmed) return false
    }

    isDeleting.value = true
    error.value = null

    // Store original state for rollback
    const monitorIndex = monitors.value.findIndex(m => m.id === id)
    let originalMonitor: MonitorWithMetadata | null = null

    if (monitorIndex !== -1) {
      originalMonitor = monitors.value[monitorIndex]!
      // Optimistically remove from list
      monitors.value.splice(monitorIndex, 1)
    }

    try {
      const headers = await getAuthHeaders()

      const response = await $fetch<MonitorDeleteResponse>(`/api/monitors/${id}`, {
        method: 'DELETE',
        headers
      })

      if (response.success) {
        // Clear current monitor if it's the one being deleted
        if (currentMonitor.value?.id === id) {
          currentMonitor.value = null
        }

        toast.add({
          title: 'Success',
          description: `Monitor "${monitor.name}" deleted successfully`,
          icon: 'i-lucide-check-circle',
          color: 'success'
        })

        return true
      } else {
        throw new Error('Deletion failed')
      }
    } catch (err: unknown) {
      // Rollback optimistic deletion on error
      if (monitorIndex !== -1 && originalMonitor) {
        monitors.value.splice(monitorIndex, 0, originalMonitor)
      }

      const errorMessage = (err as { data?: { message?: string }, message?: string })?.data?.message
        || (err as { message?: string })?.message
        || 'Failed to delete monitor'
      error.value = errorMessage
      console.error('Monitor deletion error:', err)

      toast.add({
        title: 'Deletion Failed',
        description: errorMessage,
        icon: 'i-lucide-alert-circle',
        color: 'error'
      })

      return false
    } finally {
      isDeleting.value = false
    }
  }

  // Toggle monitor active state
  const toggleMonitor = async (id: string): Promise<Monitor | null> => {
    const monitor = monitors.value.find(m => m.id === id)
    if (!monitor) {
      error.value = 'Monitor not found'
      return null
    }

    return await updateMonitor(id, { isActive: !monitor.isActive })
  }

  // Refresh single monitor
  const refreshMonitor = async (id: string): Promise<Monitor | null> => {
    if (!user.value) {
      error.value = 'User not authenticated'
      return null
    }

    try {
      const headers = await getAuthHeaders()

      const response = await $fetch<MonitorResponse>(`/api/monitors/${id}`, {
        method: 'GET',
        headers
      })

      if (response.success && response.data) {
        const enhancedMonitor = enhanceMonitorWithMetadata(response.data)

        // Update in the list
        const monitorIndex = monitors.value.findIndex(m => m.id === id)
        if (monitorIndex !== -1) {
          monitors.value[monitorIndex] = enhancedMonitor
        }

        // Update current monitor if it matches
        if (currentMonitor.value?.id === id) {
          currentMonitor.value = response.data
        }

        return response.data
      } else {
        throw new Error('Invalid response format')
      }
    } catch (err: unknown) {
      const errorMessage = (err as { data?: { message?: string }, message?: string })?.data?.message
        || (err as { message?: string })?.message
        || 'Failed to refresh monitor'
      error.value = errorMessage
      console.error('Monitor refresh error:', err)

      toast.add({
        title: 'Refresh Failed',
        description: errorMessage,
        icon: 'i-lucide-alert-circle',
        color: 'error'
      })

      return null
    }
  }

  // Get monitor by ID from local state
  const getMonitorById = (id: string): MonitorWithMetadata | null => {
    return monitors.value.find(m => m.id === id) ?? null
  }

  // Clear error state
  const clearError = (): void => {
    error.value = null
  }

  // Initialize monitors for current organization
  const initializeMonitors = async (): Promise<void> => {
    if (monitors.value.length === 0 && user.value && currentOrganization.value) {
      await fetchMonitors()
    }
  }

  // Validate individual monitor field (for real-time form validation)
  const validateField = (field: string, value: unknown, type?: MonitorType) => {
    return validateMonitorField(field, value, type)
  }

  // Validate complete monitor data
  const validateMonitor = (data: CreateMonitorData | UpdateMonitorData, isUpdate = false) => {
    if (isUpdate) {
      return validateUpdateMonitorData(data as UpdateMonitorData)
    } else {
      return validateCreateMonitorData(data as CreateMonitorData)
    }
  }

  return {
    // State
    monitors,
    currentMonitor,
    isLoading,
    isDeleting,
    isUpdating,
    error,
    lastFetch,

    // CRUD operations
    fetchMonitors,
    createMonitor,
    updateMonitor,
    deleteMonitor,
    toggleMonitor,
    refreshMonitor,

    // Validation utilities
    validateField,
    validateMonitor,

    // Utilities
    getMonitorById,
    clearError,
    initializeMonitors,
    refreshMonitors: () => fetchMonitors()
  }
}
