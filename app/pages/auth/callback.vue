<script setup lang="ts">
definePageMeta({
  layout: 'empty'
})

// const { logOAuthLogin } = useActivityLogger()
const user = useSupabaseUser()
const route = useRoute()

// Watch for user to be populated after OAuth callback
watchEffect(async () => {
  if (user.value) {
    // Extract provider from URL if available
    const provider = route.query.provider as string || 'google'

    // Log the OAuth login
    // await logOAuthLogin(provider, {
    //  authMethod: 'oauth',
    //  referrer: document.referrer
    // })

    // Redirect to home
    await navigateTo('/')
  }
})

onMounted(() => {
  // If there's an error in the URL, handle it
  const error = route.query.error as string
  const errorDescription = route.query.error_description as string

  if (error) {
    console.error('OAuth error:', error, errorDescription)
    // Redirect to login with error
    navigateTo(`/auth/login?error=${encodeURIComponent(errorDescription || error)}`)
  }
})
</script>

<template>
  <div class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <div class="mb-4">
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-8 h-8 animate-spin text-primary"
        />
      </div>
      <p class="text-gray-600">
        Completing sign in...
      </p>
    </div>
  </div>
</template>
