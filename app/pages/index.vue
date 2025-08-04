<script setup lang="ts">
import { defineComponent, h } from 'vue'

definePageMeta({
  layout: 'top-nav'
})

const primaryFeatures = [
  {
    name: 'Real-time incident reporting',
    description:
      'Automated incident detection and manual reporting with multi-channel communication including email, SMS, and push notifications.',
    href: '#',
    icon: 'i-lucide-zap'
  },
  {
    name: 'Customizable status pages',
    description:
      'Create branded status pages with uptime graphs, performance metrics, and real-time incident updates for public or private use.',
    href: '#',
    icon: 'i-lucide-users'
  },
  {
    name: 'Intelligent notifications',
    description:
      'Subscription-based alert system with customizable thresholds and multi-language support powered by AI translations.',
    href: '#',
    icon: 'i-lucide-calendar-days'
  }
]
const secondaryFeatures = [
  {
    name: 'Multi-language Support',
    description: 'AI-powered translations for global incident communication.',
    icon: 'i-lucide-globe'
  },
  {
    name: 'Advanced security',
    description: 'End-to-end encryption for all data in transit and at rest with 2FA support.',
    icon: 'i-lucide-lock'
  },
  {
    name: 'Integration capabilities',
    description: 'Support for popular tools and systems with API for custom integrations.',
    icon: 'i-lucide-arrow-right-left'
  },
  {
    name: 'Two-factor authentication',
    description: 'Secure account access with multi-factor authentication support.',
    icon: 'i-lucide-fingerprint'
  },
  {
    name: 'Powerful API',
    description: 'RESTful API endpoints for custom integrations and WebSocket support for real-time updates.',
    icon: 'i-lucide-settings'
  },
  {
    name: 'High availability',
    description: 'Load balancing and failover mechanisms with 99.99% uptime SLA.',
    icon: 'i-lucide-server'
  }
]
const stats = [
  { id: 1, name: 'Uptime guarantee', value: '99.99%' },
  { id: 2, name: 'Average response time', value: '<5 min' },
  { id: 3, name: 'Supported languages', value: '50+' },
  { id: 4, name: 'Integration options', value: '100+' }
]
</script>

