<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type {
  MonitorType,
  MonitorRegion,
  CreateMonitorData,
  UpdateMonitorData,
  Monitor,
  MonitorConfig
} from '~/types/monitor'
import {
  MONITOR_TYPES,
  MONITOR_REGIONS,
  MONITOR_INTERVALS,
  DEFAULT_MONITOR_CONFIGS
} from '~/types/monitor'

interface Props {
  monitor?: Monitor
  organizationId?: string
  loading?: boolean
}

interface Emits {
  (e: 'submit', data: CreateMonitorData | UpdateMonitorData): void
  (e: 'cancel'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { currentOrganization } = useOrganization()

// Determine if we're in edit mode
const isEditMode = computed(() => !!props.monitor)

// Get organization ID from props or current organization
const organizationId = computed(() => {
  return props.organizationId || currentOrganization.value?.id || ''
})

// Form validation schema
const schema = z.object({
  name: z.string()
    .min(2, 'Monitor name must be at least 2 characters')
    .max(255, 'Monitor name must be less than 255 characters'),
  url: z.string()
    .min(8, 'URL must be at least 8 characters')
    .max(500, 'URL must be less than 500 characters')
    .refine((url) => {
      try {
        new URL(url.startsWith('http') ? url : `https://${url}`)
        return true
      } catch {
        // For ping monitors, allow hostname/IP without protocol
        return /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$|^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(url)
      }
    }, 'Please enter a valid URL or hostname'),
  type: z.enum(['http', 'https', 'ping', 'ssl'] as const),
  checkIntervalMinutes: z.number()
    .min(1, 'Check interval must be at least 1 minute')
    .max(1440, 'Check interval must be less than 24 hours'),
  preferredRegion: z.enum(['us-east', 'us-west', 'eu-west', 'eu-central', 'ap-south', 'ap-southeast'] as const),
  config: z.record(z.any()).optional()
})

type Schema = z.output<typeof schema>

// Form state
const state = reactive<Schema>({
  name: '',
  url: '',
  type: 'https',
  checkIntervalMinutes: 5,
  preferredRegion: 'us-east',
  config: {}
})

// Initialize form with monitor data if editing
watch(() => props.monitor, (monitor) => {
  if (monitor) {
    state.name = monitor.name
    state.url = monitor.url
    state.type = monitor.type
    state.checkIntervalMinutes = monitor.checkIntervalMinutes
    state.preferredRegion = monitor.preferredRegion
    state.config = monitor.config || {}
  }
}, { immediate: true })

// Update config when monitor type changes
watch(() => state.type, (newType) => {
  if (newType) {
    state.config = { ...DEFAULT_MONITOR_CONFIGS[newType] }
  }
}, { immediate: true })

// Available regions (filter out unavailable ones)
const availableRegions = computed(() => {
  return MONITOR_REGIONS.filter(region => region.available)
})

// Get selected monitor type configuration
const selectedMonitorType = computed(() => {
  return MONITOR_TYPES.find(type => type.value === state.type)
})

// Handle form submission
const handleSubmit = async (event: FormSubmitEvent<Schema>) => {
  if (!organizationId.value) {
    console.error('No organization selected')
    return
  }

  const formData = event.data

  if (isEditMode.value) {
    // For updates, only include changed fields
    const updateData: UpdateMonitorData = {}
    
    if (formData.name !== props.monitor?.name) updateData.name = formData.name
    if (formData.url !== props.monitor?.url) updateData.url = formData.url
    if (formData.type !== props.monitor?.type) updateData.type = formData.type
    if (formData.checkIntervalMinutes !== props.monitor?.checkIntervalMinutes) {
      updateData.checkIntervalMinutes = formData.checkIntervalMinutes
    }
    if (formData.preferredRegion !== props.monitor?.preferredRegion) {
      updateData.preferredRegion = formData.preferredRegion
    }
    if (JSON.stringify(formData.config) !== JSON.stringify(props.monitor?.config)) {
      updateData.config = (formData.config || {}) as MonitorConfig
    }

    emit('submit', updateData)
  } else {
    // For creation, include all required fields
    const createData: CreateMonitorData = {
      name: formData.name,
      url: formData.url,
      type: formData.type,
      checkIntervalMinutes: formData.checkIntervalMinutes,
      preferredRegion: formData.preferredRegion,
      config: (formData.config || {}) as MonitorConfig,
      organizationId: organizationId.value
    }

    emit('submit', createData)
  }
}

// Handle cancel
const handleCancel = () => {
  emit('cancel')
}

// Validate URL based on monitor type
const validateUrl = (url: string, type: MonitorType): boolean => {
  if (!url) return false
  
  try {
    if (type === 'ping') {
      // For ping, allow hostname/IP without protocol
      return /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$|^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(url)
    } else {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
      
      if (type === 'http' && urlObj.protocol !== 'http:') return false
      if ((type === 'https' || type === 'ssl') && urlObj.protocol !== 'https:') return false
      
      return true
    }
  } catch {
    return false
  }
}

// Real-time URL validation
const urlError = computed(() => {
  if (!state.url) return null
  if (!validateUrl(state.url, state.type)) {
    if (state.type === 'ping') {
      return 'Please enter a valid hostname or IP address'
    } else {
      return `Please enter a valid ${state.type.toUpperCase()} URL`
    }
  }
  return null
})

// Check if form has changes (for edit mode)
const hasChanges = computed(() => {
  if (!isEditMode.value || !props.monitor) return true
  
  return (
    state.name !== props.monitor.name ||
    state.url !== props.monitor.url ||
    state.type !== props.monitor.type ||
    state.checkIntervalMinutes !== props.monitor.checkIntervalMinutes ||
    state.preferredRegion !== props.monitor.preferredRegion ||
    JSON.stringify(state.config) !== JSON.stringify(props.monitor.config)
  )
})

// Check if form is valid
const isFormValid = computed(() => {
  return (
    state.name.trim().length >= 2 &&
    state.url.trim().length >= 8 &&
    !urlError.value &&
    state.checkIntervalMinutes >= 1 &&
    state.checkIntervalMinutes <= 1440
  )
})
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="font-medium">
        {{ isEditMode ? 'Edit Monitor' : 'Create Monitor' }}
      </h3>
    </template>

    <UForm
      :schema="schema"
      :state="state"
      class="space-y-6"
      @submit="handleSubmit"
    >
      <!-- Basic Information -->
      <div class="space-y-4">
        <h4 class="font-medium text-sm text-gray-900 dark:text-gray-100">
          Basic Information
        </h4>

        <UFormField
          label="Monitor Name"
          name="name"
          required
          description="A descriptive name for your monitor"
        >
          <UInput
            v-model="state.name"
            placeholder="My Website Monitor"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="URL or Hostname"
          name="url"
          required
          :description="state.type === 'ping' ? 'Enter hostname or IP address' : `Enter ${state.type.toUpperCase()} URL to monitor`"
          :error="urlError || undefined"
        >
          <UInput
            v-model="state.url"
            :placeholder="state.type === 'ping' ? 'example.com or 192.168.1.1' : 'https://example.com'"
            class="w-full"
          />
        </UFormField>
      </div>

      <!-- Monitor Type -->
      <div class="space-y-4">
        <h4 class="font-medium text-sm text-gray-900 dark:text-gray-100">
          Monitor Type
        </h4>

        <UFormField
          label="Type"
          name="type"
          required
          description="Choose the monitoring method"
        >
          <USelectMenu
            v-model="state.type"
            :items="MONITOR_TYPES"
            value-key="value"
            class="w-full"
          />
        </UFormField>
      </div>

      <!-- Configuration -->
      <div class="space-y-4">
        <h4 class="font-medium text-sm text-gray-900 dark:text-gray-100">
          Configuration
        </h4>

        <UFormField
          label="Check Interval"
          name="checkIntervalMinutes"
          required
          description="How often to check this monitor"
        >
          <USelectMenu
            v-model="state.checkIntervalMinutes"
            :items="MONITOR_INTERVALS"
            value-key="value"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Preferred Region"
          name="preferredRegion"
          required
          description="Choose the monitoring region closest to your target"
        >
          <USelectMenu
            v-model="state.preferredRegion"
            :items="availableRegions"
            value-key="value"
            class="w-full"
          />
        </UFormField>
      </div>

      <!-- Advanced Configuration -->
      <div v-if="selectedMonitorType" class="space-y-4">
        <h4 class="font-medium text-sm text-gray-900 dark:text-gray-100">
          Advanced Configuration
        </h4>

        <MonitorConfigForm
          :model-value="state.config || {}"
          :monitor-type="state.type"
          :config-fields="selectedMonitorType.configFields"
          @update:model-value="state.config = $event"
        />
      </div>

      <!-- Form Actions -->
      <div class="flex justify-end gap-3 pt-4 border-t">
        <UButton
          variant="outline"
          @click="handleCancel"
        >
          Cancel
        </UButton>
        
        <UButton
          type="submit"
          :loading="loading"
          :disabled="!isFormValid || (!hasChanges && isEditMode)"
        >
          {{ isEditMode ? 'Update Monitor' : 'Create Monitor' }}
        </UButton>
      </div>
    </UForm>
  </UCard>
</template>