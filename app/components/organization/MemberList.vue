<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { OrganizationMember } from '~/types/auth'

interface Props {
  organizationId: string
}

const props = defineProps<Props>()

const {
  members,
  organizations,
  isMembersLoading,
  fetchMembers
} = useOrganization()

// Expose refresh function to parent component
const refreshMembers = async () => {
  if (props.organizationId) {
    await fetchMembers(props.organizationId)
  }
}

defineExpose({
  refreshMembers
})

// Resolve components for use in cell functions
const UAvatar = resolveComponent('UAvatar')
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UTooltip = resolveComponent('UTooltip')

const isCurrentUserOwner = computed(() => {
  const userOrg = organizations.value.find(org => org.id === props.organizationId)
  return userOrg?.role === 'owner'
})

// Load members when component mounts
onMounted(async () => {
  if (props.organizationId) {
    await fetchMembers(props.organizationId)
  }
})

// Load members when organizationId changes (but not on mount)
watch(() => props.organizationId, async (newId, oldId) => {
  if (newId && oldId && newId !== oldId) {
    await fetchMembers(newId)
  }
})

// Type for flattened table row
interface TableRow extends OrganizationMember {
  name: string
  email: string
}

// Transform members data for table display with flattened structure
const tableRows = computed((): TableRow[] => {
  return members.value.map((member) => {
    return {
      ...member,
      name: member.user?.fullName || 'Unknown',
      email: member.user?.email || 'No email'
    }
  })
})

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'owner':
      return 'primary'
    case 'member':
      return 'neutral'
    default:
      return 'neutral'
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Modal states
const showRemoveModal = ref(false)
const showTransferModal = ref(false)
const selectedMember = ref<OrganizationMember | null>(null)

const handleRemoveMember = (member: OrganizationMember) => {
  selectedMember.value = member
  showRemoveModal.value = true
}

const handleTransferOwnership = (member: OrganizationMember) => {
  selectedMember.value = member
  showTransferModal.value = true
}

const confirmRemoveMember = async () => {
  if (!selectedMember.value) return

  // TODO: Implement when remove member endpoint is available
  console.log('Remove member:', selectedMember.value)

  // Close modal and reset
  showRemoveModal.value = false
  selectedMember.value = null
}

const confirmTransferOwnership = async () => {
  if (!selectedMember.value) return

  // TODO: Implement when transfer ownership endpoint is available
  console.log('Transfer ownership to:', selectedMember.value)

  // Close modal and reset
  showTransferModal.value = false
  selectedMember.value = null
}

const cancelAction = () => {
  showRemoveModal.value = false
  showTransferModal.value = false
  selectedMember.value = null
}

const canRemoveMember = (member: OrganizationMember) => {
  // Can't remove yourself or remove owner
  const user = useSupabaseUser()
  return isCurrentUserOwner.value
    && user.value?.id !== member.userId
    && member.role !== 'owner'
}

const canTransferOwnership = (member: OrganizationMember) => {
  // Only owners can transfer ownership, and not to themselves
  const user = useSupabaseUser()
  return isCurrentUserOwner.value
    && user.value?.id !== member.userId
    && member.role === 'member'
}

// Define columns using the new TableColumn API
const columns: TableColumn<TableRow>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const member = row.original
      return h('div', { class: 'flex items-center gap-3' }, [
        h(UAvatar, { alt: member.name, size: 'sm' }),
        h('div', [
          h('div', { class: 'font-medium' }, member.name)
        ])
      ])
    }
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => {
      return h('span', { class: 'text-muted-foreground' }, row.getValue('email'))
    }
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => {
      const role = row.getValue('role') as string
      const color = getRoleBadgeColor(role)
      return h(UBadge, { color, variant: 'soft', class: 'capitalize' }, () => role)
    }
  },
  {
    accessorKey: 'joinedAt',
    header: 'Joined',
    cell: ({ row }) => {
      const date = row.getValue('joinedAt') as string
      return h('span', { class: 'text-sm text-muted-foreground' }, formatDate(date))
    }
  },
  {
    accessorKey: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const member = row.original
      const buttons = []

      if (canTransferOwnership(member)) {
        buttons.push(
          h(UButton, {
            icon: 'i-lucide-crown',
            color: 'warning',
            variant: 'ghost',
            size: 'sm',
            onClick: () => handleTransferOwnership(member)
          }, () => h(UTooltip, { text: 'Transfer ownership' }))
        )
      }

      if (canRemoveMember(member)) {
        buttons.push(
          h(UButton, {
            icon: 'i-lucide-user-minus',
            color: 'error',
            variant: 'ghost',
            size: 'sm',
            onClick: () => handleRemoveMember(member)
          }, () => h(UTooltip, { text: 'Remove member' }))
        )
      }

      if (buttons.length === 0) {
        buttons.push(
          h('span', { class: 'text-xs text-muted-foreground' }, 'No actions')
        )
      }

      return h('div', { class: 'flex items-center gap-1' }, buttons)
    }
  }
]
</script>

