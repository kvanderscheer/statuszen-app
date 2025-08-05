<script setup lang="ts">
import type { MonitorType } from '~/types/monitor'
import { MONITOR_TYPES } from '~/types/monitor'

interface Props {
  modelValue: MonitorType
  disabled?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: MonitorType): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Handle selection
const handleSelect = (type: MonitorType) => {
  if (!props.disabled) {
    emit('update:modelValue', type)
  }
}

// Check if a type is selected
const isSelected = (type: MonitorType): boolean => {
  return props.modelValue === type
}
</script>

<template>
  <div class="space-y-3">
    <div
      v-for="monitorType in MONITOR_TYPES"
      :key="monitorType.value"
      class="relative"
    >
      <label
        class="flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
        :class="{
          'border-primary-500 bg-primary-50 dark:bg-primary-950': isSelected(monitorType.value),
          'border-gray-200 dark:border-gray-700': !isSelected(monitorType.value),
          'opacity-50 cursor-not-allowed': disabled
        }"
        @click="handleSelect(monitorType.value)"
      >
        <!-- Radio Button -->
        <div class="flex-shrink-0 mt-0.5">
          <div
            class="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors"
            :class="{
              'border-primary-500 bg-primary-500': isSelected(monitorType.value),
              'border-gray-300 dark:border-gray-600': !isSelected(monitorType.value)
            }"
          >
            <div
              v-if="isSelected(monitorType.value)"
              class="w-2 h-2 rounded-full bg-white"
            />
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-3 mb-2">
            <UIcon
              :name="monitorType.icon"
              class="w-5 h-5 text-gray-600 dark:text-gray-400"
            />
            <h3 class="font-medium text-gray-900 dark:text-gray-100">
              {{ monitorType.label }}
            </h3>
          </div>

          <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {{ monitorType.description }}
          </p>

          <!-- Configuration Preview -->
          <div class="space-y-2">
            <h4 class="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Configuration Options
            </h4>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div
                v-for="field in monitorType.configFields.slice(0, 4)"
                :key="field.key"
                class="flex items-center gap-2 text-gray-600 dark:text-gray-400"
              >
                <div class="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                <span>{{ field.label }}</span>
              </div>
              <div
                v-if="monitorType.configFields.length > 4"
                class="flex items-center gap-2 text-gray-500 dark:text-gray-500"
              >
                <div class="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                <span>+{{ monitorType.configFields.length - 4 }} more</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Selected Indicator -->
        <div
          v-if="isSelected(monitorType.value)"
          class="absolute top-3 right-3"
        >
          <UIcon
            name="i-lucide-check"
            class="w-5 h-5 text-primary-500"
          />
        </div>
      </label>
    </div>
  </div>
</template>
