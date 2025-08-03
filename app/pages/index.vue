<script setup lang="ts">
  definePageMeta({
    layout: 'top-nav'
  })
</script>

<template>
  <div class="relative min-h-screen">
    <ParticleSystem />
    <div class="relative z-10">
    <UPageHero
      title="StatusZen"
      description="Comprehensive incident communication and status page management platform designed to streamline incident reporting, enhance transparency, and maintain user trust for businesses."
      :links="[{
        label: 'Get started',
        to: '/auth/signup',
        trailingIcon: 'i-lucide-arrow-right',
        size: 'xl'
      }, {
        label: 'View demo',
        to: '#features',
        icon: 'i-lucide-play-circle',
        size: 'xl',
        color: 'neutral',
        variant: 'subtle'
      }]"
    />

    <UPageSection
      id="features"
      title="Everything you need for incident management"
      description="StatusZen provides comprehensive incident communication and status page management tools to maintain transparency and user trust during critical moments."
      :features="[{
        icon: 'i-lucide-alert-triangle',
        title: 'Real-time incident reporting',
        description: 'Automated incident detection and manual reporting with multi-channel communication including email, SMS, and push notifications.'
      }, {
        icon: 'i-lucide-monitor',
        title: 'Customizable status pages',
        description: 'Create branded status pages with uptime graphs, performance metrics, and real-time incident updates for public or private use.'
      }, {
        icon: 'i-lucide-bell',
        title: 'Intelligent notifications',
        description: 'Subscription-based alert system with customizable thresholds and multi-language support powered by AI translations.'
      }]"
    />

    <UPageSection>
      <UPageCTA
        title="Ready to enhance your incident communication?"
        description="Start with StatusZen today and build trust with transparent, real-time status updates. Free tier available."
        variant="subtle"
        :links="[{
          label: 'Start free trial',
          to: '/auth/signup',
          icon: 'i-lucide-rocket',
          color: 'primary'
        }, {
          label: 'Learn more',
          to: '#features',
          trailingIcon: 'i-lucide-arrow-down',
          color: 'neutral',
          variant: 'subtle'
        }]"
      />
    </UPageSection>
    </div>
  </div>
</template>
