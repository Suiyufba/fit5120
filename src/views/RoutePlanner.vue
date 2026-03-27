<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const startPoint = ref('Melbourne CBD')
const destination = ref('Erskine Falls')
</script>

<template>
  <main class="relative flex flex-col md:flex-row" style="height: calc(100vh - 72px)">
    <!-- Left Control Panel -->
    <aside class="w-full md:w-[400px] z-20 h-full bg-surface-container-low p-6 flex flex-col gap-8 shadow-xl overflow-y-auto">
      <div class="space-y-2">
        <h1 class="text-3xl font-headline font-extrabold tracking-tight text-primary">Plan Route</h1>
        <p class="text-on-surface-variant text-sm">Calculate the safest path through Victoria's rugged terrain.</p>
      </div>

      <div class="space-y-6">
        <div class="space-y-4">
          <div class="relative group">
            <label class="block text-[0.7rem] font-bold uppercase tracking-[0.1em] text-outline mb-1.5 ml-1">Start Point</label>
            <div class="flex items-center bg-surface-container-high rounded-xl px-4 py-3 focus-within:bg-surface-container-highest transition-colors border-b-2 border-transparent focus-within:border-primary">
              <span class="material-symbols-outlined text-primary mr-3 text-sm">my_location</span>
              <input v-model="startPoint" class="bg-transparent border-none focus:ring-0 w-full text-on-surface font-medium placeholder-outline" placeholder="Enter starting point" type="text" />
            </div>
          </div>
          <div class="relative group">
            <label class="block text-[0.7rem] font-bold uppercase tracking-[0.1em] text-outline mb-1.5 ml-1">Destination</label>
            <div class="flex items-center bg-surface-container-high rounded-xl px-4 py-3 focus-within:bg-surface-container-highest transition-colors border-b-2 border-transparent focus-within:border-primary">
              <span class="material-symbols-outlined text-error mr-3 text-sm">location_on</span>
              <input v-model="destination" class="bg-transparent border-none focus:ring-0 w-full text-on-surface font-medium placeholder-outline" placeholder="Enter destination" type="text" />
            </div>
          </div>
        </div>

        <!-- Safe Route Summary -->
        <div class="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col gap-4 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16"></div>
          <div class="flex justify-between items-start">
            <div>
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-3">
                <span class="material-symbols-outlined text-[14px]" style="font-variation-settings: 'FILL' 1">verified_user</span> Recommended Safe Route
              </span>
              <h2 class="text-xl font-headline font-bold text-on-surface leading-tight">Inland Safety Deviation</h2>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-surface-container-low rounded-lg p-3">
              <div class="text-[0.65rem] font-bold uppercase text-outline mb-1">Duration</div>
              <div class="text-lg font-bold text-on-surface">2h 30m</div>
            </div>
            <div class="bg-surface-container-low rounded-lg p-3">
              <div class="text-[0.65rem] font-bold uppercase text-outline mb-1">Distance</div>
              <div class="text-lg font-bold text-on-surface">145km</div>
            </div>
            <div class="bg-surface-container-low rounded-lg p-3">
              <div class="text-[0.65rem] font-bold uppercase text-outline mb-1">Difficulty</div>
              <div class="text-lg font-bold text-on-surface">Moderate</div>
            </div>
            <div class="bg-surface-container-low rounded-lg p-3">
              <div class="text-[0.65rem] font-bold uppercase text-outline mb-1">Risk Status</div>
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span class="text-lg font-bold text-on-surface">Low</span>
              </div>
            </div>
          </div>
          <div class="bg-surface-container-high/50 p-4 rounded-lg border-l-4 border-primary">
            <p class="text-sm text-on-surface-variant leading-relaxed">
              We've rerouted you 15 mins inland to avoid current moderate bushfire activity near the coast.
            </p>
          </div>
          <button
            class="w-full py-3.5 bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-lg font-bold text-sm tracking-wide shadow-lg hover:brightness-110 transition-all active:scale-[0.98]"
            @click="router.push('/route-detail')"
          >
            View Route Details
          </button>
        </div>
      </div>

      <!-- Legend -->
      <div class="mt-auto pt-6">
        <div class="text-[0.65rem] font-bold uppercase text-outline mb-3 tracking-widest">Active Hazards</div>
        <div class="flex flex-wrap gap-2">
          <span class="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-full text-xs font-semibold text-error">
            <span class="w-2 h-2 rounded-full bg-error"></span> Bushfire Warning
          </span>
          <span class="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-full text-xs font-semibold text-on-surface-variant">
            <span class="w-2 h-2 rounded-full bg-surface-dim"></span> Road Closure
          </span>
        </div>
      </div>
    </aside>

    <!-- Map Area -->
    <section class="flex-1 relative bg-surface-dim overflow-hidden">
      <div class="absolute inset-0 bg-cover bg-center" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuAur3_tDNdSZZ4CywO5iu-4F4rmNZoxMuwhpEAT2XNlb_DqZlFe0hpKK4xdtsgGbWRIjl6cnVoi4YIAWyc15wz1MUjED5tG3Ln2yaF6Krsvcye1yZplU5mZpk70SjPOwVWNJC8Q7z95Y87hOHjCrXAW5ZQcIQaWg7oUNNVpR026wj02m6TBF-eAv6dmbk-_NAZneNISeuhlymXZPEBYJf0sL6y_ZWxoakYICh5DHpj3Z_3on1PqtXIG9iA-PwxVFgkhwG9yq2pWXeQ')">
        <svg class="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 1000 1000">
          <path d="M200,100 C250,200 300,450 450,550 S700,650 850,850" fill="none" opacity="0.1" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="12" />
          <path d="M200,100 C250,200 300,450 450,550 S700,650 850,850" fill="none" stroke="#334f2b" stroke-dasharray="1,12" stroke-linecap="round" stroke-linejoin="round" stroke-width="6" />
          <circle cx="200" cy="100" fill="#334f2b" r="8" />
          <circle cx="850" cy="850" fill="#ba1a1a" r="8" />
        </svg>

        <!-- Bushfire Risk Zone -->
        <div class="absolute top-[60%] right-[10%] w-[30%] h-[25%] bg-error/20 backdrop-blur-[2px] rounded-full border-2 border-dashed border-error flex items-center justify-center">
          <div class="text-center">
            <span class="material-symbols-outlined text-error text-3xl mb-1">local_fire_department</span>
            <div class="text-error font-black uppercase tracking-tighter text-xs">High Risk Area</div>
            <div class="text-error text-[10px] font-bold">Bushfire Activity - Lorne Coast</div>
          </div>
        </div>

        <!-- Map Controls -->
        <div class="absolute bottom-8 right-8 flex flex-col gap-3">
          <button class="w-12 h-12 glass-panel rounded-full flex items-center justify-center text-on-surface shadow-lg hover:bg-white transition-all">
            <span class="material-symbols-outlined">add</span>
          </button>
          <button class="w-12 h-12 glass-panel rounded-full flex items-center justify-center text-on-surface shadow-lg hover:bg-white transition-all">
            <span class="material-symbols-outlined">remove</span>
          </button>
          <button class="w-12 h-12 glass-panel rounded-full flex items-center justify-center text-on-surface shadow-lg hover:bg-white transition-all">
            <span class="material-symbols-outlined">layers</span>
          </button>
        </div>

        <!-- Safe Point Marker -->
        <div class="absolute top-[48%] left-[42%] glass-panel px-4 py-2 rounded-xl shadow-2xl flex items-center gap-3 border border-white/20">
          <span class="material-symbols-outlined text-primary" style="font-variation-settings: 'FILL' 1">eco</span>
          <div>
            <div class="text-[10px] font-bold uppercase text-outline leading-none">Safe Point</div>
            <div class="text-xs font-bold text-on-surface">Winchelsea Deviation</div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