<template>
  <div class="bg-gray-900">
    <ParticleSystem />
    <main class="relative z-10">
      <!-- Hero section -->
      <div class="relative isolate overflow-hidden">
        <svg
          class="absolute inset-0 -z-10 size-full mask-[radial-gradient(100%_100%_at_top_right,white,transparent)] stroke-white/10"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="983e3e4c-de6d-4c3f-8d64-b9761d1534cc"
              width="200"
              height="200"
              x="50%"
              y="-1"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M.5 200V.5H200"
                fill="none"
              />
            </pattern>
          </defs>
          <svg
            x="50%"
            y="-1"
            class="overflow-visible fill-gray-800/20"
          >
            <path
              d="M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z"
              stroke-width="0"
            />
          </svg>
          <rect
            width="100%"
            height="100%"
            stroke-width="0"
            fill="url(#983e3e4c-de6d-4c3f-8d64-b9761d1534cc)"
          />
        </svg>
        <div
          class="absolute top-10 left-[calc(50%-4rem)] -z-10 transform-gpu blur-3xl sm:left-[calc(50%-18rem)] lg:top-[calc(50%-30rem)] lg:left-48 xl:left-[calc(50%-24rem)]"
          aria-hidden="true"
        >
          <div
            class="aspect-1108/632 w-277 bg-gradient-to-r from-blue-400 to-blue-600 opacity-20"
            style="clip-path: polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)"
          />
        </div>
        <div class="mx-auto max-w-7xl px-6 pt-10 pb-24 sm:pb-32 lg:flex lg:px-8 lg:py-24">
          <div class="mx-auto max-w-2xl shrink-0 lg:mx-0 lg:pt-8">
            <div class="h-11 flex items-center">
              <h1 class="text-2xl font-bold text-blue-400">
                StatusZen
              </h1>
            </div>
            <div class="mt-24 sm:mt-32 lg:mt-16">
              <a
                href="#"
                class="inline-flex space-x-6"
              >
                <span class="rounded-full bg-blue-500/10 px-3 py-1 text-sm/6 font-semibold text-blue-400 ring-1 ring-blue-500/20 ring-inset">What's new</span>
                <span class="inline-flex items-center space-x-2 text-sm/6 font-medium text-gray-300">
                  <span>Just shipped v1.0</span>
                  <UIcon
                    name="i-lucide-chevron-right"
                    class="size-5 text-gray-500"
                  />
                </span>
              </a>
            </div>
            <h1 class="mt-10 text-5xl font-semibold tracking-tight text-pretty sm:text-7xl">
              <span class="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-300 bg-clip-text text-transparent">
                Incident communication made simple
              </span>
            </h1>
            <p class="mt-8 text-lg font-medium text-pretty text-gray-400 sm:text-xl/8">
              StatusZen streamlines incident reporting, enhances transparency, and maintains user trust with comprehensive status page management for modern businesses.
            </p>
            <div class="mt-10 flex items-center gap-x-6">
              <a
                href="/auth/signup"
                class="rounded-full bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >Get started</a>
              <a
                href="#features"
                class="text-sm/6 font-semibold text-white"
              >Learn more <span aria-hidden="true">→</span></a>
            </div>
          </div>
          <div class="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:mt-0 lg:mr-0 lg:ml-10 lg:max-w-none lg:flex-none xl:ml-32">
            <div class="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
              <img
                src="https://tailwindcss.com/plus-assets/img/component-images/dark-project-app-screenshot.png"
                alt="StatusZen dashboard screenshot"
                width="2432"
                height="1442"
                class="w-304 rounded-md bg-white/5 shadow-2xl ring-1 ring-white/10"
              >
            </div>
          </div>
        </div>
      </div>

      <!-- Logo cloud -->
      <div class="mx-auto mt-8 max-w-7xl px-6 sm:mt-16 lg:px-8">
        <h2 class="text-center text-lg/8 font-semibold text-white">
          Trusted by innovative companies worldwide
        </h2>
        <div class="mx-auto mt-10 grid max-w-lg grid-cols-4 items-center gap-x-8 gap-y-10 sm:max-w-xl sm:grid-cols-6 sm:gap-x-10 lg:mx-0 lg:max-w-none lg:grid-cols-5">
          <img
            class="col-span-2 max-h-12 w-full object-contain lg:col-span-1"
            src="https://tailwindcss.com/plus-assets/img/logos/158x48/transistor-logo-white.svg"
            alt="Transistor"
            width="158"
            height="48"
          >
          <img
            class="col-span-2 max-h-12 w-full object-contain lg:col-span-1"
            src="https://tailwindcss.com/plus-assets/img/logos/158x48/reform-logo-white.svg"
            alt="Reform"
            width="158"
            height="48"
          >
          <img
            class="col-span-2 max-h-12 w-full object-contain lg:col-span-1"
            src="https://tailwindcss.com/plus-assets/img/logos/158x48/tuple-logo-white.svg"
            alt="Tuple"
            width="158"
            height="48"
          >
          <img
            class="col-span-2 max-h-12 w-full object-contain sm:col-start-2 lg:col-span-1"
            src="https://tailwindcss.com/plus-assets/img/logos/158x48/savvycal-logo-white.svg"
            alt="SavvyCal"
            width="158"
            height="48"
          >
          <img
            class="col-span-2 col-start-2 max-h-12 w-full object-contain sm:col-start-auto lg:col-span-1"
            src="https://tailwindcss.com/plus-assets/img/logos/158x48/statamic-logo-white.svg"
            alt="Statamic"
            width="158"
            height="48"
          >
        </div>
      </div>

      <!-- Feature section -->
      <div
        id="features"
        class="mx-auto mt-32 max-w-7xl px-6 sm:mt-56 lg:px-8"
      >
        <div class="mx-auto max-w-2xl lg:text-center">
          <h2 class="text-base/7 font-semibold text-blue-400">
            Everything you need
          </h2>
          <p class="mt-2 text-4xl font-semibold tracking-tight text-pretty text-white sm:text-5xl lg:text-balance">
            Complete incident management platform
          </p>
          <p class="mt-6 text-lg/8 text-gray-300">
            StatusZen provides all the tools you need to manage incidents, communicate with users, and maintain transparency during critical moments.
          </p>
        </div>
        <div class="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl class="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            <div
              v-for="feature in primaryFeatures"
              :key="feature.name"
              class="flex flex-col"
            >
              <dt class="text-base/7 font-semibold text-white">
                <div class="mb-6 flex size-10 items-center justify-center rounded-lg bg-blue-600">
                  <UIcon
                    :name="feature.icon"
                    class="size-6 text-white"
                  />
                </div>
                {{ feature.name }}
              </dt>
              <dd class="mt-1 flex flex-auto flex-col text-base/7 text-gray-300">
                <p class="flex-auto">
                  {{ feature.description }}
                </p>
                <p class="mt-6">
                  <a
                    :href="feature.href"
                    class="text-sm/6 font-semibold text-blue-400"
                  >Learn more <span aria-hidden="true">→</span></a>
                </p>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <!-- Feature section -->
      <div class="mt-32 sm:mt-56">
        <div class="mx-auto max-w-7xl px-6 lg:px-8">
          <div class="mx-auto max-w-2xl sm:text-center">
            <h2 class="text-base/7 font-semibold text-blue-400">
              Advanced capabilities
            </h2>
            <p class="mt-2 text-4xl font-semibold tracking-tight text-pretty text-white sm:text-5xl sm:text-balance">
              Built for modern businesses
            </p>
            <p class="mt-6 text-lg/8 text-gray-300">
              From real-time monitoring to comprehensive reporting, StatusZen delivers enterprise-grade incident management solutions.
            </p>
          </div>
        </div>
        <div class="relative overflow-hidden pt-16">
          <div class="mx-auto max-w-7xl px-6 lg:px-8">
            <img
              src="https://tailwindcss.com/plus-assets/img/component-images/dark-project-app-screenshot.png"
              alt="StatusZen platform screenshot"
              class="mb-[-12%] rounded-xl shadow-2xl ring-1 ring-white/10"
              width="2432"
              height="1442"
            >
            <div
              class="relative"
              aria-hidden="true"
            >
              <div class="absolute -inset-x-20 bottom-0 bg-gradient-to-t from-gray-900 pt-[7%]" />
            </div>
          </div>
        </div>
        <div class="mx-auto mt-16 max-w-7xl px-6 sm:mt-20 md:mt-24 lg:px-8">
          <dl class="mx-auto grid max-w-2xl grid-cols-1 gap-x-6 gap-y-10 text-base/7 text-gray-300 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-x-8 lg:gap-y-16">
            <div
              v-for="feature in secondaryFeatures"
              :key="feature.name"
              class="relative pl-9"
            >
              <dt class="inline font-semibold text-white">
                <UIcon
                  :name="feature.icon"
                  class="absolute top-1 left-1 size-5 text-blue-500"
                />
                {{ feature.name }}
              </dt>
              {{ ' ' }}
              <dd class="inline">
                {{ feature.description }}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <!-- Stats -->
      <div class="mx-auto mt-32 max-w-7xl px-6 sm:mt-56 lg:px-8">
        <div class="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl">
          <h2 class="text-base/8 font-semibold text-blue-400">
            Proven performance
          </h2>
          <p class="mt-2 text-4xl font-semibold tracking-tight text-pretty text-white sm:text-5xl">
            Trusted by businesses worldwide
          </p>
          <p class="mt-6 text-lg/8 text-gray-300">
            StatusZen delivers reliable incident management with industry-leading performance and global reach.
          </p>
        </div>
        <dl class="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-10 text-white sm:mt-20 sm:grid-cols-2 sm:gap-y-16 lg:mx-0 lg:max-w-none lg:grid-cols-4">
          <div
            v-for="stat in stats"
            :key="stat.id"
            class="flex flex-col gap-y-3 border-l border-white/10 pl-6"
          >
            <dt class="text-sm/6">
              {{ stat.name }}
            </dt>
            <dd class="order-first text-3xl font-semibold tracking-tight">
              {{ stat.value }}
            </dd>
          </div>
        </dl>
      </div>

      <!-- CTA section -->
      <div class="relative isolate mt-32 px-6 py-32 sm:mt-56 sm:py-40 lg:px-8">
        <svg
          class="absolute inset-0 -z-10 size-full mask-[radial-gradient(100%_100%_at_top_right,white,transparent)] stroke-white/10"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="1d4240dd-898f-445f-932d-e2872fd12de3"
              width="200"
              height="200"
              x="50%"
              y="0"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M.5 200V.5H200"
                fill="none"
              />
            </pattern>
          </defs>
          <svg
            x="50%"
            y="0"
            class="overflow-visible fill-gray-800/20"
          >
            <path
              d="M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z"
              stroke-width="0"
            />
          </svg>
          <rect
            width="100%"
            height="100%"
            stroke-width="0"
            fill="url(#1d4240dd-898f-445f-932d-e2872fd12de3)"
          />
        </svg>
        <div
          class="absolute inset-x-0 top-10 -z-10 flex transform-gpu justify-center overflow-hidden blur-3xl"
          aria-hidden="true"
        >
          <div
            class="aspect-1108/632 w-277 flex-none bg-gradient-to-r from-blue-400 to-blue-600 opacity-20"
            style="clip-path: polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)"
          />
        </div>
        <div class="mx-auto max-w-2xl text-center">
          <h2 class="text-4xl font-semibold tracking-tight text-balance text-white sm:text-5xl">
            Ready to enhance your incident communication?
          </h2>
          <p class="mx-auto mt-6 max-w-xl text-lg/8 text-gray-300">
            Start with StatusZen today and build trust with transparent, real-time status updates. Free tier available.
          </p>
          <div class="mt-10 flex items-center justify-center gap-x-6">
            <a
              href="/auth/signup"
              class="rounded-full bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-xs hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >Start free trial</a>
            <a
              href="#features"
              class="text-sm/6 font-semibold text-white"
            >Learn more <span aria-hidden="true">→</span></a>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
