<script setup lang="ts">
import type { MonitorType, MonitorConfig } from '~/types/monitor'

interface ConfigField {
  key: string
  label: string
  type: 'number' | 'string' | 'boolean' | 'select'
  required?: boolean
  default?: any
  options?: string[]
  min?: number
  max?: number
  placeholder?: string
  help?: string
}

interface Props {
  modelValue: MonitorConfig
  monitorType: MonitorType
  configFields: ConfigField[]
}

interface Emits {
  (e: 'update:modelValue', value: MonitorConfig): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Local reactive state for the config
const config = ref<Record<string, any>>({ ...props.modelValue })

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  config.value = { ...newValue }
}, { deep: true })

// Emit changes back to parent
const updateConfig = (key: string, value: any) => {
  config.value[key] = value
  emit('update:modelValue', { ...config.value })
}

// Get field value with proper type conversion
const getFieldValue = (field: ConfigField) => {
  const value = config.value[field.key]

  if (value === undefined || value === null) {
    return field.default
  }

  // Type conversion
  switch (field.type) {
    case 'number':
      return typeof value === 'number' ? value : Number(value) || field.default
    case 'boolean':
      return typeof value === 'boolean' ? value : Boolean(value)
    case 'string':
    case 'select':
      return String(value)
    default:
      return value
  }
}

// Validate number field
const isValidNumber = (value: any, field: ConfigField): boolean => {
  const num = Number(value)
  if (isNaN(num)) return false
  if (field.min !== undefined && num < field.min) return false
  if (field.max !== undefined && num > field.max) return false
  return true
}

// Get validation error for a field
const getFieldError = (field: ConfigField): string | null => {
  const value = getFieldValue(field)

  if (field.required && (value === undefined || value === null || value === '')) {
    return `${field.label} is required`
  }

  if (field.type === 'number' && value !== undefined && !isValidNumber(value, field)) {
    if (field.min !== undefined && field.max !== undefined) {
      return `${field.label} must be between ${field.min} and ${field.max}`
    } else if (field.min !== undefined) {
      return `${field.label} must be at least ${field.min}`
    } else if (field.max !== undefined) {
      return `${field.label} must be at most ${field.max}`
    }
    return `${field.label} must be a valid number`
  }

  return null
}

// Format help text with type-specific hints
const getFieldHelp = (field: ConfigField): string => {
  let help = field.help || ''

  if (field.type === 'number' && (field.min !== undefined || field.max !== undefined)) {
    const range = []
    if (field.min !== undefined) range.push(`min: ${field.min}`)
    if (field.max !== undefined) range.push(`max: ${field.max}`)
    if (range.length > 0) {
      help += help ? ` (${range.join(', ')})` : `Range: ${range.join(', ')}`
    }
  }

  return help
}
</script>

<template>
  <div class="space-y-4">
    <div
      v-for="field in configFields"
      :key="field.key"
      class="space-y-2"
    >
      <!-- Number Input -->
      <UFormField
        v-if="field.type === 'number'"
        :label="field.label"
        :required="field.required"
        :description="getFieldHelp(field)"
        :error="getFieldError(field) || undefined"
      >
        <UInput
          :model-value="getFieldValue(field)"
          type="number"
          :placeholder="field.placeholder || `Enter ${field.label.toLowerCase()}`"
          :min="field.min"
          :max="field.max"
          class="w-full"
          @input="updateConfig(field.key, Number($event.target.value))"
        />
      </UFormField>

      <!-- String Input -->
      <UFormField
        v-else-if="field.type === 'string'"
        :label="field.label"
        :required="field.required"
        :description="getFieldHelp(field)"
        :error="getFieldError(field) || undefined"
      >
        <UInput
          :model-value="getFieldValue(field)"
          type="text"
          :placeholder="field.placeholder || `Enter ${field.label.toLowerCase()}`"
          class="w-full"
          @input="updateConfig(field.key, $event.target.value)"
        />
      </UFormField>

      <!-- Boolean Toggle -->
      <UFormField
        v-else-if="field.type === 'boolean'"
        :label="field.label"
        :description="getFieldHelp(field)"
      >
        <USwitch
          :model-value="getFieldValue(field)"
          @update:model-value="updateConfig(field.key, $event)"
        />
      </UFormField>

      <!-- Select Dropdown -->
      <UFormField
        v-else-if="field.type === 'select' && field.options"
        :label="field.label"
        :required="field.required"
        :description="getFieldHelp(field)"
        :error="getFieldError(field) || undefined"
      >
        <USelectMenu
          :model-value="getFieldValue(field)"
          :items="field.options.map(opt => ({ label: opt, value: opt }))"
          value-key="value"
          class="w-full"
          @update:model-value="updateConfig(field.key, $event)"
        />
      </UFormField>
    </div>

    <!-- No configuration message -->
    <div
      v-if="configFields.length === 0"
      class="text-sm text-gray-500 text-center py-4"
    >
      No additional configuration options for {{ monitorType.toUpperCase() }} monitors.
    </div>
  </div>
</template>
