<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import SiteFooter from '../components/SiteFooter.vue'
import { submitCommunityReport } from '../services/communityReportApi'

const router = useRouter()

const form = reactive({
  title: '',
  description: '',
  locationName: '',
  latitude: '-37.8136',
  longitude: '144.9631',
  hazardType: 'fire',
  severity: 'high',
  reporterName: '',
  imageUrl: '',
})

const isSubmitting = ref(false)
const submitError = ref('')
const submitSuccess = ref('')

async function handleSubmit() {
  submitError.value = ''
  submitSuccess.value = ''
  isSubmitting.value = true

  try {
    await submitCommunityReport({
      title: form.title,
      description: form.description,
      locationName: form.locationName,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      hazardType: form.hazardType,
      severity: form.severity,
      reporterName: form.reporterName || 'Anonymous Hiker',
      imageUrl: form.imageUrl,
    })

    submitSuccess.value = 'Report submitted successfully. Redirecting to community reports...'
    window.setTimeout(() => {
      router.push('/community-reports')
    }, 900)
  } catch (error) {
    submitError.value = error?.message || 'Failed to submit the report.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div>
    <main class="max-w-3xl mx-auto px-4 sm:px-6 py-10 md:py-20">
      <header class="mb-10 text-center md:text-left">
        <h1 class="font-headline text-4xl sm:text-5xl font-extrabold tracking-tight text-primary mb-4">Submit Community Hazard Report</h1>
        <p class="text-on-surface-variant text-base sm:text-lg max-w-xl">
          Your report is saved to the live community database and shown on the Community Reports page.
        </p>
      </header>

      <section class="bg-surface-container-low p-5 sm:p-8 md:p-12 rounded-xl shadow-sm space-y-8">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-3 md:col-span-2">
            <label class="font-label text-xs uppercase tracking-widest font-bold text-outline">Report Title</label>
            <input
              v-model="form.title"
              class="w-full bg-surface-container-high border-none rounded-lg px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary/20"
              type="text"
              placeholder="e.g. Fallen tree blocking summit trail"
            />
          </div>

          <div class="space-y-3 md:col-span-2">
            <label class="font-label text-xs uppercase tracking-widest font-bold text-outline">Details</label>
            <textarea
              v-model="form.description"
              rows="4"
              class="w-full bg-surface-container-high border-none rounded-lg px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary/20"
              placeholder="Describe what happened, current risk, and what hikers should do."
            ></textarea>
          </div>

          <div class="space-y-3">
            <label class="font-label text-xs uppercase tracking-widest font-bold text-outline">Hazard Type</label>
            <select v-model="form.hazardType" class="w-full bg-surface-container-high border-none rounded-lg px-4 py-3 text-on-surface">
              <option value="fire">Fire / Smoke</option>
              <option value="flood">Flood / Water Rise</option>
              <option value="storm">Weather / Mud / Storm</option>
              <option value="trail">Trail Obstacle</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div class="space-y-3">
            <label class="font-label text-xs uppercase tracking-widest font-bold text-outline">Severity</label>
            <select v-model="form.severity" class="w-full bg-surface-container-high border-none rounded-lg px-4 py-3 text-on-surface">
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
              <option value="extreme">Extreme</option>
            </select>
          </div>

          <div class="space-y-3 md:col-span-2">
            <label class="font-label text-xs uppercase tracking-widest font-bold text-outline">Location Name</label>
            <input
              v-model="form.locationName"
              class="w-full bg-surface-container-high border-none rounded-lg px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary/20"
              type="text"
              placeholder="e.g. Razorback Trail, Alpine National Park"
            />
          </div>

          <div class="space-y-3">
            <label class="font-label text-xs uppercase tracking-widest font-bold text-outline">Latitude</label>
            <input v-model="form.latitude" class="w-full bg-surface-container-high border-none rounded-lg px-4 py-3" type="number" step="0.000001" />
          </div>
          <div class="space-y-3">
            <label class="font-label text-xs uppercase tracking-widest font-bold text-outline">Longitude</label>
            <input v-model="form.longitude" class="w-full bg-surface-container-high border-none rounded-lg px-4 py-3" type="number" step="0.000001" />
          </div>

          <div class="space-y-3">
            <label class="font-label text-xs uppercase tracking-widest font-bold text-outline">Reporter Name (Optional)</label>
            <input v-model="form.reporterName" class="w-full bg-surface-container-high border-none rounded-lg px-4 py-3" type="text" placeholder="Anonymous Hiker" />
          </div>

          <div class="space-y-3">
            <label class="font-label text-xs uppercase tracking-widest font-bold text-outline">Image URL (Optional)</label>
            <input v-model="form.imageUrl" class="w-full bg-surface-container-high border-none rounded-lg px-4 py-3" type="url" placeholder="https://..." />
          </div>
        </div>

        <p v-if="submitError" class="text-sm font-semibold text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          {{ submitError }}
        </p>
        <p v-if="submitSuccess" class="text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3">
          {{ submitSuccess }}
        </p>

        <button
          class="w-full primary-gradient text-on-primary font-headline font-bold py-5 px-8 rounded-lg shadow-xl hover:opacity-95 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-60"
          :disabled="isSubmitting"
          @click="handleSubmit"
        >
          <span class="material-symbols-outlined">send</span>
          {{ isSubmitting ? 'Submitting...' : 'Submit Hazard Report' }}
        </button>
      </section>
    </main>

    <SiteFooter />
  </div>
</template>
