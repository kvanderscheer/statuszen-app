<script setup lang="ts">
import type { MonitorWithMetadata } from '~/types/monitor'
import { MONITOR_TYPES, MONITOR_REGIONS } from '~/types/monitor'

interface Props {
  monitor: MonitorWithMetadata
  showActions?: boolean
}

interface Emits {
  (e: 'edit'): void
  (e: 'delete'): void
  (e: 'toggle'): void
  (e: 'refresh'): void
}

const props = withDefaults(defineProps<Props>(), {
  showActions: true
})

const emit = defineEmits<Emits>()

// Get monitor type configuration
const monitorType = computed(() => {
  return MONITOR_TYPES.find(type => type.value === props.monitor.type)
})

// Get monitor region configuration
const monitorRegion = computed(() => {
  return MONITOR_REGIONS.find(region => region.value === props.monitor.preferredRegion)
})

// Status color mapping
const statusColor = computed(() => {
  switch (props.monitor.status) {
    case 'active':
      return 'success'
    case 'inactive':
      return 'neutral'
    case 'error':
      return 'error'
    case 'pending':
      return 'warning'
    default:
      return 'neutral'
  }
})

// Format interval for display
const intervalText = computed(() => {
  const minutes = props.monitor.checkIntervalMinutes

  if (minutes < 60) {
    return `${minutes}m`
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  } else {
    const days = Math.floor(minutes / 1440)
    return `${days}d`
  }
})

// Format dates for display
const formatDate = (dateString?: string): string => {
  if (!dateString) return 'Never'

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}

// Action handlers
const handleEdit = () => emit('edit')
const handleDelete = () => emit('delete')
const handleToggle = () => emit('toggle')
const handleRefresh = () => emit('refresh')

// Dropdown actions
const actions = computed(() => [
  {
    label: 'Edit',
    icon: 'i-lucide-edit',
    click: handleEdit,
    disabled: !props.monitor.canEdit
  },
  {
    label: props.monitor.isActive ? 'Disable' : 'Enable',
    icon: props.monitor.isActive ? 'i-lucide-pause' : 'i-lucide-play',
    click: handleToggle,
    disabled: !props.monitor.canToggle
  },
  {
    label: 'Refresh',
    icon: 'i-lucide-refresh-cw',
    click: handleRefresh
  },
  {
    label: 'Delete',
    icon: 'i-lucide-trash-2',
    click: handleDelete,
    disabled: !props.monitor.canDelete
  }
])
</script>

<template>
  <UCard class="hover:shadow-md transition-shadow">
    <div class="space-y-4">
      <!-- Header -->
      <div class="flex items-start justify-between">
        <div class="flex items-start gap-3 flex-1 min-w-0">
          <!-- Monitor Type Icon -->
          <div class="flex-shrink-0 mt-1">
            <UIcon
              :name="monitorType?.icon || 'i-lucide-globe'"
              class="w-5 h-5 text-gray-600 dark:text-gray-400"
            />
          </div>

          <!-- Monitor Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h3 class="font-medium text-gray-900 dark:text-gray-100 truncate">
                {{ monitor.name }}
              </h3>

              <UBadge
                :color="statusColor"
                variant="soft"
                size="xs"
              >
                {{ monitor.statusText }}
              </UBadge>
            </div>

            <p class="text-sm text-gray-600 dark:text-gray-400 truncate">
              {{ monitor.url }}
            </p>
          </div>
        </div>

        <!-- Actions -->
        <div
          v-if="showActions"
          class="flex items-center gap-2 flex-shrink-0"
        >
          <UDropdown
            :items="[actions]"
            :popper="{ placement: 'bottom-end' }"
          >
            <UButton
              variant="ghost"
              icon="i-lucide-more-horizontal"
              size="sm"
            />
          </UDropdown>
        </div>
      </div>

      <!-- Details Grid -->
      <div class="grid grid-cols-2 gap-4 text-sm">
        <!-- Type and Region -->
        <div>
          <div class="text-gray-500 dark:text-gray-400 mb-1">
            Type
          </div>
          <div class="flex items-center gap-2">
            <span class="font-medium">{{ monitorType?.label || monitor.type.toUpperCase() }}</span>
            <span class="text-gray-400">•</span>
            <span class="flex items-center gap-1">
              <span>{{ monitorRegion?.flag || '🌐' }}</span>
              <span>{{ monitorRegion?.label || monitor.preferredRegion }}</span>
            </span>
          </div>
        </div>

        <!-- Interval -->
        <div>
          <div class="text-gray-500 dark:text-gray-400 mb-1">
            Interval
          </div>
          <div class="font-medium">
            {{ intervalText }}
          </div>
        </div>

        <!-- Last Check -->
        <div>
          <div class="text-gray-500 dark:text-gray-400 mb-1">
            Last Check
          </div>
          <div class="font-medium">
            {{ formatDate(monitor.lastScheduledAt) }}
          </div>
        </div>

        <!-- Next Check -->
        <div>
          <div class="text-gray-500 dark:text-gray-400 mb-1">
            Next Check
          </div>
          <div class="font-medium">
            {{ monitor.nextCheckIn || 'Scheduled' }}
          </div>
        </div>
      </div>

      <!-- Configuration Summary -->
      <div v-if="monitor.configSummary !== 'Default configuration'">
        <div class="text-gray-500 dark:text-gray-400 text-sm mb-1">
          Configuration
        </div>
        <div class="text-sm text-gray-700 dark:text-gray-300">
          {{ monitor.configSummary }}
        </div>
      </div>

      <!-- Footer with timestamps -->
      <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t">
        <span>Created {{ formatDate(monitor.createdAt) }}</span>
        <span v-if="monitor.updatedAt !== monitor.createdAt">
          Updated {{ formatDate(monitor.updatedAt) }}
        </span>
      </div>
    </div>
  </UCard>
</template>
