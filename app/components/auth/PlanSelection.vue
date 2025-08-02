<script setup lang="ts">
import type { Plan } from '~/types/auth'

interface Props {
  modelValue: 'free' | 'pro' | 'enterprise'
}

interface Emits {
  (e: 'update:modelValue', value: 'free' | 'pro' | 'enterprise'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for getting started',
    price: 0,
    features: [
      'Monitor up to 5 services',
      'Basic status page',
      'Email notifications',
      'Community support'
    ],
    popular: true,
    available: true
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For growing teams',
    price: 29,
    features: [
      'Monitor unlimited services',
      'Custom status page',
      'Multiple notification channels',
      'Advanced analytics',
      'Priority support'
    ],
    popular: false,
    available: false
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations',
    price: 99,
    features: [
      'Everything in Pro',
      'White-label solution',
      'Advanced integrations',
      'Custom SLA monitoring',
      'Dedicated support'
    ],
    popular: false,
    available: false
  }
]

const selectedPlan = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})
</script>

<template>
  <div class="space-y-4">
    <div class="text-center">
      <h3 class="text-lg font-semibold text-primary">
        Choose Your Plan
      </h3>
      <p class="text-sm text-muted mt-1">
        Start with our free plan and upgrade anytime
      </p>
    </div>

    <div class="grid gap-4">
      <div
        v-for="plan in plans"
        :key="plan.id"
        class="relative border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md"
        :class="{
          'border-primary bg-primary/5 ring-2 ring-primary/20': selectedPlan === plan.id && plan.available,
          'border-default': selectedPlan !== plan.id || !plan.available,
          'opacity-50 cursor-not-allowed': !plan.available
        }"
        @click="plan.available && (selectedPlan = plan.id)"
      >
        <!-- Popular badge -->
        <div
          v-if="plan.popular"
          class="absolute -top-2 left-4 bg-primary text-white text-xs px-2 py-1 rounded-full font-medium"
        >
          Most Popular
        </div>

        <!-- Coming Soon badge -->
        <div
          v-if="!plan.available"
          class="absolute -top-2 right-4 bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-medium"
        >
          Coming Soon
        </div>

        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-3">
              <div
                class="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all"
                :class="{
                  'border-primary bg-primary': selectedPlan === plan.id && plan.available,
                  'border-gray-300': selectedPlan !== plan.id || !plan.available
                }"
              >
                <div
                  v-if="selectedPlan === plan.id && plan.available"
                  class="w-2 h-2 rounded-full bg-white"
                />
              </div>
              <div>
                <h4 class="font-semibold text-default">
                  {{ plan.name }}
                </h4>
                <p class="text-sm text-muted">
                  {{ plan.description }}
                </p>
              </div>
            </div>

            <div class="mt-2 ml-6">
              <div class="flex items-baseline gap-1">
                <span class="text-2xl font-bold text-default">
                  {{ plan.price === 0 ? 'Free' : `$${plan.price}` }}
                </span>
                <span
                  v-if="plan.price > 0"
                  class="text-sm text-muted"
                >/month</span>
              </div>

              <ul class="mt-3 space-y-1">
                <li
                  v-for="feature in plan.features"
                  :key="feature"
                  class="flex items-center gap-2 text-sm text-muted"
                >
                  <UIcon
                    name="i-lucide-check"
                    class="w-4 h-4 text-green-500 shrink-0"
                  />
                  {{ feature }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="text-center">
      <p class="text-xs text-muted">
        You can upgrade or downgrade your plan anytime from your account settings.
      </p>
    </div>
  </div>
</template>
