<script setup lang="ts">
// Debug page to check Supabase configuration
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const debugInfo = ref({
  supabaseUrl: '',
  supabaseKey: '',
  userExists: false,
  authConfig: null as unknown as {
    hasSession?: boolean
    sessionUser?: string
    supabaseConnected?: boolean
    error?: string
  } | null
})

onMounted(async () => {
  // Check Supabase configuration through runtime config
  const config = useRuntimeConfig()

  // Access Supabase URL and check if key exists
  debugInfo.value.supabaseUrl = config.public.supabase?.url || 'Not configured'
  debugInfo.value.supabaseKey = config.public.supabase?.key ? 'Key configured ✓' : 'Key not found ✗'
  debugInfo.value.userExists = !!user.value

  // Get auth configuration
  try {
    const { data } = await supabase.auth.getSession()
    debugInfo.value.authConfig = {
      hasSession: !!data.session,
      sessionUser: data.session?.user?.email || 'No user',
      supabaseConnected: true
    }
  } catch (error) {
    debugInfo.value.authConfig = {
      error: (error as Error).message,
      supabaseConnected: false
    }
  }
})

// Test connection
const testConnection = async () => {
  try {
    const { data, error } = await supabase.auth.getSession()
    console.log('Supabase connection test:', { data, error })

    if (error) {
      throw error
    }

    alert('✅ Supabase connection successful!')
  } catch (error) {
    console.error('❌ Supabase connection failed:', error)
    alert('❌ Supabase connection failed: ' + (error as Error).message)
  }
}

// Test signup with debug email
const testSignup = async () => {
  const testEmail = 'test@example.com'
  const testPassword = 'TestPassword123!'

  try {
    console.log('🧪 Testing signup with:', testEmail)

    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    })

    console.log('🧪 Test signup result:', { data, error })

    if (error) {
      alert('❌ Test signup failed: ' + error.message)
    } else {
      alert('✅ Test signup successful! Check console for details.')
    }
  } catch (error) {
    console.error('❌ Test signup error:', error)
    alert('❌ Test signup error: ' + (error as Error).message)
  }
}

// Test email sending
const testEmail = ref('')

const sendTestEmail = async () => {
  if (!testEmail.value || !testEmail.value.includes('@')) {
    alert('Please enter a valid email address')
    return
  }

  try {
    console.log('📧 Testing email send to:', testEmail.value)

    // Use Supabase auth to send a test email by attempting signup with a dummy password
    // This will trigger the email verification flow
    const { data, error } = await supabase.auth.signUp({
      email: testEmail.value,
      password: 'TestPassword123!', // Dummy password for test
      options: {
        data: {
          full_name: 'Test User',
          test_email: true
        }
      }
    })

    console.log('📧 Test email result:', { data, error })

    if (error) {
      alert('❌ Test email failed: ' + error.message)
    } else {
      alert('✅ Test email sent successfully! Check the inbox for: ' + testEmail.value)
      console.log('✅ Test email sent to:', testEmail.value)
    }
  } catch (error) {
    console.error('❌ Test email error:', error)
    alert('❌ Test email error: ' + (error as Error).message)
  }
}

// Reset auth password - sends password reset email
const sendPasswordResetTest = async () => {
  if (!testEmail.value || !testEmail.value.includes('@')) {
    alert('Please enter a valid email address')
    return
  }

  try {
    console.log('🔄 Testing password reset email to:', testEmail.value)

    const { error } = await supabase.auth.resetPasswordForEmail(testEmail.value, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })

    console.log('🔄 Password reset result:', { error })

    if (error) {
      alert('❌ Password reset email failed: ' + error.message)
    } else {
      alert('✅ Password reset email sent! Check the inbox for: ' + testEmail.value)
    }
  } catch (error) {
    console.error('❌ Password reset error:', error)
    alert('❌ Password reset error: ' + (error as Error).message)
  }
}

// Meta
useHead({
  title: 'Supabase Debug - StatusZen'
})
</script>

