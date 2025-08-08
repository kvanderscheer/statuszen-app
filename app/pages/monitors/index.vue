<script setup lang="ts">
// Meta
definePageMeta({
  title: 'Monitors',
  middleware: 'auth'
})

// Composables
const { monitors, isLoading, error, fetchMonitors, deleteMonitor, toggleMonitor, refreshMonitor } = useMonitors()
const { currentOrganization } = useOrganization()
const toast = useToast()

// Collapsible state
const isMonitorsCollapsed = ref(false)

// Monitor actions
const handleEditMonitor = (monitor: any) => {
  navigateTo(`/monitors/${monitor.id}/edit`)
}

const handleDeleteMonitor = async (monitor: any) => {
  const success = await deleteMonitor(monitor.id)
  if (success) {
    toast.add({
      title: 'Success',
      description: `Monitor "${monitor.name}" deleted successfully`,
      icon: 'i-lucide-check-circle',
      color: 'success'
    })
  }
}

const handleToggleMonitor = async (monitor: any) => {
  const result = await toggleMonitor(monitor.id)
  if (result) {
    const action = result.isActive ? 'enabled' : 'disabled'
    toast.add({
      title: 'Success',
      description: `Monitor "${result.name}" ${action}`,
      icon: 'i-lucide-check-circle',
      color: 'success'
    })
  }
}

const handleRefreshMonitor = async (monitor: any) => {
  const result = await refreshMonitor(monitor.id)
  if (result) {
    toast.add({
      title: 'Success',
      description: `Monitor "${result.name}" refreshed`,
      icon: 'i-lucide-refresh-cw',
      color: 'success'
    })
  }
}

// Load monitors on mount and when organization changes
let refreshInterval: NodeJS.Timeout | null = null

onMounted(() => {
  if (currentOrganization.value) {
    fetchMonitors()
  }
  
  // Auto-refresh monitors every 5 minutes
  refreshInterval = setInterval(() => {
    if (currentOrganization.value && !isLoading.value) {
      fetchMonitors()
    }
  }, 5 * 60 * 1000)
})

watch(currentOrganization, (newOrg) => {
  if (newOrg) {
    fetchMonitors()
  }
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<template>
  <UDashboardPanel id="monitors">
    <template #header>
      <UDashboardNavbar title="Monitors">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            icon="i-lucide-plus"
            to="/monitors/create"
          >
            Create Monitor
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="max-w-4xl w-full mx-auto">
        <!-- Loading State -->
        <div
          v-if="isLoading"
          class="flex items-center justify-center py-12"
        >
          <div class="flex items-center gap-3">
            <UIcon
              name="i-lucide-loader-2"
              class="w-5 h-5 animate-spin"
            />
            <span>Loading monitors...</span>
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
          class="mb-6"
          @close="error = null"
        />

        <!-- Empty State -->
        <div
          v-else-if="!monitors || monitors.length === 0"
          class="text-center py-12"
        >
          <UIcon
            name="i-lucide-monitor"
            class="w-12 h-12 text-gray-400 mx-auto mb-4"
          />
          <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No monitors yet
          </h3>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            Get started by creating your first monitor to track website uptime and performance.
          </p>
          <UButton
            icon="i-lucide-plus"
            @click="$router.push('/monitors/create')"
          >
            Create Your First Monitor
          </UButton>
        </div>

        <!-- Monitors Section -->
        <div
          v-else
          class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <!-- Monitors Header -->
          <button
            class="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            @click="isMonitorsCollapsed = !isMonitorsCollapsed"
          >
            <h2 class="font-medium text-gray-900 dark:text-gray-100">
              Monitors
            </h2>
            <UIcon
              name="i-lucide-chevron-down"
              :class="['w-4 h-4 text-gray-500 transition-transform', { 'rotate-180': isMonitorsCollapsed }]"
            />
          </button>

          <!-- Monitors List -->
          <div
            v-if="!isMonitorsCollapsed"
            class="border-t border-gray-200 dark:border-gray-700"
          >
            <MonitorListItem
              v-for="monitor in (monitors || [])"
              :key="monitor.id"
              :monitor="monitor"
              @edit="handleEditMonitor(monitor)"
              @delete="handleDeleteMonitor(monitor)"
              @toggle="handleToggleMonitor(monitor)"
              @refresh="handleRefreshMonitor(monitor)"
            />
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
