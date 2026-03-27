<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <main class="relative flex" style="height: calc(100vh - 72px)">
    <!-- Background Map -->
    <div class="absolute inset-0 z-0">
      <img
        class="w-full h-full object-cover"
        alt="Topographical map of Victorian coastline"
        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCT-kbIVTLci5tQc6_tyx_qQAns9NxIieBvnKCrvFs_HAZkZRIzRMGl0uHG27jrpW6SGHynDz4MgBgt9xQU0PwZbI2Mlk-ICqR0LL97fUT5rB1ns4L0nqCvpwKIN5IkEciS8YS2AOlWktsUyw34GWb-AScdUzumxNaZJt5mx1grRInl7eJG5WceFmmA2BliW_beYxb3cHff7zRNdR4RV6Gf6kvyjOBxHQEZPKgjal__578mux6B1zYAk5b7dzCEUqO9aYu_5y_N_vQ"
      />
      <div class="absolute inset-0 bg-primary/5 pointer-events-none"></div>
    </div>

    <!-- Side Panel -->
    <section class="relative z-10 w-full max-w-md h-full bg-surface-container-lowest/95 backdrop-blur-md shadow-2xl flex flex-col custom-scrollbar overflow-y-auto border-r border-outline-variant/20">
      <div class="p-8 space-y-8">
        <header class="space-y-2">
          <div class="flex items-center gap-2 text-primary font-bold tracking-widest text-[0.65rem] uppercase">
            <span class="material-symbols-outlined text-sm">route</span>
            Route Planning Detail
          </div>
          <h1 class="font-headline text-3xl font-extrabold text-on-surface leading-tight tracking-tight">Erskine Falls via Deans Marsh</h1>
        </header>

        <!-- Hero Image -->
        <div class="relative rounded-xl overflow-hidden aspect-video bg-surface-dim shadow-inner group">
          <img
            class="w-full h-full object-cover grayscale-[0.2] transition-transform duration-700 group-hover:scale-105"
            alt="Birds-eye view of winding rural highway through eucalyptus forest"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAoMTEGeMvONGjz2L2diXrU7CnuOMe1rDDEewqXXsFo8yjrn2QLJKqFI35HiP1vN7Qj5_3Ml2D-3BOub7uhHh4fppGhxcZTvxB25odczqLZ8FJwaZtmpJzLFFFc9HhIZoFh7Rw88MCm3lcdmzPhP8woOVxoG5M2-EYGn1m1Ys1WLvhGF1ThFim8YYrjNm5JVy8u3dEPepY0OMFewOz75UYJfgxd_mB9kQTrkxVusSiPr2QnISuQ0MDpeouqVt3Ujd-MEVgdw5byURk"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
          <div class="absolute bottom-4 left-4 flex gap-2">
            <span class="bg-primary px-3 py-1 rounded-full text-white text-xs font-bold shadow-lg">145 KM</span>
            <span class="bg-surface-container-lowest/90 px-3 py-1 rounded-full text-on-surface text-xs font-bold shadow-lg">2h 15m</span>
          </div>
        </div>

        <!-- Safety Status -->
        <div class="bg-surface-container-low p-6 rounded-xl space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-headline text-lg font-bold text-on-surface">Overall Safety</h3>
            <div class="flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full">
              <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span class="text-xs font-bold">Recommended for today</span>
            </div>
          </div>
          <p class="text-sm text-on-surface-variant leading-relaxed italic">
            "Conditions are currently stable. Minimal wind speed and clear visibility across the Otways segment."
          </p>
        </div>

        <!-- Risk Sections -->
        <div class="space-y-6">
          <h3 class="font-headline text-lg font-bold text-on-surface border-l-4 border-tertiary pl-4">Key Risk Sections</h3>
          <div class="space-y-4">
            <div class="bg-error-container/30 p-5 rounded-xl border-l-4 border-error">
              <div class="flex items-start gap-4">
                <span class="material-symbols-outlined text-error" style="font-variation-settings: 'FILL' 1">local_fire_department</span>
                <div class="space-y-1">
                  <p class="text-sm font-bold text-on-error-container">Lorne Segment Alert</p>
                  <p class="text-sm text-on-surface-variant leading-relaxed">
                    15km section near Lorne has <span class="text-error font-bold">moderate fire risk</span>. We recommend using the <span class="underline decoration-error/30">C151</span> instead of the coastal road.
                  </p>
                </div>
              </div>
            </div>
            <div class="bg-secondary-container/30 p-5 rounded-xl border-l-4 border-secondary">
              <div class="flex items-start gap-4">
                <span class="material-symbols-outlined text-secondary" style="font-variation-settings: 'FILL' 1">texture</span>
                <div class="space-y-1">
                  <p class="text-sm font-bold text-on-secondary-container">Surface Warning</p>
                  <p class="text-sm text-on-surface-variant leading-relaxed">
                    Recent grading near Deans Marsh. Expect loose gravel for approximately 4km.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Suggested Prep -->
        <div class="space-y-4">
          <h3 class="font-headline text-lg font-bold text-on-surface">Suggested Prep</h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-surface-container p-4 rounded-xl flex flex-col items-center text-center space-y-2">
              <span class="material-symbols-outlined text-primary">wb_sunny</span>
              <p class="text-[0.65rem] font-bold uppercase tracking-wider text-on-surface-variant">Protection</p>
              <p class="text-xs font-semibold text-on-surface">Sunscreen 50+</p>
            </div>
            <div class="bg-surface-container p-4 rounded-xl flex flex-col items-center text-center space-y-2">
              <span class="material-symbols-outlined text-primary">water_drop</span>
              <p class="text-[0.65rem] font-bold uppercase tracking-wider text-on-surface-variant">Hydration</p>
              <p class="text-xs font-semibold text-on-surface">3L per person</p>
            </div>
            <div class="bg-surface-container p-4 rounded-xl flex flex-col items-center text-center space-y-2 col-span-2">
              <span class="material-symbols-outlined text-primary">notification_important</span>
              <p class="text-[0.65rem] font-bold uppercase tracking-wider text-on-surface-variant">Monitoring</p>
              <p class="text-xs font-semibold text-on-surface">Check for alerts again in 2 hours</p>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="space-y-4 pb-12">
          <button class="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold py-4 rounded-lg shadow-xl hover:shadow-2xl transition-all active:scale-95 duration-200 flex justify-center items-center gap-2">
            <span class="material-symbols-outlined">navigation</span>
            START ROUTE NOW
          </button>
          <button class="w-full bg-surface-container-high text-primary font-headline font-bold py-4 rounded-lg hover:bg-surface-container-highest transition-all duration-300">
            SAVE TO OFFLINE MAPS
          </button>
        </div>
      </div>
    </section>

    <div class="flex-grow hidden lg:block"></div>
  </main>
</template>
