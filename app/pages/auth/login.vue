<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const toast = useToast()

const sign = ref<'in' | 'up'>('in')

watchEffect(() => {
  if (user.value) {
    return navigateTo('/')
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
  <UContainer class="h-[calc(100vh-var(--ui-header-height))] flex items-center justify-center px-4">
    <UPageCard class="max-w-sm w-full">
      <UAuthForm
        :submit="{
          loadingAuto: true
        }"
        :title="sign === 'in' ? 'Login' : 'Sign up'"
        icon="i-lucide-user"
        :fields="fields"
        :providers="providers"
        @submit="onSubmit"
      >
        <template
          #description
        >
          {{ sign === 'up' ? 'Already have an account?' : 'Don\'t have an account?' }}
          <UButton
            v-if="sign === 'in'"
            variant="link"
            class="p-0"
            to="/auth/signup"
          >
            Create a new account
          </UButton>
          <UButton
            v-else
            variant="link"
            class="p-0"
            @click="sign = 'in'"
          >
            Sign in
          </UButton>.
        </template>
      </UAuthForm>
    </UPageCard>
  </UContainer>
</template>
