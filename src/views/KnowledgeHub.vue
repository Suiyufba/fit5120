<script setup>
import { ref } from 'vue'
import SiteFooter from '../components/SiteFooter.vue'

const activeFilter = ref('all')
const filters = ['All Topics', 'Getting Started', 'Hazard Safety', 'Weather Essentials']
</script>

<template>
  <main class="max-w-7xl mx-auto px-6 py-12 md:py-20">
    <!-- Hero Section -->
    <section class="mb-20">
      <div class="relative rounded-xl overflow-hidden min-h-[400px] flex items-end p-8 md:p-16 bg-primary-container">
        <img
          class="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60"
          alt="Victorian alpine peaks with eucalyptus forests in morning mist"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBuxkeFnlv6SSiV3GcYXbmb1mYwDgZ9UXC_oTXTldAHQqzIJBiWaj6ud24rZyHPmJrPC0k6rkqNq3d853LroF6LFdHjhdaBGvIDSosu2F-mnlQF0hx5IoJcx1RuKA35nPDj5zD956Q6ekGT2TdJ1PiWaVHrWlZGYsfp-WuGMRHwenlH1WamXKF16JdEZ1KJAwhtkm68gkK4HKQkacFYxhs7Jby854QlLi9VLf0Qbb7yjI9mmuupRCQ_4sr56lgXvqGaa9lTsIcqO34"
        />
        <div class="relative z-10 max-w-2xl">
          <span class="uppercase tracking-[0.2em] text-primary-fixed font-bold mb-4 block text-sm">Safety First</span>
          <h1 class="font-headline text-5xl md:text-7xl font-extrabold text-on-primary leading-none tracking-tighter mb-6">
            Master the <br /><span class="text-tertiary-fixed">Victorian Wilds</span>
          </h1>
          <p class="text-on-primary-container text-lg md:text-xl font-medium max-w-lg">
            Expert guidance for every trail, every weather condition, and every hiker level. Your journey starts with knowledge.
          </p>
        </div>
      </div>
    </section>

    <!-- Category Filters -->
    <section class="mb-12 flex flex-wrap gap-4 items-center">
      <button
        v-for="(filter, idx) in filters"
        :key="filter"
        class="px-6 py-3 rounded-full font-semibold transition-all"
        :class="activeFilter === (idx === 0 ? 'all' : filter.toLowerCase())
          ? 'bg-primary-container text-on-primary font-bold shadow-lg hover:shadow-xl'
          : 'bg-surface-container-high text-primary hover:bg-surface-container-highest'"
        @click="activeFilter = idx === 0 ? 'all' : filter.toLowerCase()"
      >
        {{ filter }}
      </button>
    </section>

    <!-- Bento Grid -->
    <section class="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
      <!-- Featured: Bushfire Safety -->
      <div class="md:col-span-8 group cursor-pointer">
        <div class="bg-surface-container-low rounded-xl overflow-hidden h-full flex flex-col md:flex-row shadow-sm hover:shadow-md transition-all duration-300">
          <div class="md:w-1/2 relative h-64 md:h-auto overflow-hidden">
            <img
              class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              alt="Dry eucalyptus leaves and bark on sun-drenched forest floor"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCpVrtzvpJvqRD3NmSGFHGRurwOfxtPZhZGx1Bbe1U412iHh46CIeKOBZC9V02QOtnMORSNzFF_hU5u-9Gki5m5lGYVh1_6FIxcQCqKsCJF4SxzXq97jG6AMA982YmzT6FBbHHS0MIjui-3IN8KDox-FrN7JqYNb7XXGw0Xvkn2A9xPysw40XXr-YrWqadj5lI9otlsqJ9SOByxC1lpsaGjOTI3B_IH7Nh2VtZqXhMcDK_fq3lw5DQ_6C7ItwF3b4fc5UUG_2Nelpc"
            />
            <div class="absolute top-4 left-4 flex items-center gap-2 bg-error text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <span class="w-2 h-2 rounded-full bg-white animate-pulse"></span> Critical
            </div>
          </div>
          <div class="md:w-1/2 p-8 flex flex-col justify-center">
            <div class="bg-error-container text-on-error-container w-12 h-12 rounded-xl flex items-center justify-center mb-6">
              <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1">local_fire_department</span>
            </div>
            <h3 class="font-headline text-3xl font-bold text-on-surface mb-4 leading-tight">Bushfire Safety: The 3 things to know</h3>
            <p class="text-on-surface-variant mb-6">Learn how to spot danger early, understand Victorian fire ratings, and execute a plan if conditions shift.</p>
            <div class="mt-auto flex items-center gap-2 text-primary font-bold">
              Read Guide <span class="material-symbols-outlined">arrow_forward</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Hiking in Heat -->
      <div class="md:col-span-4 group cursor-pointer">
        <div class="bg-surface-container-low rounded-xl p-8 h-full flex flex-col shadow-sm hover:shadow-md transition-all duration-300">
          <div class="bg-secondary-container text-on-secondary-container w-12 h-12 rounded-xl flex items-center justify-center mb-8">
            <span class="material-symbols-outlined">sunny</span>
          </div>
          <h3 class="font-headline text-2xl font-bold text-on-surface mb-4 leading-tight">Hiking in Heat: Stay hydrated</h3>
          <p class="text-on-surface-variant mb-8">The Victorian sun is deceptive. Discover hydration schedules and how to manage heat fatigue on long trails.</p>
          <div class="mt-auto pt-4 flex items-center justify-between border-t border-outline-variant/20">
            <span class="text-sm font-medium text-outline">5 min read</span>
            <span class="material-symbols-outlined text-primary">play_circle</span>
          </div>
        </div>
      </div>

      <!-- What to Pack -->
      <div class="md:col-span-6 group cursor-pointer">
        <div class="bg-surface-container-low rounded-xl overflow-hidden h-full flex flex-col shadow-sm hover:shadow-md transition-all duration-300">
          <div class="h-48 relative overflow-hidden">
            <img
              class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              alt="Hiking essentials laid out on rustic wooden table"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDoRIx349XNBKg1cVsrGvUJuan7cehcmHma7BUMMMqOxiDttCfvZSvaIYm90Wk7UK4YuL0LJiJbBXVGoJYziMMr2VlTvPPkNSxHH7rjFKeyBMwvdnN5VUMQH028jYo2NaU5h48mF5wUSpNsKS4iy6BJgxBkjdQwWewhOYs33dJ-bLJM6klVJBQXwm9cz9DWeofUgrJ7YgLsS7R4bNmxBEg837iK0k4tF49y3v8d46y8xf-KGolGNG-fRjaFYlBlVPb3K8rmlsk7Z-0"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-surface-container-low to-transparent"></div>
          </div>
          <div class="p-8 -mt-12 relative z-10">
            <div class="bg-primary-container text-on-primary w-12 h-12 rounded-xl flex items-center justify-center mb-6 shadow-lg">
              <span class="material-symbols-outlined">checklist</span>
            </div>
            <h3 class="font-headline text-2xl font-bold text-on-surface mb-2">What to pack: The novice's checklist</h3>
            <p class="text-on-surface-variant mb-6">From moisture-wicking layers to emergency beacons. Don't leave home without these Victorian trail essentials.</p>
            <div class="flex flex-wrap gap-2">
              <span class="px-3 py-1 bg-surface rounded-full text-xs font-semibold text-primary">Beginner Friendly</span>
              <span class="px-3 py-1 bg-surface rounded-full text-xs font-semibold text-primary">Gear Guide</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Flood Awareness -->
      <div class="md:col-span-6 group cursor-pointer">
        <div class="bg-surface-container-high rounded-xl p-8 h-full flex flex-col md:flex-row gap-8 shadow-sm hover:shadow-md transition-all duration-300">
          <div class="flex flex-col justify-between md:w-2/3">
            <div>
              <div class="bg-tertiary-container text-on-tertiary-container w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                <span class="material-symbols-outlined">waves</span>
              </div>
              <h3 class="font-headline text-2xl font-bold text-on-surface mb-4">Flood Awareness: Crossing creeks safely</h3>
              <p class="text-on-surface-variant">When a trickle becomes a torrent. Knowing when to cross and when to turn back during the wet season.</p>
            </div>
            <div class="mt-8 flex items-center gap-4">
              <div class="flex -space-x-3">
                <div class="w-8 h-8 rounded-full bg-primary-fixed border-2 border-surface flex items-center justify-center text-[10px] font-bold">JD</div>
                <div class="w-8 h-8 rounded-full bg-secondary-fixed border-2 border-surface flex items-center justify-center text-[10px] font-bold">AS</div>
              </div>
              <span class="text-xs font-medium text-outline">Updated 2 days ago</span>
            </div>
          </div>
          <div class="md:w-1/3 h-48 md:h-full rounded-lg overflow-hidden relative">
            <img
              class="absolute inset-0 w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
              alt="Flowing mountain stream with mossy rocks"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCyzr00xs8L2PcOFbjS21QihIWoM4V21dzixIAieoquHanj63vZ7Ah67d0cBmnxPIxRiess4i4FLC3wue64IMWQemCxyUm5-wSXooevLtOrcCc5nmPceyWYSipoae8Bwz8TeU7BEQf8udrGsSjLvY5dbqGc77Gq_d9ceWAHIBseY4KX9TNWD6DU4WmrybKTKj9ABbYp5CRF58HShzkHLYRJnfil3ERXLgbtQ4cx3bN02roqLtnu9q-JDS86XgdFNvaIMzTK1ykKRHo"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- Newsletter -->
    <section class="mt-24 bg-surface-container-lowest rounded-2xl p-8 md:p-16 text-center border border-outline-variant/10">
      <h2 class="font-headline text-3xl md:text-4xl font-extrabold text-on-surface mb-4">Stay ahead of the elements</h2>
      <p class="text-on-surface-variant max-w-xl mx-auto mb-10">Get weekly safety updates, seasonal trail reports, and expert advice delivered to your inbox.</p>
      <div class="flex flex-col md:flex-row gap-4 justify-center max-w-lg mx-auto">
        <input class="flex-grow px-6 py-4 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary text-on-surface" placeholder="Enter your email" type="email" />
        <button class="bg-primary text-on-primary px-8 py-4 rounded-xl font-bold hover:shadow-lg transition-all active:scale-95">Subscribe</button>
      </div>
    </section>
  </main>

  <SiteFooter />
</template>
