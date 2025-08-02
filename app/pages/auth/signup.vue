<script setup lang="ts">
import type { SignupFormData } from '~/types/auth'
import { getPasswordStrength } from '~/utils/validation'

// Redirect if already logged in
const user = useSupabaseUser()
watchEffect(() => {
  if (user.value) {
    return navigateTo('/')
  }
})

// Setup composables
const { signUp, isLoading, getFieldError, clearErrors } = useSignup()

// Form state
const formData = reactive<SignupFormData>({
  email: '',
  password: '',
  fullName: '',
  company: '',
  plan: 'free'
})

const showPassword = ref(false)
const acceptTerms = ref(false)

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
  },
  {
    name: 'company',
    type: 'text' as const,
    label: 'Company/Organization',
    placeholder: 'Enter your company name (optional)',
    required: false,
    icon: 'i-lucide-building'
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
  <UContainer class="min-h-[calc(100vh-var(--ui-header-height))] flex items-center justify-center px-4 py-8">
    <UPageCard class="max-w-xl w-full">
      <template #header>
        <div class="text-center space-y-2">
          <UIcon
            name="i-lucide-user-plus"
            class="w-8 h-8 text-primary mx-auto"
          />
          <h1 class="text-2xl font-bold text-default">
            Create Your Account
          </h1>
          <p class="text-sm text-muted">
            Join StatusZen and start monitoring your services
          </p>
        </div>
      </template>

      <UForm
        class="space-y-6"
        :state="formData"
        @submit="onSubmit"
      >
        <!-- Personal Information Section -->
        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-default border-b border-default pb-2">
            Personal Information
          </h3>

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
            >
              <UInput
                v-model="formData[field.name as keyof SignupFormData]"
                class="w-full"
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
          <h3 class="text-sm font-semibold text-default border-b border-default pb-2">
            Account Security
          </h3>

          <UFormField
            name="password"
            label="Password"
            required
            :error="getFieldError('password') || undefined"
          >
            <UInput
              v-model="formData.password"
              class="w-full"
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
              <span class="text-muted">Password Strength</span>
              <span :class="`text-${passwordStrength.color}-500 font-medium`">
                {{ passwordStrength.label }}
              </span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-1">
              <div
                class="h-1 rounded-full transition-all duration-300"
                :class="`bg-${passwordStrength.color}-500`"
                :style="{ width: `${passwordStrength.strength}%` }"
              />
            </div>
          </div>
        </div>

        <!-- Plan Selection -->
        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-default border-b border-default pb-2">
            Choose Your Plan
          </h3>

          <AuthPlanSelection v-model="formData.plan" />
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
                <span class="text-sm text-muted">
                  I agree to the
                  <UButton
                    variant="link"
                    class="p-0 text-sm h-auto"
                    to="/terms"
                    target="_blank"
                  >
                    Terms of Service
                  </UButton>
                  and
                  <UButton
                    variant="link"
                    class="p-0 text-sm h-auto"
                    to="/privacy"
                    target="_blank"
                  >
                    Privacy Policy
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
          class="mt-6"
        >
          <template #leading>
            <UIcon name="i-lucide-rocket" />
          </template>
          Create Account
        </UButton>

        <!-- Login Link -->
        <div class="text-center pt-4 border-t border-default">
          <p class="text-sm text-muted">
            Already have an account?
            <UButton
              variant="link"
              to="/auth/login"
              class="p-0 text-sm h-auto"
            >
              Sign in here
            </UButton>
          </p>
        </div>
      </UForm>
    </UPageCard>
  </UContainer>
</template>
