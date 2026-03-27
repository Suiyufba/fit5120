<script setup>
import { ref } from 'vue'

const activeTimeline = ref('today')
const activeLayers = ref(['fire'])

function toggleLayer(layer) {
  const idx = activeLayers.value.indexOf(layer)
  if (idx >= 0) activeLayers.value.splice(idx, 1)
  else activeLayers.value.push(layer)
}
</script>

<template>
  <main class="flex-1 flex relative overflow-hidden" style="height: calc(100vh - 72px)">
    <!-- Sidebar: Active Alerts -->
    <aside class="w-80 h-full bg-surface-container-low z-40 hidden lg:flex flex-col shadow-xl">
      <div class="p-6 space-y-6 overflow-y-auto flex-1">
        <header>
          <span class="text-xs font-bold uppercase tracking-[0.1em] text-outline mb-2 block">Current Status</span>
          <h1 class="font-headline text-3xl font-extrabold tracking-tight leading-none text-on-surface">Active Alerts</h1>
        </header>
        <div class="space-y-4">
          <div class="bg-surface-container-lowest p-5 rounded-xl transition-all hover:translate-x-1 duration-300 cursor-pointer">
            <div class="flex items-center gap-2 mb-3">
              <span class="w-2 h-2 rounded-full bg-error"></span>
              <span class="text-xs font-bold text-error uppercase tracking-wider">High Risk</span>
            </div>
            <h3 class="font-headline font-bold text-lg mb-1 leading-tight text-on-surface">Great Ocean Road</h3>
            <p class="text-sm text-on-surface-variant leading-relaxed">Active bushfire alert near Apollo Bay. Visibility reduced. Avoid non-essential travel.</p>
            <div class="mt-4 flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-widest cursor-pointer group">
              Details
              <span class="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">chevron_right</span>
            </div>
          </div>

          <div class="bg-surface-container-lowest p-5 rounded-xl transition-all hover:translate-x-1 duration-300 cursor-pointer">
            <div class="flex items-center gap-2 mb-3">
              <span class="w-2 h-2 rounded-full bg-tertiary"></span>
              <span class="text-xs font-bold text-tertiary uppercase tracking-wider">Moderate Risk</span>
            </div>
            <h3 class="font-headline font-bold text-lg mb-1 leading-tight text-on-surface">Gippsland Peaks</h3>
            <p class="text-sm text-on-surface-variant leading-relaxed">Flash flood warning for high-altitude trail crossings due to heavy precipitation.</p>
            <div class="mt-4 flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-widest cursor-pointer group">
              Details
              <span class="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">chevron_right</span>
            </div>
          </div>

          <div class="bg-surface-container-lowest p-5 rounded-xl transition-all hover:translate-x-1 duration-300 cursor-pointer">
            <div class="flex items-center gap-2 mb-3">
              <span class="w-2 h-2 rounded-full bg-secondary"></span>
              <span class="text-xs font-bold text-secondary uppercase tracking-wider">Information</span>
            </div>
            <h3 class="font-headline font-bold text-lg mb-1 leading-tight text-on-surface">Grampians National Park</h3>
            <p class="text-sm text-on-surface-variant leading-relaxed">Planned back-burns near MacKenzie Falls. Expect heavy smoke haze on northern tracks.</p>
            <div class="mt-4 flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-widest cursor-pointer group">
              Details
              <span class="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">chevron_right</span>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-auto p-6 bg-surface-container-high/50">
        <div class="flex items-center justify-between">
          <div class="flex -space-x-2">
            <div class="w-8 h-8 rounded-full border-2 border-surface-container-high overflow-hidden bg-primary-fixed flex items-center justify-center text-[10px] font-bold">HP</div>
            <div class="w-8 h-8 rounded-full border-2 border-surface-container-high overflow-hidden bg-secondary-fixed flex items-center justify-center text-[10px] font-bold">ER</div>
          </div>
          <span class="text-[10px] font-bold uppercase tracking-widest text-outline">12 Active Volunteers</span>
        </div>
      </div>
    </aside>

    <!-- Map Canvas -->
    <section class="flex-1 relative bg-surface-dim overflow-hidden map-mesh">
      <div class="absolute inset-0 z-0">
        <img
          class="w-full h-full object-cover opacity-60 grayscale-[0.2]"
          alt="Topographic satellite map of Victoria Australia"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCoCECbwTODQvRWyMYwyS8EoT6OtnubFo2mWgVXnZUeMvE1_sfdn4LEaMAxstFi_77GwYfjR8YlmzoK35AK5bNIavjnC24zT3aoM0TJuKBWiEOv2xOdKm6v5-Aqn4fDoxb-qsMy7nMcjtaeMfAR0G78cptNu57nyNx2BaS9D_kd5IHJQGq1TsoPTN14noRCilUbm3fQtRPmYIhcWw4cFvUElJEfhpP9tXP_j8VU5LBEbpgXr5hQt326yX-3njYEK2N7kmDufq4jegQ"
        />
        <div class="absolute top-[60%] left-[20%] w-[30vw] h-[30vw] heat-fire blur-3xl animate-pulse"></div>
        <div class="absolute top-[30%] right-[15%] w-[25vw] h-[25vw] heat-rain blur-3xl animate-pulse" style="animation-delay: 1s"></div>
      </div>

      <!-- Map Markers -->
      <div class="absolute top-[65%] left-[30%] z-10">
        <div class="relative flex items-center justify-center">
          <div class="absolute w-12 h-12 bg-error/20 rounded-full animate-ping"></div>
          <div class="bg-error text-white p-2 rounded-full shadow-lg flex items-center justify-center border-2 border-white/50">
            <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1">local_fire_department</span>
          </div>
          <div class="absolute top-8 bg-surface-container-lowest px-2 py-1 rounded shadow-sm whitespace-nowrap text-[10px] font-bold border border-outline-variant/20 uppercase tracking-tighter">Apollo Bay Fire</div>
        </div>
      </div>
      <div class="absolute top-[40%] right-[25%] z-10">
        <div class="relative flex items-center justify-center">
          <div class="absolute w-12 h-12 bg-tertiary/20 rounded-full animate-ping"></div>
          <div class="bg-tertiary text-white p-2 rounded-full shadow-lg flex items-center justify-center border-2 border-white/50">
            <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1">rainy</span>
          </div>
          <div class="absolute top-8 bg-surface-container-lowest px-2 py-1 rounded shadow-sm whitespace-nowrap text-[10px] font-bold border border-outline-variant/20 uppercase tracking-tighter">Gippsland Peak Rain</div>
        </div>
      </div>

      <!-- Hazard Layer Toggles -->
      <div class="absolute top-6 right-6 z-30 flex flex-col gap-4">
        <div class="bg-surface-container-lowest/80 backdrop-blur-md p-3 rounded-2xl shadow-xl flex flex-col gap-2 w-48 border border-white/20">
          <span class="text-[10px] font-bold text-outline uppercase tracking-widest px-2 mb-1">Hazard Layers</span>
          <button
            v-for="layer in [
              { id: 'fire', icon: 'local_fire_department', label: 'Fire Risk' },
              { id: 'rain', icon: 'rainy', label: 'Rainfall' },
              { id: 'heat', icon: 'thermostat', label: 'Extreme Heat' },
              { id: 'snow', icon: 'ac_unit', label: 'Snow & Ice' },
            ]"
            :key="layer.id"
            class="flex items-center gap-3 px-3 py-2 rounded-lg transition-all"
            :class="activeLayers.includes(layer.id) ? 'bg-primary-container text-on-primary-container shadow-md' : 'hover:bg-surface-container-high text-on-surface'"
            @click="toggleLayer(layer.id)"
          >
            <span class="material-symbols-outlined text-lg">{{ layer.icon }}</span>
            <span class="text-sm font-semibold">{{ layer.label }}</span>
          </button>
        </div>

        <div class="bg-surface-container-lowest/80 backdrop-blur-md p-3 rounded-2xl shadow-xl flex items-center justify-between border border-white/20">
          <div class="flex items-center gap-3 px-2">
            <span class="material-symbols-outlined text-lg text-primary">forum</span>
            <span class="text-sm font-semibold text-on-surface">Community</span>
          </div>
          <div class="w-10 h-5 bg-primary-container rounded-full relative p-0.5 cursor-pointer">
            <div class="w-4 h-4 bg-white rounded-full absolute right-0.5 shadow-sm"></div>
          </div>
        </div>
      </div>

      <!-- Timeline Picker -->
      <div class="absolute bottom-10 left-1/2 -translate-x-1/2 z-30">
        <div class="bg-surface-container-lowest/90 backdrop-blur-xl p-2 rounded-full shadow-2xl flex items-center gap-1 border border-white/40">
          <button
            v-for="t in ['Today', 'Tomorrow', 'Weekend']"
            :key="t"
            class="px-6 py-2 rounded-full text-sm font-bold transition-all"
            :class="activeTimeline === t.toLowerCase() ? 'bg-primary text-on-primary shadow-md' : 'hover:bg-surface-container-high text-on-surface-variant'"
            @click="activeTimeline = t.toLowerCase()"
          >
            {{ t }}
          </button>
          <div class="h-6 w-[1px] bg-outline-variant/30 mx-2"></div>
          <button class="p-2 rounded-full hover:bg-surface-container-high">
            <span class="material-symbols-outlined text-on-surface-variant">calendar_today</span>
          </button>
        </div>
      </div>

      <!-- Heat Legend -->
      <div class="absolute bottom-10 right-10 z-30">
        <div class="bg-surface-container-lowest/80 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/20">
          <span class="text-[10px] font-bold text-outline uppercase tracking-widest block mb-3">Risk Intensity</span>
          <div class="flex flex-col gap-3">
            <div class="flex items-center gap-3">
              <div class="w-3 h-3 rounded-full bg-error"></div>
              <span class="text-xs font-bold text-on-surface">High Risk</span>
            </div>
            <div class="flex items-center gap-3">
              <div class="w-3 h-3 rounded-full bg-[#E9C46A]"></div>
              <span class="text-xs font-bold text-on-surface">Moderate</span>
            </div>
            <div class="flex items-center gap-3">
              <div class="w-3 h-3 rounded-full bg-primary-fixed-dim"></div>
              <span class="text-xs font-bold text-on-surface">Low/Safe</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Zoom Controls -->
      <div class="absolute bottom-10 left-10 z-30 flex flex-col gap-2">
        <button class="w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-on-surface">
          <span class="material-symbols-outlined">add</span>
        </button>
        <button class="w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-on-surface">
          <span class="material-symbols-outlined">remove</span>
        </button>
        <button class="w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-primary mt-2">
          <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1">my_location</span>
        </button>
      </div>
    </section>
  </main>

  <!-- Footer -->
  <footer class="w-full py-6 px-8 border-t border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 z-50">
    <div class="flex items-center gap-6">
      <span class="text-xl font-black text-[#4A6741] italic font-headline tracking-tight">HikeShield Victoria</span>
      <span class="text-slate-500 text-sm font-body tracking-wide">© 2026. Official Victorian Safety Data.</span>
    </div>
    <div class="flex gap-8">
      <a href="#" class="text-error font-bold text-sm tracking-wide transition-colors hover:underline">Emergency: 000</a>
      <a href="#" class="text-slate-500 hover:text-[#4A6741] transition-colors text-sm tracking-wide">Privacy Policy</a>
      <a href="#" class="text-slate-500 hover:text-[#4A6741] transition-colors text-sm tracking-wide">Terms of Service</a>
      <a href="#" class="text-slate-500 hover:text-[#4A6741] transition-colors text-sm tracking-wide">Data Sources</a>
    </div>
  </footer>
</template>
