<script setup lang="ts">
interface Props {
  organizationId: string
}

const props = defineProps<Props>()

const {
  inviteMember,
  isUpdating,
  organizations
} = useOrganization()

const showInviteForm = ref(false)
const inviteForm = ref({
  email: ''
})

const isCurrentUserOwner = computed(() => {
  const userOrg = organizations.value.find(org => org.id === props.organizationId)
  return userOrg?.role === 'owner'
})

const emailError = ref<string | null>(null)

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$/
  return emailRegex.test(email)
}

const handleInviteMember = async () => {
  emailError.value = null

  if (!inviteForm.value.email.trim()) {
    emailError.value = 'Email address is required'
    return
  }

  if (!validateEmail(inviteForm.value.email)) {
    emailError.value = 'Please enter a valid email address'
    return
  }

  const success = await inviteMember(props.organizationId, {
    email: inviteForm.value.email.trim()
  })

  if (success) {
    showInviteForm.value = false
    inviteForm.value = { email: '' }
  }
}

const cancelInvite = () => {
  showInviteForm.value = false
  inviteForm.value = { email: '' }
  emailError.value = null
}

const openInviteForm = () => {
  if (isCurrentUserOwner.value) {
    showInviteForm.value = true
  }
}
</script>

<template>
  <div>
    <!-- Invite Button -->
    <UButton
      v-if="isCurrentUserOwner"
      icon="i-lucide-user-plus"
      @click="openInviteForm"
    >
      Invite Member
    </UButton>

    <UButton
      v-else
      icon="i-lucide-user-plus"
      disabled
      variant="ghost"
    >
      <UTooltip text="Only organization owners can invite members" />
      Invite Member
    </UButton>

    <!-- Invite Member Modal -->
    <UModal
      v-model:open="showInviteForm"
      :close="{ onClick: cancelInvite }"
    >
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold">
                Invite Member
              </h3>
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="cancelInvite"
              />
            </div>
          </template>

          <form
            class="space-y-4"
            @submit.prevent="handleInviteMember"
          >
            <div class="text-sm text-muted-foreground mb-4">
              Send an invitation to join your organization. They'll receive an email with instructions to accept the invitation.
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium text-foreground">
                Email Address <span class="text-red-500">*</span>
              </label>
              <UInput
                v-model="inviteForm.email"
                type="email"
                placeholder="Enter email address"
                :disabled="isUpdating"
                autofocus
                @input="emailError = null"
              />
              <p
                v-if="emailError"
                class="text-sm text-red-500"
              >
                {{ emailError }}
              </p>
            </div>

            <UAlert
              icon="i-lucide-info"
              color="info"
              variant="soft"
              title="Invitation Details"
              description="Invitations expire after 7 days. The invited user will be added as a member of the organization."
            />
          </form>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton
                color="neutral"
                variant="ghost"
                :disabled="isUpdating"
                @click="cancelInvite"
              >
                Cancel
              </UButton>
              <UButton
                icon="i-lucide-send"
                type="submit"
                :disabled="!inviteForm.email.trim() || !!emailError"
                :loading="isUpdating"
                @click="handleInviteMember"
              >
                Send Invitation
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
