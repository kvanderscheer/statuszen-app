<script setup lang="ts">
interface Props {
  collapsed?: boolean
}

defineProps<Props>()

const {
  currentOrganization,
  organizations,
  isLoading,
  switchOrganization,
  createOrganization,
  initializeOrganizations
} = useOrganization()

// Initialize organizations when component mounts
onMounted(async () => {
  if (organizations.value.length === 0) {
    await initializeOrganizations()
  }
})

const showCreateForm = ref(false)
const createForm = ref({
  name: '',
  description: ''
})

const isCreating = ref(false)

// Form validation schema
const schema = {
  name: {
    required: true,
    minLength: 1,
    message: 'Organization name is required'
  }
}

// Dropdown items for organization selection
const items = computed(() => {
  const orgItems = organizations.value.map(org => ({
    label: org.name,
    icon: 'i-lucide-building-2',
    onClick: () => {
      switchOrganization(org.id)
    },
    active: currentOrganization.value?.id === org.id
  }))

  return [
    [
      {
        type: 'label' as const,
        label: 'Switch Organization'
      }
    ],
    orgItems,
    [
      {
        label: 'Create Organization',
        icon: 'i-lucide-plus',
        onClick: (): void => { showCreateForm.value = true }
      },
      {
        label: 'Manage Organizations',
        icon: 'i-lucide-settings',
        to: '/account/organization'
      }
    ]
  ]
})

const handleCreateOrganization = async () => {
  if (!createForm.value.name.trim()) return

  isCreating.value = true
  try {
    const success = await createOrganization({
      name: createForm.value.name,
      description: createForm.value.description || undefined
    })

    if (success) {
      showCreateForm.value = false
      createForm.value = { name: '', description: '' }
    }
  } finally {
    isCreating.value = false
  }
}

const cancelCreate = () => {
  showCreateForm.value = false
  createForm.value = { name: '', description: '' }
}
</script>

<template>
  <div class="w-full max-w-full">
    <UDropdownMenu
      :items="items"
      :disabled="isLoading"
      :content="{ align: 'center', collisionPadding: 12 }"
      :ui="{
        content: collapsed ? 'w-48' : 'w-64',
        item: 'text-sm'
      }"
    >
      <UButton
        :loading="isLoading"
        :icon="collapsed ? 'i-lucide-building-2' : undefined"
        :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'"
        color="neutral"
        variant="ghost"
        block
        :square="collapsed"
        class="data-[state=open]:bg-elevated justify-start min-w-0"
        :ui="{
          trailingIcon: 'text-dimmed'
        }"
      >
        <template v-if="!collapsed">
          <div class="flex items-center min-w-0 gap-2 w-full overflow-hidden">
            <UIcon
              name="i-lucide-building-2"
              class="size-4 text-primary-500 flex-shrink-0"
            />
            <span class="truncate text-sm min-w-0 flex-1 block">
              {{ currentOrganization?.name || 'Select Organization' }}
            </span>
          </div>
        </template>
      </UButton>
    </UDropdownMenu>

    <!-- Create Organization Modal -->
    <UModal
      v-model:open="showCreateForm"
    >
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold">
                Create Organization
              </h3>
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="cancelCreate"
              />
            </div>
          </template>

          <UForm
            :state="createForm"
            :schema="schema"
            class="space-y-4"
            @submit="handleCreateOrganization"
          >
            <div class="space-y-4">
              <UFormField
                label="Organization Name"
                name="name"
                required
              >
                <UInput
                  v-model="createForm.name"
                  placeholder="Enter organization name"
                  :disabled="isCreating"
                  autofocus
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Description (Optional)"
                name="description"
              >
                <UTextarea
                  v-model="createForm.description"
                  placeholder="Enter organization description"
                  :disabled="isCreating"
                  :rows="3"
                  resize
                  class="w-full"
                />
              </UFormField>
            </div>
          </UForm>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton
                color="neutral"
                variant="ghost"
                :disabled="isCreating"
                @click="cancelCreate"
              >
                Cancel
              </UButton>
              <UButton
                type="submit"
                :loading="isCreating"
                :disabled="!createForm.name.trim()"
                @click="handleCreateOrganization"
              >
                Create Organization
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
