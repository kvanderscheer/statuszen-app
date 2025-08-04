<script setup lang="ts">
interface Props {
  organizationId: string
  organizationName: string
  open: boolean
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'deleted'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { deleteOrganization } = useOrganization()
const router = useRouter()

const deleteConfirmText = ref('')
const isDeleting = ref(false)

const canDelete = computed(() => {
  return deleteConfirmText.value === props.organizationName
})

const handleDeleteOrganization = async () => {
  if (!canDelete.value) return

  isDeleting.value = true
  try {
    const success = await deleteOrganization(props.organizationId)
    if (success) {
      emit('update:open', false)
      emit('deleted')
      // Navigate to dashboard
      await router.push('/dashboard')
    }
  } finally {
    isDeleting.value = false
  }
}

const cancelDelete = () => {
  emit('update:open', false)
  deleteConfirmText.value = ''
}

// Reset form when modal closes
watch(() => props.open, (newValue) => {
  if (!newValue) {
    deleteConfirmText.value = ''
  }
})
</script>

<template>
  <UModal
    v-model:open="props.open"
    @update:open="(value: boolean) => emit('update:open', value)"
  >
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-red-600 dark:text-red-400">
              Delete Organization
            </h3>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="cancelDelete"
            />
          </div>
        </template>

        <div class="space-y-4">
          <UAlert
            icon="i-lucide-alert-triangle"
            color="error"
            variant="soft"
            title="Warning"
            description="This action cannot be undone. This will permanently delete the organization and all associated data."
          />

          <div>
            <p class="text-sm text-muted-foreground mb-2">
              Please type <strong>{{ organizationName }}</strong> to confirm deletion:
            </p>
            <UInput
              v-model="deleteConfirmText"
              placeholder="Type organization name here"
              :disabled="isDeleting"
            />
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton
              color="neutral"
              variant="ghost"
              :disabled="isDeleting"
              @click="cancelDelete"
            >
              Cancel
            </UButton>
            <UButton
              color="error"
              :loading="isDeleting"
              :disabled="!canDelete"
              icon="i-lucide-trash-2"
              @click="handleDeleteOrganization"
            >
              Delete Organization
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
