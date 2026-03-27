<script setup>
import { ref } from 'vue'
import SiteFooter from '../components/SiteFooter.vue'

const selectedSeverity = ref('high')
</script>

<template>
  <main class="max-w-3xl mx-auto px-6 py-12 md:py-20">
    <!-- Header -->
    <header class="mb-12 text-center md:text-left">
      <h1 class="font-headline text-5xl font-extrabold tracking-tight text-primary mb-4">Submit Hazard Report</h1>
      <p class="text-on-surface-variant text-lg max-w-xl">
        Your report helps keep fellow hikers safe. Please only report active hazards you have seen in person.
      </p>
    </header>

    <!-- Form -->
    <section class="bg-surface-container-low p-8 md:p-12 rounded-xl shadow-sm space-y-12">
      <!-- Photo Upload -->
      <div class="space-y-4">
        <label class="font-label text-xs uppercase tracking-widest font-bold text-outline">Visual Evidence</label>
        <div class="group relative flex flex-col items-center justify-center border-2 border-dashed border-outline-variant/30 rounded-xl bg-surface-container-lowest h-64 cursor-pointer hover:bg-surface-container transition-colors">
          <span class="material-symbols-outlined text-4xl text-primary mb-2">add_a_photo</span>
          <p class="font-medium text-on-surface-variant">Click to add a hazard photo.</p>
          <p class="text-xs text-outline mt-1">Maximum file size: 10MB (JPG, PNG)</p>
          <input class="absolute inset-0 opacity-0 cursor-pointer" type="file" accept="image/*" />
        </div>
      </div>

      <!-- Map Picker -->
      <div class="space-y-4">
        <div class="flex justify-between items-end">
          <label class="font-label text-xs uppercase tracking-widest font-bold text-outline">Exact Location</label>
          <span class="text-xs font-medium text-primary bg-primary-container/10 px-3 py-1 rounded-full">Wilsons Promontory</span>
        </div>
        <div class="relative rounded-xl overflow-hidden h-80 ring-1 ring-outline-variant/20">
          <img
            class="w-full h-full object-cover"
            alt="Satellite map of Wilsons Promontory"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBJTeZ4cgHt3sIJRN6qm-nMKTu2PpnIIW1Gc50pt1FPb_ME5OR6zOLegUPsIU1T4o3EQvBABduirzLh89XcsbDMOmbhsLEl5S7bIXiklbcH_5M7mfduxt2u02B0VrOhyxnsJV1j0RKQGbPI1o19G6jrhsV93drPb-GQGKT_SS9u3WeBMWrCxYLaDEa12A4Sb4JoY8Duv9ptgfXppqB8zEUAIuqOhJYuotYqD7nK69N9RS1GmARnbzTygLgV4Gj5K23AktQdGvuuKno"
          />
          <div class="absolute inset-0 bg-black/5 pointer-events-none"></div>
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <span class="material-symbols-outlined text-error text-4xl drop-shadow-lg" style="font-variation-settings: 'FILL' 1">location_on</span>
          </div>
          <div class="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur p-3 rounded-lg flex items-center gap-3">
            <span class="material-symbols-outlined text-primary">explore</span>
            <p class="text-sm font-medium text-on-surface">Where is the hazard located?</p>
          </div>
        </div>
      </div>

      <!-- Incident Details -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div class="space-y-3">
          <label class="font-label text-xs uppercase tracking-widest font-bold text-outline">Incident Type</label>
          <div class="relative">
            <select class="w-full appearance-none bg-surface-container-high border-none rounded-lg px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-highest transition-all">
              <option disabled selected value="">Select type...</option>
              <option>Bushfire</option>
              <option>Fallen Tree</option>
              <option>Flood</option>
              <option>Track Damage</option>
            </select>
            <span class="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-outline">expand_more</span>
          </div>
        </div>
        <div class="space-y-3">
          <label class="font-label text-xs uppercase tracking-widest font-bold text-outline">Time Spotted</label>
          <input class="w-full bg-surface-container-high border-none rounded-lg px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-highest transition-all" type="datetime-local" />
        </div>
      </div>

      <!-- Severity -->
      <div class="space-y-4">
        <label class="font-label text-xs uppercase tracking-widest font-bold text-outline">Severity Level</label>
        <div class="grid grid-cols-3 gap-4">
          <button
            class="flex flex-col items-center gap-2 p-4 rounded-xl transition-all"
            :class="selectedSeverity === 'low' ? 'border-2 border-primary/40 bg-primary/5' : 'border border-outline-variant/30 bg-surface-container-highest hover:bg-surface'"
            @click="selectedSeverity = 'low'"
          >
            <div class="w-3 h-3 rounded-full bg-green-500"></div>
            <span class="font-bold text-sm" :class="selectedSeverity === 'low' ? 'text-primary' : 'text-on-surface'">Low</span>
          </button>
          <button
            class="flex flex-col items-center gap-2 p-4 rounded-xl transition-all"
            :class="selectedSeverity === 'moderate' ? 'border-2 border-primary/40 bg-primary/5' : 'border border-outline-variant/30 bg-surface-container-highest hover:bg-surface'"
            @click="selectedSeverity = 'moderate'"
          >
            <div class="w-3 h-3 rounded-full bg-amber-500"></div>
            <span class="font-bold text-sm" :class="selectedSeverity === 'moderate' ? 'text-primary' : 'text-on-surface'">Moderate</span>
          </button>
          <button
            class="flex flex-col items-center gap-2 p-4 rounded-xl transition-all"
            :class="selectedSeverity === 'high' ? 'border-2 border-primary/40 bg-primary/5' : 'border border-outline-variant/30 bg-surface-container-highest hover:bg-surface'"
            @click="selectedSeverity = 'high'"
          >
            <div class="w-3 h-3 rounded-full bg-red-600"></div>
            <span class="font-bold text-sm" :class="selectedSeverity === 'high' ? 'text-primary' : 'text-on-surface'">High</span>
          </button>
        </div>
      </div>

      <!-- Submit -->
      <div class="pt-8">
        <button class="w-full primary-gradient text-on-primary font-headline font-bold py-5 px-8 rounded-lg shadow-xl hover:opacity-95 transition-all active:scale-[0.98] flex items-center justify-center gap-3">
          <span class="material-symbols-outlined">send</span>
          Submit Hazard Report
        </button>
        <p class="text-center text-xs text-outline mt-6 italic">
          By submitting, you confirm this information is accurate to the best of your knowledge.
        </p>
      </div>
    </section>
  </main>

  <SiteFooter />
</template>
