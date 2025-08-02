<script setup lang="ts">
// Meta tags
useHead({
  title: 'Terms of Service - StatusZen',
  meta: [
    { name: 'description', content: 'StatusZen Terms of Service and usage agreement.' }
  ]
})
</script>

<template>
  <UContainer class="py-8">
    <UPageCard>
      <template #header>
        <div class="space-y-2">
          <h1 class="text-3xl font-bold text-default">
            Terms of Service
          </h1>
          <p class="text-muted">
            Last updated: January 2025
          </p>
        </div>
      </template>

      <div class="prose prose-gray dark:prose-invert max-w-none">
        <p class="lead">
          Welcome to StatusZen. These terms and conditions outline the rules and regulations
          for the use of StatusZen's services.
        </p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using StatusZen, you accept and agree to be bound by the terms
          and provision of this agreement.
        </p>

        <h2>2. Use License</h2>
        <p>
          Permission is granted to temporarily use StatusZen for personal and commercial
          monitoring purposes. This is the grant of a license, not a transfer of title.
        </p>

        <h2>3. Service Description</h2>
        <p>
          StatusZen provides uptime monitoring and status page services. We monitor your
          specified endpoints and notify you of any downtime or issues.
        </p>

        <h2>4. User Accounts</h2>
        <p>
          When you create an account with us, you must provide information that is accurate,
          complete, and current at all times. You are responsible for safeguarding the
          password and all activities that occur under your account.
        </p>

        <h2>5. Privacy Policy</h2>
        <p>
          Your privacy is important to us. Please review our Privacy Policy, which also
          governs your use of the service, to understand our practices.
        </p>

        <h2>6. Service Availability</h2>
        <p>
          We strive to maintain high service availability but cannot guarantee 100% uptime.
          Planned maintenance will be communicated in advance when possible.
        </p>

        <h2>7. Limitation of Liability</h2>
        <p>
          StatusZen shall not be liable for any indirect, incidental, special, consequential,
          or punitive damages, including without limitation, loss of profits, data, use,
          goodwill, or other intangible losses.
        </p>

        <h2>8. Changes to Terms</h2>
        <p>
          We reserve the right to modify these terms at any time. We will provide notice
          of significant changes through our service or via email.
        </p>

        <h2>9. Contact Information</h2>
        <p>
          If you have any questions about these Terms of Service, please contact us at
          <a href="mailto:legal@statuszen.com">legal@statuszen.com</a>.
        </p>
      </div>

      <template #footer>
        <div class="flex justify-between items-center">
          <UButton
            variant="outline"
            to="/auth/signup"
            icon="i-lucide-arrow-left"
          >
            Back to Signup
          </UButton>
          <p class="text-sm text-muted">
            Effective Date: January 1, 2025
          </p>
        </div>
      </template>
    </UPageCard>
  </UContainer>
</template>
