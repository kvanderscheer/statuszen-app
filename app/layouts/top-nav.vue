<script setup lang="ts">
const user = useSupabaseUser()

useSeoMeta({
  title: 'StatusZen - Monitor your services',
  description: 'Monitor your services with confidence',
  ogTitle: 'StatusZen - Monitor your services',
  ogDescription: 'Monitor your services with confidence',
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
  <div class="min-h-screen bg-gray-900 scroll-smooth">
    <!-- Navigation Header -->
    <header class="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Logo -->
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

          <!-- CTA Buttons -->
          <div class="flex items-center gap-3">
            <UButton
              v-if="!user"
              to="/auth/login"
              variant="ghost"
              color="neutral"
              class="hidden sm:inline-flex"
              external
            >
              Sign In
            </UButton>
            <UButton
              v-if="!user"
              to="/auth/signup"
              icon="i-lucide-arrow-right"
              trailing
            >
              Sign up for free
            </UButton>
            <UButton
              v-if="user"
              to="/dashboard"
              variant="outline"
              class="hidden sm:inline-flex"
            >
              Dashboard
            </UButton>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main>
      <slot />
    </main>

    <!-- Footer -->
    <footer class="bg-gray-900 border-t border-gray-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
          <!-- Logo and Description -->
          <div class="col-span-1 md:col-span-2">
<!--             <LandingLogo
              size="md"
              class="mb-4"
            />
 -->            <p class="text-gray-400 mb-4">
              Monitor your services with confidence.
            </p>
            <div class="flex items-center gap-4">
              <a
                href="#"
                class="text-gray-400 hover:text-primary-400 transition-colors"
              >
                <UIcon
                  name="i-lucide-github"
                  class="w-5 h-5"
                />
              </a>
              <a
                href="#"
                class="text-gray-400 hover:text-primary-400 transition-colors"
              >
                <UIcon
                  name="i-lucide-twitter"
                  class="w-5 h-5"
                />
              </a>
              <a
                href="#"
                class="text-gray-400 hover:text-primary-400 transition-colors"
              >
                <UIcon
                  name="i-lucide-linkedin"
                  class="w-5 h-5"
                />
              </a>
            </div>
          </div>

          <!-- Product Links -->
          <div>
            <h3 class="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
              Product
            </h3>
            <ul class="space-y-2">
              <li>
                <a
                  href="#features"
                  class="text-gray-400 hover:text-primary-400 transition-colors cursor-pointer"
                  @click="(e) => handleNavClick(e, 'features')"
                >Features</a>
              </li>
              <li>
                <a
                  href="#pricing"
                  class="text-gray-400 hover:text-primary-400 transition-colors cursor-pointer"
                  @click="(e) => handleNavClick(e, 'pricing')"
                >Pricing</a>
              </li>
              <li>
                <a
                  href="#"
                  class="text-gray-400 hover:text-primary-400 transition-colors"
                >API</a>
              </li>
              <li>
                <a
                  href="#"
                  class="text-gray-400 hover:text-primary-400 transition-colors"
                >Integrations</a>
              </li>
            </ul>
          </div>

          <!-- Company Links -->
          <div>
            <h3 class="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
              Company
            </h3>
            <ul class="space-y-2">
              <li>
                <a
                  href="#"
                  class="text-gray-400 hover:text-primary-400 transition-colors"
                >About</a>
              </li>
              <li>
                <a
                  href="#"
                  class="text-gray-400 hover:text-primary-400 transition-colors"
                >Contact</a>
              </li>
              <li>
                <a
                  href="/privacy"
                  class="text-gray-400 hover:text-primary-400 transition-colors"
                >Privacy</a>
              </li>
              <li>
                <a
                  href="/terms"
                  class="text-gray-400 hover:text-primary-400 transition-colors"
                >Terms</a>
              </li>
            </ul>
          </div>
        </div>

        <!-- Bottom Footer -->
        <div class="mt-8 pt-8 border-t border-gray-700">
          <div class="flex flex-col md:flex-row justify-between items-center">
            <p class="text-gray-400 text-sm">
              © {{ currentYear }} StatusZen. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>
