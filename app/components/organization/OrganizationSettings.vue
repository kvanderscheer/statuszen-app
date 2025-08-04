<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

interface Props {
  organizationId: string
}

const props = defineProps<Props>()

const {
  currentOrganization,
  organizations,
  updateOrganization,
  isUpdating
} = useOrganization()

// Validation schema
const schema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  description: z.string().optional()
})

type Schema = z.output<typeof schema>

const isCurrentUserOwner = computed(() => {
  const userOrg = organizations.value.find(org => org.id === props.organizationId)
  return userOrg?.role === 'owner'
})

const organization = computed(() => {
  return organizations.value.find(org => org.id === props.organizationId) || currentOrganization.value
})

const state = reactive<Partial<Schema>>({
  name: '',
  description: ''
})

const showDeleteConfirm = ref(false)

// Watch for organization changes to update form
watch(organization, (newOrg) => {
  if (newOrg) {
    state.name = newOrg.name
    state.description = newOrg.description || ''
  }
}, { immediate: true })

const handleUpdateOrganization = async (event: FormSubmitEvent<Schema>) => {
  const updateData: { name?: string, description?: string } = {}

  if (event.data.name !== organization.value?.name) {
    updateData.name = event.data.name
  }

  if (event.data.description !== (organization.value?.description || '')) {
    updateData.description = event.data.description || undefined
  }

  if (Object.keys(updateData).length === 0) {
    return // No changes to save
  }

  await updateOrganization(props.organizationId, updateData)
}

const openDeleteConfirm = () => {
  if (isCurrentUserOwner.value) {
    showDeleteConfirm.value = true
  }
}

const handleOrganizationDeleted = () => {
  // Handle any cleanup if needed after deletion
  console.log('Organization deleted successfully')
}

const hasChanges = computed(() => {
  return state.name !== organization.value?.name
    || state.description !== (organization.value?.description || '')
})
</script>

<template>
  <div class="space-y-6">
    <!-- Organization Information -->
    <UCard>
      <template #header>
        <h4 class="font-medium">
          Basic Information
        </h4>
      </template>

      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        :disabled="!isCurrentUserOwner || isUpdating"
        @submit="handleUpdateOrganization"
      >
        <UFormField
          label="Organization Name"
          name="name"
          required
        >
          <UInput
            v-model="state.name"
            placeholder="Enter organization name"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Description"
          name="description"
        >
          <UTextarea
            v-model="state.description"
            placeholder="Enter organization description"
            :rows="3"
            resize
            class="w-full"
          />
        </UFormField>

        <div
          v-if="!isCurrentUserOwner"
          class="text-sm text-muted-foreground"
        >
          <UIcon
            name="i-lucide-info"
            class="inline size-4 mr-1"
          />
          Only organization owners can modify these settings.
        </div>

        <div
          v-if="isCurrentUserOwner"
          class="flex justify-end"
        >
          <UButton
            type="submit"
            :loading="isUpdating"
            :disabled="!hasChanges || !state.name?.trim()"
          >
            Save Changes
          </UButton>
        </div>
      </UForm>
    </UCard>

    <!-- Danger Zone -->
    <UCard v-if="isCurrentUserOwner">
      <template #header>
        <h4 class="font-medium text-red-600 dark:text-red-400">
          Danger Zone
        </h4>
      </template>

      <div class="space-y-4">
        <div>
          <h5 class="font-medium mb-2">
            Delete Organization
          </h5>
          <p class="text-sm text-muted-foreground mb-4">
            Permanently delete this organization and all associated data. This action cannot be undone.
          </p>

          <UButton
            color="error"
            variant="outline"
            icon="i-lucide-trash-2"
            @click="openDeleteConfirm"
          >
            Delete Organization
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Delete Confirmation Modal -->
    <OrganizationDeleteOrganizationModal
      v-if="organization"
      v-model:open="showDeleteConfirm"
      :organization-id="props.organizationId"
      :organization-name="organization.name"
      @deleted="handleOrganizationDeleted"
    />
  </div>
</template>