<template>
  <div class="space-y-4 w-full">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h4 class="font-medium">
            Members ({{ members.length }})
          </h4>
        </div>
      </template>

      <div
        v-if="isMembersLoading"
        class="flex items-center justify-center py-8"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="size-6 animate-spin text-muted-foreground"
        />
        <span class="ml-2 text-sm text-muted-foreground">Loading members...</span>
      </div>

      <div
        v-else-if="members.length === 0"
        class="text-center py-8"
      >
        <UIcon
          name="i-lucide-users"
          class="size-12 text-muted-foreground mx-auto mb-3"
        />
        <h4 class="text-lg font-medium mb-2">
          No members found
        </h4>
        <p class="text-sm text-muted-foreground">
          This organization doesn't have any members yet.
        </p>
      </div>

      <div
        v-else
        class="w-full"
      >
        <div class="w-full overflow-x-auto">
          <UTable
            :columns="columns"
            :data="tableRows"
            :loading="isMembersLoading"
            class="w-full min-w-0"
          />
        </div>
      </div>
    </UCard>

    <!-- Remove Member Confirmation Modal -->
    <UModal
      v-model:open="showRemoveModal"
      :close="{ onClick: cancelAction }"
    >
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-red-600">
                Remove Member
              </h3>
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="cancelAction"
              />
            </div>
          </template>

          <div class="space-y-4">
            <div class="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <UIcon
                name="i-lucide-alert-triangle"
                class="size-5 text-red-600"
              />
              <div>
                <p class="font-medium text-red-800 dark:text-red-200">
                  Are you sure you want to remove this member?
                </p>
                <p class="text-sm text-red-600 dark:text-red-400 mt-1">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div
              v-if="selectedMember"
              class="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
            >
              <UAvatar
                :alt="selectedMember.user?.fullName"
                size="sm"
              />
              <div>
                <div class="font-medium">
                  {{ selectedMember.user?.fullName }}
                </div>
                <div class="text-sm text-muted-foreground">
                  {{ selectedMember.user?.email }}
                </div>
              </div>
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton
                color="neutral"
                variant="ghost"
                @click="cancelAction"
              >
                Cancel
              </UButton>
              <UButton
                color="error"
                icon="i-lucide-user-minus"
                @click="confirmRemoveMember"
              >
                Remove Member
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Transfer Ownership Confirmation Modal -->
    <UModal
      v-model:open="showTransferModal"
      :close="{ onClick: cancelAction }"
    >
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-orange-600">
                Transfer Ownership
              </h3>
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="cancelAction"
              />
            </div>
          </template>

          <div class="space-y-4">
            <div class="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <UIcon
                name="i-lucide-crown"
                class="size-5 text-orange-600"
              />
              <div>
                <p class="font-medium text-orange-800 dark:text-orange-200">
                  Transfer organization ownership?
                </p>
                <p class="text-sm text-orange-600 dark:text-orange-400 mt-1">
                  You will lose owner privileges and become a regular member.
                </p>
              </div>
            </div>

            <div
              v-if="selectedMember"
              class="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
            >
              <UAvatar
                :alt="selectedMember.user?.fullName"
                size="sm"
              />
              <div>
                <div class="font-medium">
                  {{ selectedMember.user?.fullName }}
                </div>
                <div class="text-sm text-muted-foreground">
                  {{ selectedMember.user?.email }}
                </div>
              </div>
            </div>

            <UAlert
              icon="i-lucide-info"
              color="info"
              variant="soft"
              title="Important"
              description="This action cannot be undone. The new owner will have full control over the organization."
            />
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton
                color="neutral"
                variant="ghost"
                @click="cancelAction"
              >
                Cancel
              </UButton>
              <UButton
                color="warning"
                icon="i-lucide-crown"
                @click="confirmTransferOwnership"
              >
                Transfer Ownership
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
