<script setup>
import { useRouter } from 'vue-router'
import SiteFooter from '../components/SiteFooter.vue'

const router = useRouter()
</script>

<template>
  <div>
  <main class="space-y-16 pb-20">
    <!-- Hero Section -->
    <section class="relative px-8 pt-12 md:pt-24 overflow-hidden">
      <div class="max-w-7xl mx-auto flex flex-col md:flex-row gap-12 items-center">
        <div class="w-full md:w-1/2 z-10">
          <span class="text-xs font-label uppercase tracking-[0.2em] text-primary mb-4 block">Official Victorian Safety Guide</span>
          <h1 class="text-5xl md:text-7xl font-headline font-extrabold text-on-surface leading-tight mb-8">
            Hike with <span class="gradient-text">Confidence</span> in Victoria.
          </h1>
          <div class="flex flex-wrap gap-4">
            <button
              class="primary-gradient text-on-primary px-8 py-4 rounded-lg font-bold flex items-center gap-2 shadow-xl shadow-primary/20 hover:opacity-90 transition-all"
              @click="router.push('/risk-map')"
            >
              <span class="material-symbols-outlined">map</span> Check Risk Map
            </button>
            <button
              class="bg-surface-container-high text-primary px-8 py-4 rounded-lg font-bold border-2 border-primary/10 hover:bg-surface-container-highest transition-all"
              @click="router.push('/route-planner')"
            >
              Plan My Route
            </button>
          </div>
        </div>
        <div class="w-full md:w-1/2 relative">
          <div class="aspect-square rounded-[2rem] overflow-hidden bg-surface-container-high rotate-3 hover:rotate-0 transition-transform duration-500">
            <img
              class="w-full h-full object-cover"
              alt="Stunning aerial view of the rugged Grampians National Park in Victoria"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAmNyB922YneY1cbo22Sttfq74UspbMx6Vrm-cr5xzgB9OfhoGhfly1s-GFQUpk1yLdxJESMHIccLvddetSCEwmU519zR9aV38SFNj_QpO4O-ippvOXQhrAl8K3lAoNTtrTk86KAEKNXoWKZXZZV7tQGlSkwH9C-6eukOcdWi6jW6iooq9zRGM513df6ITqsjlEqL8ucroqiBNahzq-UQCYyukUlfLXUtKQnsW89abQApWV8cs_4I0yWhFWgelNSH3UwMC734-x3vc"
            />
          </div>
          <div class="absolute -bottom-6 -left-6 bg-glass bg-white/70 p-6 rounded-2xl shadow-2xl backdrop-blur-md max-w-[240px] border border-white/40">
            <div class="flex items-center gap-3 mb-2">
              <span class="w-3 h-3 rounded-full bg-error animate-pulse"></span>
              <span class="font-bold text-sm">Active Warning</span>
            </div>
            <p class="text-xs text-on-surface-variant leading-relaxed">Extreme heat predicted for the High Country trails this weekend. Stay hydrated.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Risk Map Preview & Hazard Bento -->
    <section class="px-8 max-w-7xl mx-auto">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div class="md:col-span-8 bg-surface-container-low rounded-[2rem] p-4 flex flex-col gap-6 group">
          <div class="flex justify-between items-center px-4 pt-2">
            <h2 class="font-headline font-bold text-2xl">Live Risk Map Preview</h2>
            <span class="material-symbols-outlined text-primary cursor-pointer" @click="router.push('/risk-map')">open_in_full</span>
          </div>
          <div class="relative w-full h-[400px] rounded-[1.5rem] overflow-hidden bg-surface-dim">
            <img
              class="w-full h-full object-cover opacity-60 mix-blend-multiply"
              alt="Topographic satellite map of Victoria"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDeuuHnBvXZfDu-0v2-C3a-X7CSQ86x6JqmdlvzE3xRtqTbvijvfw_PJj7S3mKGeVbIx94QgEvaywz7Ukn3XaBX-UVpMhz1tpiqeB8H95L3LK2fBPauv2Vp1UvtukDjZzbi45lxvxeJs_xMivx_SfeuSfqofifOfnl2MM-PKN0g5PSEiA8lQT6GTkDHIWIeRkf7wM14FZniFRrG8eFisjXKEBE0rkUMdXGCc6Px5K6mPaYdFb8OEkvfDJw4HoqztLb2iyEAJASA8M0"
            />
            <div class="absolute top-1/4 left-1/3 w-32 h-32 bg-error/30 blur-3xl rounded-full animate-pulse"></div>
            <div class="absolute bottom-1/4 right-1/4 w-48 h-48 bg-blue-500/20 blur-3xl rounded-full"></div>
            <div class="absolute top-[28%] left-[35%] bg-white/90 px-3 py-1 rounded-full text-[10px] font-bold shadow-sm">
              BUSHFIRE RISK: DANDENONGS
            </div>
            <div class="absolute bottom-[30%] right-[25%] bg-white/90 px-3 py-1 rounded-full text-[10px] font-bold shadow-sm">
              HEAVY RAIN: GRAMPIANS
            </div>
          </div>
          <div class="flex gap-4 px-4 pb-2 overflow-x-auto">
            <span class="flex items-center gap-2 text-xs font-medium py-2 px-4 bg-surface-container-high rounded-full whitespace-nowrap">
              <span class="w-2 h-2 rounded-full bg-error"></span> Bushfire Warning
            </span>
            <span class="flex items-center gap-2 text-xs font-medium py-2 px-4 bg-surface-container-high rounded-full whitespace-nowrap">
              <span class="w-2 h-2 rounded-full bg-blue-500"></span> Flood Risk
            </span>
            <span class="flex items-center gap-2 text-xs font-medium py-2 px-4 bg-surface-container-high rounded-full whitespace-nowrap">
              <span class="w-2 h-2 rounded-full bg-yellow-500"></span> Trail Closure
            </span>
          </div>
        </div>

        <div class="md:col-span-4 grid grid-cols-2 md:grid-cols-1 gap-4">
          <div class="bg-surface-container-low p-6 rounded-[2rem] flex flex-col justify-between hover:bg-surface-container transition-colors">
            <span class="material-symbols-outlined text-4xl text-error mb-4" style="font-variation-settings: 'FILL' 1">local_fire_department</span>
            <div>
              <p class="font-headline font-bold text-lg">Bushfire</p>
              <span class="inline-block mt-1 px-2 py-0.5 bg-error/10 text-error text-[10px] font-bold rounded uppercase tracking-wider">High Risk</span>
            </div>
          </div>
          <div class="bg-surface-container-low p-6 rounded-[2rem] flex flex-col justify-between hover:bg-surface-container transition-colors">
            <span class="material-symbols-outlined text-4xl text-blue-500 mb-4" style="font-variation-settings: 'FILL' 1">rainy</span>
            <div>
              <p class="font-headline font-bold text-lg">Heavy Rain</p>
              <span class="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-bold rounded uppercase tracking-wider">Moderate</span>
            </div>
          </div>
          <div class="bg-surface-container-low p-6 rounded-[2rem] flex flex-col justify-between hover:bg-surface-container transition-colors">
            <span class="material-symbols-outlined text-4xl text-yellow-600 mb-4" style="font-variation-settings: 'FILL' 1">thermostat</span>
            <div>
              <p class="font-headline font-bold text-lg">Heat</p>
              <span class="inline-block mt-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded uppercase tracking-wider">Moderate</span>
            </div>
          </div>
          <div class="bg-surface-container-low p-6 rounded-[2rem] flex flex-col justify-between hover:bg-surface-container transition-colors">
            <span class="material-symbols-outlined text-4xl text-cyan-600 mb-4" style="font-variation-settings: 'FILL' 1">ac_unit</span>
            <div>
              <p class="font-headline font-bold text-lg">Cold Weather</p>
              <span class="inline-block mt-1 px-2 py-0.5 bg-cyan-100 text-cyan-700 text-[10px] font-bold rounded uppercase tracking-wider">Low Risk</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Community Alerts -->
    <section class="px-8 max-w-7xl mx-auto">
      <div class="flex items-baseline justify-between mb-8">
        <h2 class="font-headline font-bold text-3xl">Recent Community Alerts</h2>
        <button class="text-primary font-bold text-sm hover:underline" @click="router.push('/community-reports')">View all reports</button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white p-6 rounded-2xl flex items-start gap-6 border-l-4 border-yellow-500 shadow-sm">
          <div class="bg-surface-container-high p-4 rounded-xl">
            <span class="material-symbols-outlined text-yellow-600">warning</span>
          </div>
          <div class="flex-1">
            <div class="flex justify-between items-center mb-1">
              <p class="font-bold text-lg">Fallen tree on 1000 Steps trail</p>
              <span class="text-[10px] text-slate-400 font-medium">2 HOURS AGO</span>
            </div>
            <p class="text-on-surface-variant text-sm leading-relaxed mb-4">A large eucalyptus has fallen across the main path. Maintenance has been notified. Exercise caution when climbing.</p>
            <div class="flex items-center gap-3">
              <span class="text-[10px] font-bold text-primary bg-primary/5 px-2 py-1 rounded-full uppercase">Dandenongs</span>
              <span class="text-[10px] font-bold text-slate-500">Reported by: Mark J.</span>
            </div>
          </div>
        </div>
        <div class="bg-white p-6 rounded-2xl flex items-start gap-6 border-l-4 border-error shadow-sm">
          <div class="bg-surface-container-high p-4 rounded-xl">
            <span class="material-symbols-outlined text-error">water_damage</span>
          </div>
          <div class="flex-1">
            <div class="flex justify-between items-center mb-1">
              <p class="font-bold text-lg">Flash flood risk near Wilsons Prom</p>
              <span class="text-[10px] text-slate-400 font-medium">4 HOURS AGO</span>
            </div>
            <p class="text-on-surface-variant text-sm leading-relaxed mb-4">River levels are rising rapidly at Tidal River after heavy storm surge. Camping in low areas is currently discouraged.</p>
            <div class="flex items-center gap-3">
              <span class="text-[10px] font-bold text-primary bg-primary/5 px-2 py-1 rounded-full uppercase">South Coast</span>
              <span class="text-[10px] font-bold text-slate-500">Verified Alert</span>
            </div>
          </div>
        </div>
      </div>
      <div class="mt-8 flex justify-center">
        <button
          class="flex items-center gap-2 px-12 py-4 bg-surface-container-high rounded-full font-bold text-primary hover:bg-surface-container-highest transition-all"
          @click="router.push('/report-hazard')"
        >
          <span class="material-symbols-outlined">add_circle</span> Report a Hazard
        </button>
      </div>
    </section>

    <!-- Knowledge Hub Preview -->
    <section class="bg-surface-container-low py-20 px-8">
      <div class="max-w-7xl mx-auto">
        <div class="mb-12 text-center md:text-left">
          <h2 class="font-headline font-bold text-3xl mb-4">Knowledge Hub</h2>
          <p class="text-on-surface-variant max-w-xl">Equip yourself with the essential knowledge before stepping onto the trail. Expertise from Victorian Park Rangers.</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="bg-white rounded-[2rem] p-8 flex flex-col h-full shadow-sm hover:translate-y-[-4px] transition-transform">
            <div class="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
              <span class="material-symbols-outlined text-primary">checklist</span>
            </div>
            <h3 class="font-headline font-bold text-xl mb-4">"Before You Go" checklist</h3>
            <ul class="space-y-3 mb-8 flex-1">
              <li class="flex items-center gap-2 text-sm text-on-surface-variant">
                <span class="material-symbols-outlined text-primary text-sm">check_circle</span> Personal Locator Beacon (PLB)
              </li>
              <li class="flex items-center gap-2 text-sm text-on-surface-variant">
                <span class="material-symbols-outlined text-primary text-sm">check_circle</span> 2L Water per person
              </li>
              <li class="flex items-center gap-2 text-sm text-on-surface-variant">
                <span class="material-symbols-outlined text-primary text-sm">check_circle</span> Map &amp; Offline Navigation
              </li>
            </ul>
            <button class="text-primary font-bold text-sm text-left flex items-center gap-2 group" @click="router.push('/knowledge-hub')">
              Full Checklist <span class="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </div>

          <div class="bg-white rounded-[2rem] p-8 flex flex-col h-full shadow-sm hover:translate-y-[-4px] transition-transform">
            <div class="bg-secondary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
              <span class="material-symbols-outlined text-secondary">cloudy_filled</span>
            </div>
            <h3 class="font-headline font-bold text-xl mb-4">"Weather 101" guides</h3>
            <p class="text-sm text-on-surface-variant leading-relaxed mb-8 flex-1">Understanding how Victorian alpine weather can shift in minutes. Learn to spot the signs of incoming storms.</p>
            <button class="text-secondary font-bold text-sm text-left flex items-center gap-2 group" @click="router.push('/knowledge-hub')">
              Browse Guides <span class="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </div>

          <div class="relative rounded-[2rem] overflow-hidden group h-full min-h-[320px]">
            <img
              class="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              alt="Experienced hiker with gear looking over Victorian forest valley"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuArD15DPJjumuqYnRE_aAWV91cvQ60OSASHsfR_6lvPQ6xN2_jXi5aLK5lOc2a5r5GV1WJ60EZnc-DzjZjQW-_kKo7tQ7-2Z_c_sFmJGV02bffT2CTyi5-sR4OIz8wBQVxYlci0Cnw5R1rxl1tBpWC-dW4gfMyJXtNJ5H3cPvhOcrWIz9Lz0X_yGGnbHE8AtGmqiTv9Y1xQokILke_5TF_WpoJmoOx3TkVEa3l2Jnf4NKsphZykza0dTbb6fcq3uOw49LErD_qJvQY"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-primary/90 to-transparent flex flex-col justify-end p-8">
              <h3 class="text-white font-headline font-bold text-xl mb-2">Park Ranger Insights</h3>
              <p class="text-white/80 text-sm mb-6">Local tips for the Dandenong Ranges and beyond.</p>
              <button class="bg-white text-primary px-6 py-3 rounded-full font-bold text-sm w-fit" @click="router.push('/knowledge-hub')">Read Stories</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>

  <SiteFooter />
  </div>
</template>
