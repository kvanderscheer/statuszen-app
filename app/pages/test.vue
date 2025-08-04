<template>
  <div class="min-h-screen relative overflow-hidden">
    <!-- Background Image -->
    <div
      class="absolute inset-0 bg-cover bg-center bg-no-repeat"
      style="background-image: url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80')"
    />

    <!-- Overlay for better contrast -->
    <div class="absolute inset-0 bg-black/20" />

    <!-- Content -->
    <div class="relative z-10 p-6 min-h-screen flex flex-col">
      <!-- Main Trail Card -->
      <div class="flex-1 flex items-center justify-center">
        <div class="w-full max-w-md">
          <!-- Trail Header -->
          <div class="backdrop-blur-xl bg-white/10 rounded-2xl p-6 mb-4 border border-white/20 shadow-2xl">
            <div class="text-white/70 text-sm font-medium mb-1">
              Eagle Ridge Loop
            </div>
            <div class="text-white/50 text-xs">
              A moderate multi-day hike through...
            </div>

            <div class="mt-6">
              <h1 class="text-white text-2xl font-bold mb-6">
                Trail: Eagle Ridge Loop
              </h1>

              <!-- Stats -->
              <div class="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <div class="text-white/70 text-xs uppercase tracking-wide">
                    Elevation
                  </div>
                  <div class="text-white text-lg font-semibold">
                    1,000 ft
                  </div>
                </div>
                <div>
                  <div class="text-white/70 text-xs uppercase tracking-wide">
                    Distance
                  </div>
                  <div class="text-white text-lg font-semibold">
                    7.4 miles
                  </div>
                </div>
                <div>
                  <div class="text-white/70 text-xs uppercase tracking-wide">
                    Time
                  </div>
                  <div class="text-white text-lg font-semibold">
                    3hr 15 min
                  </div>
                </div>
              </div>

              <!-- Description -->
              <p class="text-white/80 text-sm leading-relaxed mb-6">
                Eagle Ridge Loop is a scenic 7.4 mile trail featuring
                sweeping ridge-top views, vibrant wildflowers in season, and
                moderate climbs suitable for intermediate hikers. The
                well-maintained path makes it perfect for both casual hikers and
                adventure seekers looking for stunning views.
              </p>

              <!-- Action Buttons -->
              <div class="flex gap-3">
                <button class="bg-blue-500/90 hover:bg-blue-600/90 text-white px-6 py-2.5 rounded-full font-medium transition-all backdrop-blur-sm">
                  Book a tour
                </button>
                <button class="bg-white/20 hover:bg-white/30 text-white px-6 py-2.5 rounded-full font-medium transition-all backdrop-blur-sm border border-white/30">
                  Preview trail
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Section -->
      <div class="flex justify-between items-end">
        <!-- Trail Level Chart -->
        <div class="backdrop-blur-xl bg-white/10 rounded-2xl p-4 border border-white/20 shadow-2xl">
          <div class="text-white/70 text-sm font-medium mb-4">
            Trail level
          </div>
          <div class="flex items-end gap-2 h-16">
            <div class="w-2 bg-white/30 rounded-full h-4" />
            <div class="w-2 bg-white/50 rounded-full h-6" />
            <div class="w-2 bg-white/70 rounded-full h-12" />
            <div class="w-2 bg-white/40 rounded-full h-8" />
            <div class="w-2 bg-white/60 rounded-full h-10" />
            <div class="w-2 bg-white/30 rounded-full h-5" />
          </div>
          <div class="text-white/50 text-xs mt-2">
            Estimated time
          </div>
          <div class="text-white/70 text-sm">
            3.5hr*
          </div>
        </div>

        <!-- User Profile Card -->
        <div class="backdrop-blur-xl bg-white/10 rounded-2xl p-4 border border-white/20 shadow-2xl">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 bg-orange-400 rounded-full flex items-center justify-center text-white font-semibold">
              {{ userInitials }}
            </div>
            <div>
              <div class="text-white font-medium">
                {{ displayName }}
              </div>
              <div class="text-white/60 text-xs">
                {{ userHandle }}
              </div>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-4 text-center">
            <div>
              <div class="text-white/70 text-xs">
                Miles
              </div>
              <div class="text-white font-semibold">
                {{ userStats.miles }}
              </div>
            </div>
            <div>
              <div class="text-white/70 text-xs">
                Elevation
              </div>
              <div class="text-white font-semibold">
                {{ userStats.elevation }}
              </div>
            </div>
            <div>
              <div class="text-white/70 text-xs">
                Followers
              </div>
              <div class="text-white font-semibold">
                {{ userStats.followers }}
              </div>
            </div>
          </div>

          <div class="text-white/50 text-xs mt-3">
            this month 🏃
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Test page for glass-morphism hiking app layout
definePageMeta({
  title: 'Trail Explorer Test',
  layout: 'empty'
})

// Get current user from Supabase
const user = useSupabaseUser()

// Compute user display information
const displayName = computed(() => {
  if (user.value) {
    return user.value.user_metadata?.full_name || user.value.email?.split('@')[0] || 'User'
  }
  return 'Guest User'
})

const userInitials = computed(() => {
  if (user.value) {
    const name = user.value.user_metadata?.full_name || user.value.email?.split('@')[0] || 'User'
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'
  }
  return 'GU'
})

const userHandle = computed(() => {
  if (user.value) {
    const email = user.value.email
    return email ? `@${email.split('@')[0]}` : '@user'
  }
  return '@guest'
})

// Mock user stats (in a real app, these would come from a database)
const userStats = computed(() => {
  if (user.value) {
    return {
      miles: '164.2',
      elevation: '2500 ft',
      followers: '512'
    }
  }
  return {
    miles: '0.0',
    elevation: '0 ft',
    followers: '0'
  }
})
</script>

<style scoped>
/* Additional glass-morphism effects */
.backdrop-blur-xl {
  backdrop-filter: blur(16px);
}
</style>
