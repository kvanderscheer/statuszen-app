<script setup lang="ts">
import type { UpdateMonitorData } from '~/types/monitor'

// Meta
definePageMeta({
  title: 'Edit Monitor',
  middleware: 'auth'
})

// Route parameters
const route = useRoute()
const monitorId = route.params.id as string

// Composables
const { 
  monitors, 
  currentMonitor, 
  updateMonitor, 
  deleteMonitor,
  refreshMonitor,
  getMonitorById,
  isUpdating,
  isDeleting,
  error 
} = useMonitors()
const toast = useToast()
const router = useRouter()

// Get monitor data
const monitor = computed(() => {
  return getMonitorById(monitorId) || currentMonitor.value
})

// Loading state
const isLoading = computed(() => {
  return !monitor.value && !error.value
})

// Confirmation states
const showDeleteConfirm = ref(false)

// Load monitor if not in local state
onMounted(async () => {
  if (!monitor.value) {
    await refreshMonitor(monitorId)
  }
})

// Handle form submission
const handleSubmit = async (data: UpdateMonitorData) => {
  const updatedMonitor = await updateMonitor(monitorId, data)
  
  if (updatedMonitor) {
    toast.add({
      title: 'Monitor Updated',
      description: `"${updatedMonitor.name}" has been updated successfully`,
      icon: 'i-lucide-check-circle',
      color: 'success'
    })
    
    // Navigate back to monitors list
    await router.push('/monitors')
  }
}

// Handle form cancellation
const handleCancel = () => {
  router.back()
}

// Handle monitor deletion
const handleDelete = async () => {
  if (!monitor.value) return
  
  const success = await deleteMonitor(monitorId, true) // Skip confirmation since we have our own
  
  if (success) {
    toast.add({
      title: 'Monitor Deleted',
      description: `"${monitor.value.name}" has been deleted successfully`,
      icon: 'i-lucide-check-circle',
      color: 'success'
    })
    
    // Navigate back to monitors list
    await router.push('/monitors')
  }
  
  showDeleteConfirm.value = false
}

// Handle 404 - redirect to monitors list
watch(error, (newError) => {
  if (newError?.includes('not found') || newError?.includes('404')) {
    toast.add({
      title: 'Monitor Not Found',
      description: 'The monitor you are looking for does not exist or you do not have access to it.',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
    router.push('/monitors')
  }
})
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Breadcrumb -->
    <nav class="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
      <NuxtLink
        to="/monitors"
        class="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
      >
        Monitors
      </NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="w-4 h-4" />
      <span
        v-if="monitor"
        class="hover:text-gray-900 dark:hover:text-gray-100 transition-colors cursor-pointer"
        @click="$router.push('/monitors')"
      >
        {{ monitor.name }}
      </span>
      <UIcon name="i-lucide-chevron-right" class="w-4 h-4" />
      <span class="text-gray-900 dark:text-gray-100">Edit</span>
    </nav>

    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Edit Monitor
        </h1>
        <p
          v-if="monitor"
          class="text-gray-600 dark:text-gray-400 mt-1"
        >
          Update settings for "{{ monitor.name }}"
        </p>
      </div>

      <!-- Delete Button -->
      <UButton
        v-if="monitor"
        color="error"
        variant="outline"
        icon="i-lucide-trash-2"
        :loading="isDeleting"
        @click="showDeleteConfirm = true"
      >
        Delete Monitor
      </UButton>
    </div>

    <!-- Loading State -->
    <div
      v-if="isLoading"
      class="flex items-center justify-center py-12"
    >
      <div class="flex items-center gap-3">
        <UIcon name="i-lucide-loader-2" class="w-5 h-5 animate-spin" />
        <span>Loading monitor...</span>
      </div>
    </div>

    <!-- Error State -->
    <UAlert
      v-else-if="error"
      icon="i-lucide-alert-circle"
      color="error"
      variant="soft"
      :title="error"
      :close-button="{ icon: 'i-lucide-x', color: 'gray', variant: 'link' }"
      @close="error = null"
    />

    <!-- Monitor Form -->
    <MonitorForm
      v-else-if="monitor"
      :monitor="monitor"
      :loading="isUpdating"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />

    <!-- Delete Confirmation Modal -->
    <UModal v-model="showDeleteConfirm">
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <UIcon
              name="i-lucide-trash-2"
              class="w-5 h-5 text-red-500"
            />
            <h3 class="font-medium">Delete Monitor</h3>
          </div>
        </template>

        <div class="space-y-4">
          <p class="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete <strong>"{{ monitor?.name }}"</strong>?
          </p>
          
          <div class="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-alert-triangle"
                class="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
              />
              <div class="text-sm">
                <p class="font-medium text-red-800 dark:text-red-200 mb-1">
                  This action cannot be undone
                </p>
                <p class="text-red-700 dark:text-red-300">
                  This will permanently delete the monitor and all its historical data.
                </p>
              </div>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton
              variant="outline"
              @click="showDeleteConfirm = false"
            >
              Cancel
            </UButton>
            
            <UButton
              color="error"
              :loading="isDeleting"
              @click="handleDelete"
            >
              Delete Monitor
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>