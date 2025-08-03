<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const toast = useToast()

const sign = ref<'in' | 'up'>('in')

definePageMeta({
  layout: 'empty'
})

watchEffect(() => {
  if (user.value) {
    return navigateTo('/dashboard')
  }
})

const fields = [{
  name: 'email',
  type: 'text' as const,
  label: 'Email',
  placeholder: 'Enter your email',
  required: true
}, {
  name: 'password',
  label: 'Password',
  type: 'password' as const,
  placeholder: 'Enter your password'
}]

const providers = [{
  label: 'GitHub',
  icon: 'i-simple-icons-github',
  onClick: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: 'https://supabase-demo-gamma.vercel.app/confirm'
      }
    })
    if (error) displayError(error)
  }
}]

const signIn = async (email: string, password: string) => {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  if (error) displayError(error)
}

const signUp = async (email: string, password: string) => {
  const { error } = await supabase.auth.signUp({
    email,
    password
  })
  if (error) displayError(error)
  else {
    toast.add({
      title: 'Sign up successful',
      icon: 'i-lucide-check-circle',
      color: 'success'
    })
    await signIn(email, password)
  }
}

async function onSubmit(payload: { data: { email: string, password: string } }) {
  const email = payload.data.email
  const password = payload.data.password

  if (sign.value === 'in') await signIn(email, password)
  else await signUp(email, password)
}

const displayError = (error: { message: string }) => {
  toast.add({
    title: 'Error',
    description: error.message,
    icon: 'i-lucide-alert-circle',
    color: 'error'
  })
}
</script>

<template>
  <div class="dark min-h-screen bg-gray-900 flex items-center justify-center px-4">
    <UPageCard class="max-w-sm w-full bg-gray-800 border-gray-700">
      <UAuthForm
        :submit="{
          loadingAuto: true
        }"
        :title="sign === 'in' ? 'Login' : 'Sign up'"
        icon="i-lucide-user"
        :fields="fields"
        :providers="providers"
        :ui="{
          base: 'space-y-4',
          form: 'space-y-4',
          title: 'text-white text-xl font-semibold',
          description: 'text-gray-400 text-sm',
          field: {
            wrapper: 'space-y-2',
            label: 'text-gray-300 text-sm font-medium',
            input: {
              base: 'w-full bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500',
              rounded: 'rounded-md',
              padding: 'px-3 py-2'
            }
          },
          button: {
            base: 'w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors',
            loading: 'opacity-75 cursor-not-allowed'
          },
          divider: {
            base: 'flex items-center my-4',
            line: 'flex-1 border-t border-gray-600',
            label: 'px-3 text-gray-400 text-sm'
          },
          provider: {
            base: 'w-full bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2'
          }
        }"
        @submit="onSubmit"
      >
        <template
          #description
        >
          {{ sign === 'up' ? 'Already have an account?' : 'Don\'t have an account?' }}
          <UButton
            v-if="sign === 'in'"
            variant="link"
            class="p-0 text-blue-400 hover:text-blue-300"
            to="/auth/signup"
          >
            Create a new account
          </UButton>
          <UButton
            v-else
            variant="link"
            class="p-0 text-blue-400 hover:text-blue-300"
            @click="sign = 'in'"
          >
            Sign in
          </UButton>.
        </template>
      </UAuthForm>
    </UPageCard>
  </div>
</template>
