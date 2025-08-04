<script setup lang="ts">
import type { SignupFormData } from '~/types/auth'
import { getPasswordStrength } from '~/utils/validation'

definePageMeta({
  layout: 'empty'
})

// Redirect if already logged in
const user = useSupabaseUser()
watchEffect(() => {
  if (user.value) {
    return navigateTo('/')
  }
})

// Setup composables
const { signUp, isLoading, getFieldError, clearErrors } = useSignup()
const supabase = useSupabaseClient()
const toast = useToast()

// Form state
const formData = reactive<SignupFormData>({
  email: '',
  password: '',
  fullName: ''
})

const showPassword = ref(false)
const acceptTerms = ref(false)

// Google OAuth provider
const signUpWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })
  if (error) {
    toast.add({
      title: 'Error',
      description: error.message,
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  }
}

// Password strength computation
const passwordStrength = computed(() => {
  if (!formData.password) return { strength: 0, label: '', color: 'gray' }
  return getPasswordStrength(formData.password)
})

// Form fields configuration
const fields = [
  {
    name: 'email',
    type: 'email' as const,
    label: 'Email Address',
    placeholder: 'Enter your work email',
    required: true,
    icon: 'i-lucide-mail'
  },
  {
    name: 'fullName',
    type: 'text' as const,
    label: 'Full Name',
    placeholder: 'Enter your full name',
    required: true,
    icon: 'i-lucide-user'
  }
]

// Form submission
const onSubmit = async () => {
  if (!acceptTerms.value) {
    const toast = useToast()
    toast.add({
      title: 'Terms Required',
      description: 'Please accept the terms and conditions to continue.',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
    return
  }

  clearErrors()

  const result = await signUp(formData)

  if (result.user && !result.error) {
    // Redirect to dashboard with a query parameter to show verification banner
    await navigateTo('/?signup=success')
  } else if (result.user && !result.session) {
    // User exists but needs email verification - don't redirect, just show message
    console.log('User needs to verify email - staying on signup page')
  } else if (result.error?.code === 'user_already_exists') {
    // For existing users, provide a helpful redirect option
    const toast = useToast()
    setTimeout(() => {
      toast.add({
        title: 'Redirect to Login?',
        description: 'Click here to go to the login page.',
        icon: 'i-lucide-arrow-right',
        color: 'primary',
        actions: [{
          label: 'Go to Login',
          onClick: () => {
            navigateTo('/auth/login')
          }
        }]
      })
    }, 2000)
  }
}

// Meta tags
useHead({
  title: 'Sign Up - StatusZen',
  meta: [
    { name: 'description', content: 'Create your StatusZen account and start monitoring your services today.' }
  ]
})
</script>

<template>
  <!-- Split Screen Layout -->
  <div class="dark min-h-[calc(100vh-var(--ui-header-height))] flex flex-col md:flex-row">
    <!-- Left Panel - Dark Form Area -->
    <div class="w-full md:w-1/2 lg:w-2/5 bg-gray-900 flex flex-col min-h-screen md:min-h-[calc(100vh-var(--ui-header-height))]">
      <!-- Logo Area -->
      <div class="p-6 lg:p-8">
        <NuxtLink
          to="/"
          class="flex items-center space-x-2"
        >
          <UIcon
            name="i-heroicons-sparkles"
            class="w-6 h-6 lg:w-8 lg:h-8 text-primary-500"
          />
          <span class="text-lg lg:text-xl font-bold text-white">StatusZen</span>
        </NuxtLink>
      </div>

      <!-- Form Content -->
      <div class="flex-1 flex items-center justify-center px-6 lg:px-8 pb-6 lg:pb-8">
        <div class="w-full max-w-md">
          <!-- Header -->
          <div class="text-center space-y-2 mb-8">
            <h1 class="text-3xl font-bold text-white">
              Create your <span class="text-blue-500">free</span> account
            </h1>
            <p class="text-sm text-slate-300">
              Join StatusZen and start monitoring your services
            </p>
          </div>

          <!-- Form -->
          <UForm
            class="space-y-6"
            :state="formData"
            @submit="onSubmit"
          >
            <!-- Personal Information Section -->
            <div class="space-y-4">
              <div
                v-for="field in fields"
                :key="field.name"
                class="space-y-1"
              >
                <UFormField
                  :name="field.name"
                  :label="field.label"
                  :required="field.required"
                  :error="getFieldError(field.name) || undefined"
                  class="[&_label]:text-slate-300 [&_.text-red-500]:text-red-400"
                >
                  <UInput
                    v-model="formData[field.name as keyof SignupFormData]"
                    class="w-full [&_input]:bg-gray-700 [&_input]:border-gray-600 [&_input]:text-white [&_input]:placeholder-gray-400"
                    :type="field.type"
                    :placeholder="field.placeholder"
                    :icon="field.icon"
                    size="lg"
                    :disabled="isLoading"
                    autocomplete="off"
                  />
                </UFormField>
              </div>
            </div>

            <!-- Password Section -->
            <div class="space-y-4">
              <UFormField
                name="password"
                label="Password"
                required
                :error="getFieldError('password') || undefined"
                class="[&_label]:text-slate-300 [&_.text-red-500]:text-red-400"
              >
                <UInput
                  v-model="formData.password"
                  class="w-full [&_input]:bg-gray-700 [&_input]:border-gray-600 [&_input]:text-white [&_input]:placeholder-gray-400"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Create a strong password"
                  icon="i-lucide-lock"
                  size="lg"
                  :disabled="isLoading"
                  autocomplete="new-password"
                  block
                >
                  <template #trailing>
                    <UButton
                      variant="ghost"
                      color="neutral"
                      size="xs"
                      :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                      class="text-slate-400 hover:text-white"
                      @click="showPassword = !showPassword"
                    />
                  </template>
                </UInput>
              </UFormField>

              <!-- Password Strength Indicator -->
              <div
                v-if="formData.password"
                class="space-y-2"
              >
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-400">Password Strength</span>
                  <span :class="`text-${passwordStrength.color}-400 font-medium`">
                    {{ passwordStrength.label }}
                  </span>
                </div>
                <div class="w-full bg-slate-700 rounded-full h-1">
                  <div
                    class="h-1 rounded-full transition-all duration-300"
                    :class="`bg-${passwordStrength.color}-500`"
                    :style="{ width: `${passwordStrength.strength}%` }"
                  />
                </div>
              </div>
            </div>

            <!-- Terms and Conditions -->
            <div class="space-y-4">
              <UFormField
                name="terms"
                :error="undefined"
              >
                <UCheckbox
                  v-model="acceptTerms"
                  :disabled="isLoading"
                  class="flex items-start gap-3"
                >
                  <template #label>
                    <span class="text-sm text-slate-300">
                      I agree to the
                      <UButton
                        variant="link"
                        class="p-0 text-sm h-auto"
                        to="/terms"
                        target="_blank"
                      >
                        terms of service
                      </UButton>
                      and
                      <UButton
                        variant="link"
                        class="p-0 text-sm h-auto"
                        to="/privacy"
                        target="_blank"
                      >
                        privacy policy
                      </UButton>
                    </span>
                  </template>
                </UCheckbox>
              </UFormField>
            </div>

            <!-- Submit Button -->
            <UButton
              type="submit"
              size="lg"
              :loading="isLoading"
              :disabled="!acceptTerms"
              block
              class="mt-6 bg-orange-600 hover:bg-orange-700 text-white"
            >
              <template #leading>
                <UIcon name="i-lucide-rocket" />
              </template>
              Create Account
            </UButton>

            <!-- Divider -->
            <div class="relative my-6">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-slate-700" />
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="bg-gray-900 px-3 text-slate-400">or continue with</span>
              </div>
            </div>

            <!-- Google Sign Up Button -->
            <UButton
              variant="outline"
              size="lg"
              block
              class="bg-gray-700 hover:bg-gray-600 border-gray-600 text-white"
              @click="signUpWithGoogle"
            >
              <template #leading>
                <UIcon name="i-simple-icons-google" />
              </template>
              Sign up with Google
            </UButton>

            <!-- Login Link -->
            <div class="text-center pt-4 border-t border-slate-700">
              <p class="text-sm text-slate-300">
                Already have an account?
                <UButton
                  variant="link"
                  color="primary"
                  to="/auth/login"
                  class="p-0 text-sm h-auto"
                >
                  Sign in here
                </UButton>
              </p>
            </div>
          </UForm>
        </div>
      </div>
    </div>

    <!-- Right Panel - Hero Background -->
    <div class="hidden md:flex lg:w-3/5 md:w-1/2 items-center justify-center relative overflow-hidden min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black">
      <ParticleSystem />

      <!-- Promotional Badge -->
      <!--       <div class="absolute top-12 left-1/2 transform -translate-x-1/2 z-20">
        <div class="bg-blue-600/20 backdrop-blur-sm border border-blue-500/30 rounded-full px-6 py-2">
          <span class="text-blue-300 text-sm font-medium">20% off our annual plan</span>
        </div>
      </div>
 -->
      <!-- Main Content -->
      <div class="relative z-10 text-center px-8 max-w-4xl">
        <!-- Hero Title with Gradient -->
        <h1 class="text-4xl lg:text-6xl xl:text-7xl font-bold mb-6 leading-tight">
          <span class="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-300 bg-clip-text text-transparent">
            Monitor & Share Your Service Status with Confidence
          </span>
        </h1>

        <!-- Subtitle -->
        <p class="text-gray-300 text-lg lg:text-xl max-w-3xl mx-auto leading-relaxed">
          Beautiful status pages, real-time monitoring, and instant notifications to keep your team and customers informed.
        </p>
      </div>
    </div>
  </div>
</template>
