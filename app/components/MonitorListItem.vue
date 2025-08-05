<script setup lang="ts">
import type { MonitorWithMetadata } from '~/types/monitor'

interface Props {
  monitor: MonitorWithMetadata
}

interface Emits {
  (e: 'edit'): void
  (e: 'delete'): void
  (e: 'toggle'): void
  (e: 'refresh'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Status dot color mapping
const statusDotColor = computed(() => {
  switch (props.monitor.status) {
    case 'active':
      return 'bg-green-500'
    case 'error':
      return 'bg-red-500'
    case 'pending':
      return 'bg-yellow-500'
    case 'inactive':
      return 'bg-gray-400'
    default:
      return 'bg-gray-400'
  }
})

// Format interval for display
const intervalText = computed(() => {
  const minutes = props.monitor.checkIntervalMinutes
  
  if (minutes < 60) {
    return `${minutes}m`
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60)
    return `${hours}h`
  } else {
    const days = Math.floor(minutes / 1440)
    return `${days}d`
  }
})

// Format status text with timing
const statusTextWithTime = computed(() => {
  const status = props.monitor.statusText
  const lastCheck = props.monitor.lastScheduledAt
  
  if (!lastCheck) return status
  
  const date = new Date(lastCheck)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  
  let timeAgo = ''
  if (diffMins < 1) timeAgo = 'less than a minute'
  else if (diffMins < 60) timeAgo = `${diffMins}m`
  else if (diffHours < 24) timeAgo = `${diffHours}h ${diffMins % 60}m`
  else timeAgo = `${Math.floor(diffHours / 24)}d`
  
  return `${status} · ${timeAgo}`
})

// Dropdown actions
const actions = computed(() => [
  {
    label: 'Edit',
    icon: 'i-lucide-edit',
    click: () => emit('edit')
  },
  {
    label: props.monitor.isActive ? 'Disable' : 'Enable',
    icon: props.monitor.isActive ? 'i-lucide-pause' : 'i-lucide-play',
    click: () => emit('toggle')
  },
  {
    label: 'Refresh',
    icon: 'i-lucide-refresh-cw',
    click: () => emit('refresh')
  },
  {
    label: 'Delete',
    icon: 'i-lucide-trash-2',
    click: () => emit('delete')
  }
])
</script>

<template>
  <div class="flex items-center justify-between py-3 px-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
    <!-- Left side: Status dot + Monitor info -->
    <div class="flex items-center gap-3 flex-1 min-w-0">
      <!-- Status dot -->
      <div :class="['w-2 h-2 rounded-full flex-shrink-0', statusDotColor]" />
      
      <!-- Monitor info -->
      <div class="flex-1 min-w-0">
        <div class="font-medium text-gray-900 dark:text-gray-100 truncate">
          {{ monitor.name }}
        </div>
        <div class="text-sm text-gray-600 dark:text-gray-400 truncate">
          {{ statusTextWithTime }}
        </div>
      </div>
    </div>

    <!-- Right side: Interval + Menu -->
    <div class="flex items-center gap-3 flex-shrink-0">
      <!-- Check interval -->
      <div class="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
        <UIcon name="i-lucide-clock" class="w-4 h-4" />
        <span>{{ intervalText }}</span>
      </div>
      
      <!-- Actions menu -->
      <UDropdown
        :items="[actions]"
        :popper="{ placement: 'bottom-end' }"
      >
        <UButton
          variant="ghost"
          icon="i-lucide-more-horizontal"
          size="sm"
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        />
      </UDropdown>
    </div>
  </div>
</template>