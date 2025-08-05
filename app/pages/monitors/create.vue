<script setup lang="ts">
import type { CreateMonitorData, UpdateMonitorData } from '~/types/monitor'

// Meta
definePageMeta({
  title: 'Create Monitor',
  middleware: 'auth'
})

// Composables
const { createMonitor, isUpdating, error } = useMonitors()
const { currentOrganization } = useOrganization()
const toast = useToast()
const router = useRouter()

// Handle form submission
const handleSubmit = async (data: CreateMonitorData | UpdateMonitorData) => {
  // Type guard to ensure we have CreateMonitorData
  if (!('organizationId' in data)) {
    console.error('Invalid data for monitor creation')
    return
  }
  
  const monitor = await createMonitor(data as CreateMonitorData)
  
  if (monitor) {
    // Success - navigate to monitors list
    await router.push('/monitors')
    
    toast.add({
      title: 'Monitor Created',
      description: `"${monitor.name}" has been created successfully`,
      icon: 'i-lucide-check-circle',
      color: 'success'
    })
  }
}

// Handle form cancellation
const handleCancel = () => {
  router.back()
}

// Redirect if no organization is selected
watchEffect(() => {
  if (!currentOrganization.value) {
    router.push('/account/organization')
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
      <span class="text-gray-900 dark:text-gray-100">Create Monitor</span>
    </nav>

    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Create New Monitor
      </h1>
      <p class="text-gray-600 dark:text-gray-400 mt-1">
        Set up monitoring for your website, API, or service
      </p>
    </div>

    <!-- Error Alert -->
    <UAlert
      v-if="error"
      icon="i-lucide-alert-circle"
      color="error"
      variant="soft"
      :title="error"
      :close-button="{ icon: 'i-lucide-x', color: 'gray', variant: 'link' }"
      @close="error = null"
    />

    <!-- Organization Warning -->
    <UAlert
      v-if="!currentOrganization"
      icon="i-lucide-building"
      color="warning"
      variant="soft"
      title="No Organization Selected"
      description="Please select an organization before creating monitors."
    >
      <template #actions>
        <UButton
          color="warning"
          variant="outline"
          size="xs"
          @click="$router.push('/account/organization')"
        >
          Select Organization
        </UButton>
      </template>
    </UAlert>

    <!-- Monitor Form -->
    <MonitorForm
      v-if="currentOrganization"
      :organization-id="currentOrganization.id"
      :loading="isUpdating"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />
  </div>
</template>