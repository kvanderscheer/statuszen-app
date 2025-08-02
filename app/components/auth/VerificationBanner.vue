<script setup lang="ts">
interface Props {
  show?: boolean
}

interface Emits {
  (e: 'dismiss' | 'resend'): void
}

const props = withDefaults(defineProps<Props>(), {
  show: true
})

const emit = defineEmits<Emits>()

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const toast = useToast()

const isResending = ref(false)
const isDismissed = ref(false)

// Check if user email is verified
const isEmailVerified = computed(() => {
  return user.value?.email_confirmed_at != null
})

// Show banner conditions
const shouldShowBanner = computed(() => {
  return props.show
    && user.value
    && !isEmailVerified.value
    && !isDismissed.value
})

// Resend verification email
const resendVerificationEmail = async () => {
  if (!user.value?.email) return

  isResending.value = true

  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.value.email
    })

    if (error) {
      toast.add({
        title: 'Failed to Resend',
        description: error.message,
        icon: 'i-lucide-alert-circle',
        color: 'error'
      })
    } else {
      toast.add({
        title: 'Verification Email Sent',
        description: 'Please check your inbox and spam folder.',
        icon: 'i-lucide-mail-check',
        color: 'success'
      })
      emit('resend')
    }
  } catch {
    toast.add({
      title: 'Error',
      description: 'Failed to resend verification email. Please try again.',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  } finally {
    isResending.value = false
  }
}

// Dismiss banner
const dismissBanner = () => {
  isDismissed.value = true
  emit('dismiss')
}

// Check verification status periodically
let verificationCheckInterval: NodeJS.Timeout | null = null

onMounted(() => {
  // Check verification status every 30 seconds
  if (shouldShowBanner.value) {
    verificationCheckInterval = setInterval(async () => {
      if (user.value) {
        const { data } = await supabase.auth.getUser()
        if (data.user?.email_confirmed_at) {
          // User has verified their email, refresh the page or update state
          window.location.reload()
        }
      }
    }, 30000) // 30 seconds
  }
})

onUnmounted(() => {
  if (verificationCheckInterval) {
    clearInterval(verificationCheckInterval)
  }
})

// Store dismissal in session storage
const DISMISSAL_KEY = 'verification-banner-dismissed'

onMounted(() => {
  const dismissed = sessionStorage.getItem(DISMISSAL_KEY)
  if (dismissed === 'true') {
    isDismissed.value = true
  }
})

watch(isDismissed, (newValue) => {
  if (newValue) {
    sessionStorage.setItem(DISMISSAL_KEY, 'true')
  } else {
    sessionStorage.removeItem(DISMISSAL_KEY)
  }
})
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 -translate-y-full"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-300 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-full"
  >
    <div
      v-if="shouldShowBanner"
      class="bg-orange-50 border-b border-orange-200 dark:bg-orange-950 dark:border-orange-800"
    >
      <div class="max-w-7xl mx-auto px-4 py-3">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <UIcon
              name="i-lucide-mail-warning"
              class="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0"
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-orange-800 dark:text-orange-200">
                Please verify your email address
              </p>
              <p class="text-xs text-orange-600 dark:text-orange-300 mt-1">
                We sent a verification link to <strong>{{ user?.email }}</strong>.
                Check your inbox and spam folder.
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <UButton
              variant="ghost"
              color="warning"
              size="xs"
              :loading="isResending"
              @click="resendVerificationEmail"
            >
              <template #leading>
                <UIcon name="i-lucide-refresh-cw" />
              </template>
              Resend Email
            </UButton>

            <UButton
              variant="ghost"
              color="warning"
              size="xs"
              icon="i-lucide-x"
              @click="dismissBanner"
            />
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
