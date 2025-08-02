<script setup lang="ts">
// Handle email confirmation callback from Supabase
const route = useRoute()
const supabase = useSupabaseClient()
const toast = useToast()

const isLoading = ref(true)
const isSuccess = ref(false)
const errorMessage = ref('')

onMounted(async () => {
  try {
    // Extract tokens from URL hash (Supabase redirects with #access_token=...)
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')

    if (accessToken && refreshToken) {
      // Set the session using the tokens
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })

      if (error) {
        console.error('Session error:', error)
        errorMessage.value = 'Failed to verify email. The link may be expired or invalid.'
      } else if (data.user) {
        isSuccess.value = true

        toast.add({
          title: 'Email Verified Successfully!',
          description: 'Your account is now fully activated.',
          icon: 'i-lucide-check-circle',
          color: 'success'
        })

        // Clear verification banner dismissal from session storage
        sessionStorage.removeItem('verification-banner-dismissed')

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigateTo('/')
        }, 2000)
      } else {
        errorMessage.value = 'Verification link is invalid or expired.'
      }
    } else {
      // Check if there are error parameters in the URL
      const error = route.query.error_description || route.query.error
      if (error) {
        errorMessage.value = typeof error === 'string' ? error : 'Email verification failed.'
      } else {
        errorMessage.value = 'Invalid verification link.'
      }
    }
  } catch (err) {
    console.error('Confirmation error:', err)
    errorMessage.value = 'An unexpected error occurred during email verification.'
  } finally {
    isLoading.value = false
  }
})

// Meta tags
useHead({
  title: 'Email Verification - StatusZen',
  meta: [
    { name: 'description', content: 'Confirming your email address for StatusZen.' }
  ]
})
</script>

<template>
  <UContainer class="min-h-[calc(100vh-var(--ui-header-height))] flex items-center justify-center px-4">
    <UPageCard class="max-w-md w-full text-center">
      <!-- Loading State -->
      <div
        v-if="isLoading"
        class="space-y-4 py-8"
      >
        <div class="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
        <h1 class="text-xl font-semibold text-default">
          Verifying Your Email
        </h1>
        <p class="text-sm text-muted">
          Please wait while we confirm your email address...
        </p>
      </div>

      <!-- Success State -->
      <div
        v-else-if="isSuccess"
        class="space-y-4 py-8"
      >
        <div class="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
          <UIcon
            name="i-lucide-check-circle"
            class="w-8 h-8 text-green-600 dark:text-green-400"
          />
        </div>
        <h1 class="text-xl font-semibold text-default">
          Email Verified Successfully!
        </h1>
        <p class="text-sm text-muted">
          Your account is now fully activated. You'll be redirected to your dashboard shortly.
        </p>
        <div class="flex items-center justify-center gap-2 text-xs text-muted">
          <div class="animate-spin w-3 h-3 border border-primary border-t-transparent rounded-full" />
          Redirecting...
        </div>
      </div>

      <!-- Error State -->
      <div
        v-else
        class="space-y-4 py-8"
      >
        <div class="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto">
          <UIcon
            name="i-lucide-alert-circle"
            class="w-8 h-8 text-red-600 dark:text-red-400"
          />
        </div>
        <h1 class="text-xl font-semibold text-default">
          Verification Failed
        </h1>
        <p class="text-sm text-muted">
          {{ errorMessage }}
        </p>

        <div class="space-y-3 pt-4">
          <UButton
            to="/auth/login"
            variant="outline"
            block
          >
            Go to Login
          </UButton>
          <p class="text-xs text-muted">
            Need help?
            <UButton
              variant="link"
              class="p-0 text-xs h-auto"
              to="/support"
            >
              Contact Support
            </UButton>
          </p>
        </div>
      </div>
    </UPageCard>
  </UContainer>
</template>
