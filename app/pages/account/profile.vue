<script setup lang="ts">
import type { ProfileUpdateData } from '~/types/auth'
import { timezoneGroups, getUserTimezone, formatTimezoneWithTime } from '~/utils/timezones'
import type { FormError, FormSubmitEvent } from '#ui/types'

// Meta and auth
definePageMeta({
  middleware: ['auth']
})

useSeoMeta({
  title: 'Profile Settings',
  description: 'Manage your account profile settings'
})

// Composables
const { profile, isLoading, isUpdating, error, updateProfile, initializeProfile } = useProfile()
const user = useSupabaseUser()
const toast = useToast()

// Form state
const state = reactive<ProfileUpdateData>({
  fullName: '',
  company: '',
  phoneNumber: '',
  timezone: 'UTC'
})

// Initialize form when profile loads
watch(profile, (newProfile: typeof profile.value) => {
  if (newProfile) {
    state.fullName = newProfile.fullName || ''
    state.company = newProfile.company || ''
    state.phoneNumber = newProfile.phoneNumber || ''
    state.timezone = newProfile.timezone || getUserTimezone()
  }
}, { immediate: true })

// Load profile on component mount
onMounted(async () => {
  await initializeProfile()
})

// Custom validation function
const validate = (state: any): FormError[] => {
  const errors: FormError[] = []

  // Validate full name
  if (!state.fullName?.trim()) {
    errors.push({ name: 'fullName', message: 'Full name is required' })
  } else if (state.fullName.trim().length < 2) {
    errors.push({ name: 'fullName', message: 'Full name must be at least 2 characters' })
  } else if (state.fullName.trim().length > 100) {
    errors.push({ name: 'fullName', message: 'Full name cannot exceed 100 characters' })
  } else if (!/^[a-zA-Z\s'-]+$/.test(state.fullName.trim())) {
    errors.push({ name: 'fullName', message: 'Full name can only contain letters, spaces, hyphens, and apostrophes' })
  }

  // Validate company (optional)
  if (state.company && state.company.length > 100) {
    errors.push({ name: 'company', message: 'Company name cannot exceed 100 characters' })
  }

  // Validate phone number (optional)
  if (state.phoneNumber && state.phoneNumber.trim()) {
    const phoneRegex = /^\+[1-9]\d{1,14}$/
    if (!phoneRegex.test(state.phoneNumber.trim())) {
      errors.push({ name: 'phoneNumber', message: 'Phone number must be in international format (e.g., +1234567890)' })
    }
  }

  // Validate timezone
  if (!state.timezone) {
    errors.push({ name: 'timezone', message: 'Timezone is required' })
  }

  return errors
}

// Handle form submission
const onSubmit = async (event: FormSubmitEvent<ProfileUpdateData>) => {
  // Debug: Log the timezone value being submitted
  console.log('Submitting timezone:', event.data.timezone)
  console.log('Current profile timezone:', profile.value?.timezone)

  // Prepare update data (only include changed fields)
  const updateData: ProfileUpdateData = {}

  if (event.data.fullName?.trim() !== profile.value?.fullName) {
    updateData.fullName = event.data.fullName?.trim()
  }

  if (event.data.company?.trim() !== profile.value?.company) {
    updateData.company = event.data.company?.trim() || ''
  }

  if (event.data.phoneNumber?.trim() !== profile.value?.phoneNumber) {
    updateData.phoneNumber = event.data.phoneNumber?.trim() || ''
  }

  if (event.data.timezone !== profile.value?.timezone) {
    updateData.timezone = event.data.timezone
    console.log('Timezone changed to:', event.data.timezone)
  }

  // Check if there are any changes
  if (Object.keys(updateData).length === 0) {
    toast.add({
      title: 'No Changes',
      description: 'No changes detected in your profile',
      icon: 'i-lucide-info',
      color: 'warning'
    })
    return
  }

  await updateProfile(updateData)
}

// Reset form to original values
const resetForm = () => {
  if (profile.value) {
    state.fullName = profile.value.fullName || ''
    state.company = profile.value.company || ''
    state.phoneNumber = profile.value.phoneNumber || ''
    state.timezone = profile.value.timezone || getUserTimezone()
  }
}

// Create timezone options for USelectMenu - grouped structure
const timezoneSelectOptions = Object.entries(timezoneGroups).reduce((acc, [group, zones]) => {
  // Add group label
  acc.push({
    type: 'label',
    label: group
  } as any)

  // Add timezone options for this group
  zones.forEach((tz) => {
    acc.push({
      label: formatTimezoneWithTime(tz.value),
      value: tz.value
    })
  })

  // Add separator after each group (except the last one)
  const groupKeys = Object.keys(timezoneGroups)
  if (group !== groupKeys[groupKeys.length - 1]) {
    acc.push({
      type: 'separator',
      label: ''
    } as any)
  }

  return acc
}, [] as Array<any>)
</script>

<template>
  <div class="container mx-auto px-4 py-8 max-w-2xl">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
        Profile Settings
      </h1>
      <p class="mt-2 text-gray-600 dark:text-gray-400">
        Manage your account information and preferences
      </p>
    </div>

    <!-- Loading State -->
    <div
      v-if="isLoading"
      class="flex justify-center py-12"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="h-8 w-8 animate-spin text-primary-500"
      />
    </div>

    <!-- Error State -->
    <UAlert
      v-else-if="error"
      icon="i-lucide-alert-circle"
      color="error"
      variant="subtle"
      :title="error"
      class="mb-6"
    />

    <!-- Profile Form -->
    <UCard
      v-else-if="profile"
      class="shadow-sm"
    >
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            Account Information
          </h2>
          <UBadge
            :color="profile.emailVerified ? 'success' : 'warning'"
            variant="subtle"
          >
            {{ profile.emailVerified ? 'Verified' : 'Unverified' }}
          </UBadge>
        </div>
      </template>

      <UForm
        :validate="validate"
        :state="state"
        class="space-y-6"
        @submit="onSubmit"
      >
        <!-- Email (read-only) -->
        <UFormField
          label="Email Address"
          hint="Contact support to change your email"
        >
          <UInput
            :value="user?.email"
            disabled
            icon="i-lucide-mail"
            class="w-full bg-gray-50 dark:bg-gray-800"
          />
        </UFormField>

        <!-- Full Name -->
        <UFormField
          label="Full Name"
          name="fullName"
          required
        >
          <UInput
            v-model="state.fullName"
            placeholder="Enter your full name"
            icon="i-lucide-user"
            :loading="isUpdating"
            class="w-full"
          />
        </UFormField>

        <!-- Company -->
        <UFormField
          label="Company"
          name="company"
          hint="Optional"
        >
          <UInput
            v-model="state.company"
            placeholder="Enter your company name"
            icon="i-lucide-building"
            :loading="isUpdating"
            class="w-full"
          />
        </UFormField>

        <!-- Phone Number -->
        <UFormField
          label="Phone Number"
          name="phoneNumber"
          hint="International format (e.g., +1234567890)"
        >
          <UInput
            v-model="state.phoneNumber"
            placeholder="+1234567890"
            icon="i-lucide-phone"
            :loading="isUpdating"
            class="w-full"
          />
        </UFormField>

        <!-- Timezone -->
        <UFormField
          label="Timezone"
          name="timezone"
          required
        >
          <USelectMenu
            v-model="state.timezone"
            :items="timezoneSelectOptions"
            placeholder="Select your timezone"
            icon="i-lucide-clock"
            :loading="isUpdating"
            searchable
            value-key="value"
            class="w-full"
          />
        </UFormField>

        <!-- Account Plan (read-only) -->
        <UFormField
          label="Current Plan"
          hint="Manage your subscription"
        >
          <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div class="flex items-center space-x-3">
              <UIcon
                name="i-lucide-crown"
                class="h-5 w-5 text-orange-500"
              />
              <span class="font-medium capitalize">{{ profile.plan }} Plan</span>
            </div>
            <UButton
              variant="ghost"
              size="sm"
              to="/account/billing"
            >
              Manage
            </UButton>
          </div>
        </UFormField>

        <!-- Form Actions -->
        <div class="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <UButton
            type="button"
            variant="ghost"
            :disabled="isUpdating"
            @click="resetForm"
          >
            Reset
          </UButton>
          <UButton
            type="submit"
            :loading="isUpdating"
            :disabled="isUpdating"
          >
            Update Profile
          </UButton>
        </div>
      </UForm>
    </UCard>

    <!-- Account Stats -->
    <UCard
      v-if="profile"
      class="mt-6 shadow-sm"
    >
      <template #header>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          Account Information
        </h3>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="flex items-center space-x-3">
          <UIcon
            name="i-lucide-calendar"
            class="h-5 w-5 text-gray-400"
          />
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Member since
            </p>
            <p class="font-medium">
              {{ new Date(profile.createdAt).toLocaleDateString() }}
            </p>
          </div>
        </div>
        <div class="flex items-center space-x-3">
          <UIcon
            name="i-lucide-clock"
            class="h-5 w-5 text-gray-400"
          />
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Last updated
            </p>
            <p class="font-medium">
              {{ new Date(profile.updatedAt).toLocaleDateString() }}
            </p>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
