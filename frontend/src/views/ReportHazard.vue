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
    <main class="report-page max-w-3xl mx-auto px-4 sm:px-6 py-10 md:py-20">
      <header class="report-hero mb-8 md:mb-10 text-center md:text-left">
        <p class="u-kicker mb-4">Community safety signal</p>
        <h1 class="font-display text-5xl sm:text-6xl font-semibold tracking-[-0.015em] mb-4 text-balance">Submit a Community Hazard Report</h1>
        <p class="text-base sm:text-lg max-w-xl">
          Your report is saved to the live community database and shown on the Community Reports page.
        </p>
      </header>

      <section class="report-card p-5 sm:p-8 md:p-12 space-y-8">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-3 md:col-span-2">
            <label class="font-label text-xs uppercase tracking-widest font-bold text-outline">Report Title</label>
            <input
              v-model="form.title"
              class="report-input w-full px-4 py-3"
              type="text"
              placeholder="e.g. Fallen tree blocking summit trail"
            />
          </div>

          <div class="space-y-3 md:col-span-2">
            <label class="font-label text-xs uppercase tracking-widest font-bold text-outline">Details</label>
            <textarea
              v-model="form.description"
              rows="4"
              class="report-input w-full px-4 py-3"
              placeholder="Describe what happened, current risk, and what hikers should do."
            ></textarea>
          </div>

          <div class="space-y-3">
            <label class="font-label text-xs uppercase tracking-widest font-bold text-outline">Hazard Type</label>
            <select v-model="form.hazardType" class="report-input w-full px-4 py-3">
              <option value="fire">Fire / Smoke</option>
              <option value="flood">Flood / Water Rise</option>
              <option value="storm">Weather / Mud / Storm</option>
              <option value="trail">Trail Obstacle</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div class="space-y-3">
            <label class="font-label text-xs uppercase tracking-widest font-bold text-outline">Severity</label>
            <select v-model="form.severity" class="report-input w-full px-4 py-3">
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
              class="report-input w-full px-4 py-3"
              type="text"
              placeholder="e.g. Razorback Trail, Alpine National Park"
            />
          </div>

          <div class="space-y-3">
            <label class="font-label text-xs uppercase tracking-widest font-bold text-outline">Latitude</label>
            <input v-model="form.latitude" class="report-input w-full px-4 py-3" type="number" step="0.000001" />
          </div>
          <div class="space-y-3">
            <label class="font-label text-xs uppercase tracking-widest font-bold text-outline">Longitude</label>
            <input v-model="form.longitude" class="report-input w-full px-4 py-3" type="number" step="0.000001" />
          </div>

          <div class="space-y-3">
            <label class="font-label text-xs uppercase tracking-widest font-bold text-outline">Reporter Name (Optional)</label>
            <input v-model="form.reporterName" class="report-input w-full px-4 py-3" type="text" placeholder="Anonymous Hiker" />
          </div>

          <div class="space-y-3">
            <label class="font-label text-xs uppercase tracking-widest font-bold text-outline">Image URL (Optional)</label>
            <input v-model="form.imageUrl" class="report-input w-full px-4 py-3" type="url" placeholder="https://..." />
          </div>
        </div>

        <p v-if="submitError" class="text-sm font-semibold text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          {{ submitError }}
        </p>
        <p v-if="submitSuccess" class="text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3">
          {{ submitSuccess }}
        </p>

        <button
          class="w-full hs-button-primary py-5 px-8 flex disabled:opacity-60"
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

<style scoped>
.report-page {
  position: relative;
}

.report-hero {
  border: 1px solid rgba(33, 72, 59, 0.12);
  border-radius: 1.25rem;
  background:
    linear-gradient(110deg, rgba(23, 59, 49, 0.93), rgba(23, 59, 49, 0.56)),
    var(--hs-hero-image) center/cover;
  padding: clamp(1.4rem, 4vw, 3rem);
  color: #fffaf2;
  box-shadow: var(--hs-shadow-soft);
}

.report-hero :deep(.u-kicker),
.report-hero h1 {
  color: #fffaf2;
}

.report-hero p {
  color: rgba(255, 250, 242, 0.76);
}

.report-card {
  border: 1px solid rgba(33, 72, 59, 0.12);
  border-radius: 1.25rem;
  background: rgba(255, 250, 242, 0.92);
  box-shadow: var(--hs-shadow-soft);
}

.report-input {
  border: 1px solid rgba(33, 72, 59, 0.14);
  border-radius: 0.85rem;
  background: #ffffff;
  color: #173b31;
}
</style>