<template>
  <UContainer class="py-8">
    <UPageCard>
      <template #header>
        <h1 class="text-2xl font-bold">
          Supabase Debug Information
        </h1>
        <p class="text-muted">
          Debug Supabase configuration and connection
        </p>
      </template>

      <div class="space-y-6">
        <!-- Environment Info -->
        <div>
          <h2 class="text-lg font-semibold mb-3">
            Environment Variables
          </h2>
          <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
            <p><strong>Supabase URL:</strong> {{ debugInfo.supabaseUrl }}</p>
            <p><strong>Supabase Key:</strong> {{ debugInfo.supabaseKey }}</p>
            <p><strong>Current User:</strong> {{ user?.email || 'Not logged in' }}</p>
          </div>
        </div>

        <!-- Auth Config -->
        <div>
          <h2 class="text-lg font-semibold mb-3">
            Auth Configuration
          </h2>
          <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <pre>{{ JSON.stringify(debugInfo.authConfig, null, 2) }}</pre>
          </div>
        </div>

        <!-- Test Buttons -->
        <div class="space-y-3">
          <h2 class="text-lg font-semibold">
            Connection Tests
          </h2>

          <div class="flex gap-3">
            <UButton
              color="primary"
              @click="testConnection"
            >
              Test Connection
            </UButton>

            <UButton
              color="secondary"
              variant="outline"
              @click="testSignup"
            >
              Test Signup (test@example.com)
            </UButton>
          </div>
        </div>

        <!-- Email Testing -->
        <div class="space-y-4">
          <h2 class="text-lg font-semibold">
            Email Testing
          </h2>
          <p class="text-sm text-muted">
            Test if your SMTP configuration is working by sending emails to any address.
          </p>

          <div class="space-y-3">
            <UFormField
              label="Test Email Address"
              name="testEmail"
            >
              <UInput
                v-model="testEmail"
                type="email"
                placeholder="Enter email address to test"
                icon="i-lucide-mail"
                size="lg"
                block
              />
            </UFormField>

            <div class="flex gap-3 flex-wrap">
              <UButton
                color="success"
                variant="outline"
                icon="i-lucide-mail-plus"
                :disabled="!testEmail"
                @click="sendTestEmail"
              >
                Send Signup Email
              </UButton>

              <UButton
                color="primary"
                variant="outline"
                icon="i-lucide-key-round"
                :disabled="!testEmail"
                @click="sendPasswordResetTest"
              >
                Send Password Reset Email
              </UButton>
            </div>

            <div class="text-xs text-muted bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <p><strong>Signup Email:</strong> Creates a test account and sends verification email</p>
              <p><strong>Password Reset:</strong> Sends password reset email (works even if account doesn't exist)</p>
            </div>
          </div>
        </div>

        <!-- Configuration Status -->
        <div>
          <h2 class="text-lg font-semibold mb-3">
            Configuration Status
          </h2>
          <div class="space-y-3">
            <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span class="text-sm font-medium">Supabase URL</span>
              <span
                class="text-sm"
                :class="debugInfo.supabaseUrl.includes('supabase.co') ? 'text-green-600' : 'text-red-600'"
              >
                {{ debugInfo.supabaseUrl.includes('supabase.co') ? '✓ Configured' : '✗ Not configured' }}
              </span>
            </div>

            <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span class="text-sm font-medium">Supabase Key</span>
              <span
                class="text-sm"
                :class="debugInfo.supabaseKey.includes('✓') ? 'text-green-600' : 'text-red-600'"
              >
                {{ debugInfo.supabaseKey }}
              </span>
            </div>

            <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span class="text-sm font-medium">Auth Connection</span>
              <span
                class="text-sm"
                :class="debugInfo.authConfig?.supabaseConnected ? 'text-green-600' : 'text-red-600'"
              >
                {{ debugInfo.authConfig?.supabaseConnected ? '✓ Connected' : '✗ Connection failed' }}
              </span>
            </div>
          </div>

          <div class="mt-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p class="text-sm mb-2">
              <strong>Environment Variables Required:</strong>
            </p>
            <ul class="list-disc list-inside space-y-1 text-sm">
              <li><code>SUPABASE_URL</code> - Your Supabase project URL</li>
              <li><code>SUPABASE_KEY</code> - Your Supabase anon/public key</li>
            </ul>
            <p class="text-sm mt-3 text-muted">
              Check your <code>.env</code> file in the project root.
            </p>
          </div>
        </div>

        <!-- Supabase Project Settings -->
        <div>
          <h2 class="text-lg font-semibold mb-3">
            Supabase Project Settings to Check
          </h2>
          <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p class="text-sm mb-2">
              In your Supabase dashboard, verify:
            </p>
            <ul class="list-disc list-inside space-y-1 text-sm">
              <li><strong>Authentication > Settings:</strong> Enable email confirmations</li>
              <li><strong>Authentication > URL Configuration:</strong> Set site URL to <code>http://localhost:3000</code></li>
              <li><strong>Authentication > Email Templates:</strong> Check confirmation email template</li>
              <li><strong>Authentication > Providers:</strong> Enable email provider</li>
            </ul>
          </div>
        </div>
      </div>
    </UPageCard>
  </UContainer>
</template>
