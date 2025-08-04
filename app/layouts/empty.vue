<script setup lang="ts">
useSeoMeta({
  title: 'ClockTower - Professional Time Tracking',
  description: 'Track time like a pro with ClockTower. Professional time tracking, project management, and detailed reporting for teams and freelancers.',
  ogTitle: 'ClockTower - Professional Time Tracking',
  ogDescription: 'Track time like a pro with ClockTower. Professional time tracking, project management, and detailed reporting for teams and freelancers.',
  ogImage: '/og-image.png',
  twitterCard: 'summary_large_image'
})

const currentYear = computed(() => new Date().getFullYear())

// Enhanced smooth scrolling function
const smoothScrollTo = (elementId: string) => {
  const element = document.getElementById(elementId)
  if (element) {
    const headerHeight = 64 // Height of sticky header (h-16 = 64px)
    const elementPosition = element.offsetTop - headerHeight

    window.scrollTo({
      top: elementPosition,
      behavior: 'smooth'
    })
  }
}

// Handle navigation clicks
const handleNavClick = (event: Event, targetId: string) => {
  event.preventDefault()
  smoothScrollTo(targetId)
}
</script>

<template>
  <div class="min-h-screen scroll-smooth relative">
    <!-- Main Content -->
    <main class="relative z-10 bg-gray-900/80 backdrop-blur-sm">
      <slot />
    </main>
  </div>
</template>
