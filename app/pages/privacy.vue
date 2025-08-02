<script setup lang="ts">
// Meta tags
useHead({
  title: 'Privacy Policy - StatusZen',
  meta: [
    { name: 'description', content: 'StatusZen Privacy Policy and data protection information.' }
  ]
})
</script>

<template>
  <UContainer class="py-8">
    <UPageCard>
      <template #header>
        <div class="space-y-2">
          <h1 class="text-3xl font-bold text-default">
            Privacy Policy
          </h1>
          <p class="text-muted">
            Last updated: January 2025
          </p>
        </div>
      </template>

      <div class="prose prose-gray dark:prose-invert max-w-none">
        <p class="lead">
          At StatusZen, we are committed to protecting your privacy and ensuring the security
          of your personal information.
        </p>

        <h2>1. Information We Collect</h2>
        <h3>Personal Information</h3>
        <ul>
          <li>Name and email address when you create an account</li>
          <li>Company information (optional)</li>
          <li>Payment information for paid plans</li>
          <li>Communication preferences</li>
        </ul>

        <h3>Service Data</h3>
        <ul>
          <li>URLs and endpoints you monitor</li>
          <li>Monitoring configurations and settings</li>
          <li>Uptime and performance data</li>
          <li>Notification logs and preferences</li>
        </ul>

        <h3>Technical Information</h3>
        <ul>
          <li>IP addresses and browser information</li>
          <li>Usage analytics and service interactions</li>
          <li>Error logs and performance metrics</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>Provide and maintain our monitoring services</li>
          <li>Send notifications about service status</li>
          <li>Improve our services and user experience</li>
          <li>Process payments and manage subscriptions</li>
          <li>Communicate important service updates</li>
          <li>Provide customer support</li>
        </ul>

        <h2>3. Information Sharing</h2>
        <p>
          We do not sell, trade, or rent your personal information to third parties.
          We may share information only in these circumstances:
        </p>
        <ul>
          <li>With your explicit consent</li>
          <li>To comply with legal obligations</li>
          <li>To protect our rights and safety</li>
          <li>With trusted service providers under strict confidentiality agreements</li>
        </ul>

        <h2>4. Data Security</h2>
        <p>
          We implement industry-standard security measures including:
        </p>
        <ul>
          <li>Encryption of data in transit and at rest</li>
          <li>Regular security audits and updates</li>
          <li>Access controls and authentication</li>
          <li>Secure data centers and infrastructure</li>
        </ul>

        <h2>5. Data Retention</h2>
        <p>
          We retain your information for as long as your account is active or as needed
          to provide services. You may request deletion of your account and data at any time.
        </p>

        <h2>6. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access your personal information</li>
          <li>Correct inaccurate data</li>
          <li>Delete your account and data</li>
          <li>Export your data</li>
          <li>Opt-out of non-essential communications</li>
        </ul>

        <h2>7. Cookies and Tracking</h2>
        <p>
          We use essential cookies for authentication and service functionality.
          We may use analytics cookies to improve our services, with your consent.
        </p>

        <h2>8. Children's Privacy</h2>
        <p>
          Our services are not intended for children under 13. We do not knowingly
          collect personal information from children under 13.
        </p>

        <h2>9. International Data Transfers</h2>
        <p>
          Your information may be transferred to and processed in countries other than
          your own, with appropriate safeguards in place.
        </p>

        <h2>10. Changes to This Policy</h2>
        <p>
          We may update this privacy policy from time to time. We will notify you of
          any material changes via email or through our service.
        </p>

        <h2>11. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us at:
        </p>
        <ul>
          <li>Email: <a href="mailto:privacy@statuszen.com">privacy@statuszen.com</a></li>
          <li>Address: StatusZen Privacy Officer</li>
        </ul>
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
