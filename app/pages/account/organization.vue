<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const route = useRoute()
const router = useRouter()

const {
  currentOrganization,
  organizations,
  isLoading,
  initializeOrganizations
} = useOrganization()

// Local loading state for initial page load
// Start as true if we don't have organizations yet
const isInitializing = ref(organizations.value.length === 0)

// Initialize organizations if not already loaded
onMounted(async () => {
  if (organizations.value.length === 0) {
    await initializeOrganizations()
  }
  isInitializing.value = false
})

// Get the current organization ID, fallback to user's current organization
const organizationId = computed(() => {
  return route.query.id as string || currentOrganization.value?.id || ''
})

// Redirect to first organization if no organization is selected
watchEffect(() => {
  if (!isLoading.value && organizations.value.length > 0 && !organizationId.value) {
    const firstOrg = organizations.value[0]
    if (firstOrg?.id) {
      router.replace({
        path: '/account/organization',
        query: { id: firstOrg.id }
      })
    }
  }
})

// Transform organizations for SelectMenu (needs label property)
const organizationItems = computed(() => {
  return organizations.value.map(org => ({
    label: org.name,
    id: org.id,
    description: org.description,
    role: org.role
  }))
})

const selectedOrganization = computed(() => {
  return organizations.value.find(org => org.id === organizationId.value)
})

const isOwner = computed(() => {
  return selectedOrganization.value?.role === 'owner'
})

const pageTitle = computed(() => {
  return selectedOrganization.value?.name || 'Organization'
})

// Ref to access MemberList component
const memberListRef = ref()

// Refresh members function
const refreshMembers = async () => {
  if (memberListRef.value?.refreshMembers) {
    await memberListRef.value.refreshMembers()
  }
}


</script>

<template>
  <div class="container mx-auto px-4 py-8 max-w-6xl">
    <Head>
      <Title>{{ pageTitle }} - Organization Management</Title>
    </Head>

    <!-- Header -->
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          {{ pageTitle }}
        </h1>
        <p class="mt-2 text-gray-600 dark:text-gray-400">
          Manage your organization settings and members
        </p>
      </div>

      <div class="flex items-center gap-3">
        <!-- Organization Selector (for switching between orgs) -->
        <USelectMenu
          v-if="organizations.length > 1"
          v-model="organizationId"
          :items="organizationItems"
          value-key="id"
          placeholder="Select organization"
          class="w-48"
          @update:model-value="(value: any) => router.push({ query: { id: value } })"
        >
          <template #leading>
            <UIcon
              name="i-lucide-building-2"
              class="size-4"
            />
          </template>
        </USelectMenu>

        <!-- Role Badge -->
        <UBadge
          v-if="selectedOrganization"
          :color="selectedOrganization.role === 'owner' ? 'primary' : 'neutral'"
          variant="soft"
          class="capitalize"
        >
          {{ selectedOrganization.role }}
        </UBadge>
      </div>
    </div>

    <!-- Loading State with Skeletons -->
    <div
      v-if="isLoading || isInitializing"
      class="flex flex-col gap-6"
    >
      <!-- Header Skeleton -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <USkeleton class="h-8 w-64 mb-2" />
            <USkeleton class="h-4 w-80" />
          </div>
          <div class="flex items-center gap-3">
            <USkeleton class="h-10 w-48" />
            <USkeleton class="h-6 w-16" />
          </div>
        </div>
      </div>

      <!-- Organization Overview Card Skeleton -->
      <UCard class="shadow-sm">
        <div class="flex items-center gap-4">
          <USkeleton class="h-12 w-12 rounded-full" />
          <div class="flex-1">
            <USkeleton class="h-5 w-48 mb-2" />
            <USkeleton class="h-4 w-80" />
          </div>
          <USkeleton class="h-9 w-32" />
        </div>
      </UCard>

      <!-- Members Section Skeleton -->
      <UCard variant="subtle" class="shadow-sm">
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <USkeleton class="h-5 w-24 mb-1" />
              <USkeleton class="h-4 w-64" />
            </div>
            <USkeleton class="h-8 w-20" />
          </div>
        </template>
        <div class="space-y-3">
          <div v-for="i in 3" :key="i" class="flex items-center gap-3">
            <USkeleton class="h-10 w-10 rounded-full" />
            <div class="flex-1">
              <USkeleton class="h-4 w-32 mb-1" />
              <USkeleton class="h-3 w-24" />
            </div>
            <USkeleton class="h-6 w-16" />
          </div>
        </div>
      </UCard>

      <!-- Settings Section Skeleton -->
      <UCard title="Organization Settings" variant="subtle" class="shadow-sm">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <USkeleton class="h-4 w-32" />
            <USkeleton class="h-6 w-20" />
          </div>
          <div class="flex items-center justify-between">
            <USkeleton class="h-4 w-40" />
            <USkeleton class="h-6 w-24" />
          </div>
          <div class="flex items-center justify-between">
            <USkeleton class="h-4 w-28" />
            <USkeleton class="h-6 w-16" />
          </div>
        </div>
      </UCard>
    </div>

    <!-- No Organization State (only when not loading) -->
    <UAlert
      v-else-if="!isLoading && !isInitializing && !selectedOrganization"
      icon="i-lucide-building-2"
      color="warning"
      variant="subtle"
      title="No Organization Selected"
      description="You don't have access to any organizations or the selected organization was not found."
      class="mb-6"
    >
      <template #actions>
        <UButton
          to="/dashboard"
          icon="i-lucide-arrow-left"
          size="sm"
        >
          Back to Dashboard
        </UButton>
      </template>
    </UAlert>

    <!-- Organization Content -->
    <div
      v-else-if="selectedOrganization"
      class="flex flex-col gap-6"
    >
      <!-- Organization Overview Card -->
      <UCard
        :title="selectedOrganization.name"
        :description="selectedOrganization.description || 'Manage your organization settings and members'"
        orientation="horizontal"
        class="shadow-sm"
      >
        <template #actions>
          <OrganizationInviteMember
            v-if="organizationId && isOwner"
            :organization-id="organizationId"
          />
        </template>
      </UCard>

      <!-- Members Section -->
      <UCard
        variant="subtle"
        class="shadow-sm"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h4 class="font-medium">
                Members
              </h4>
              <p class="text-sm text-muted-foreground">
                Manage organization members and their roles
              </p>
            </div>
            <UButton
              icon="i-lucide-refresh-cw"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="refreshMembers"
            >
              Refresh
            </UButton>
          </div>
        </template>

        <OrganizationMemberList
          v-if="organizationId"
          ref="memberListRef"
          :organization-id="organizationId"
          :key="organizationId"
        />
      </UCard>

      <!-- Settings Section (Owner Only) -->
      <UCard
        v-if="isOwner"
        title="Organization Settings"
        description="Configure organization preferences and security settings"
        variant="subtle"
        class="shadow-sm"
      >
        <OrganizationSettings
          v-if="organizationId"
          :organization-id="organizationId"
        />
      </UCard>

      <!-- Access Restricted Card (Non-Owners) -->
      <UCard
        v-else
        title="Organization Settings"
        description="Only organization owners can access these settings"
        variant="subtle"
        class="shadow-sm"
      >
        <div class="text-center py-8">
          <UIcon
            name="i-lucide-lock"
            class="size-12 text-muted-foreground mx-auto mb-4"
          />
          <h3 class="text-lg font-medium mb-2">
            Access Restricted
          </h3>
          <p class="text-muted-foreground">
            Only organization owners can access settings.
          </p>
        </div>
      </UCard>
    </div>
  </div>
</template>
