<script setup>
defineProps({
  routeChoices: {
    type: Array,
    required: true,
  },
  selectedRouteId: {
    type: String,
    required: true,
  },
  summary: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['select-route', 'view-details'])

function formatDuration(durationMin) {
  const mins = Math.max(Number(durationMin) || 0, 0)
  if (mins < 90) return `${Math.round(mins)} min`

  const totalHours = mins / 60
  if (totalHours < 24) {
    const hours = Math.floor(totalHours)
    const remainingMin = Math.round(mins % 60)
    if (!remainingMin) return `${hours} h`
    return `${hours} h ${remainingMin} min`
  }

  const days = Math.floor(totalHours / 24)
  const hours = Math.round(totalHours % 24)
  return hours ? `${days} d ${hours} h` : `${days} d`
}
</script>

<template>
  <section v-if="summary" class="planner-summary">
    <p class="summary-kicker">Choose One Route</p>
    <div class="route-options">
      <button
        v-for="option in routeChoices"
        :key="option.id"
        type="button"
        class="route-option-card"
        :class="{ 'route-option-card--active': selectedRouteId === option.id }"
        @click="emit('select-route', option.id)"
      >
        <p class="route-option-card__title">{{ option.optionLabel }}</p>
        <p class="route-option-card__meta">
          {{ option.distanceKm.toFixed(1) }} km · {{ formatDuration(option.durationMin) }}
        </p>
        <p class="route-option-card__meta">Difficulty: {{ option.slotDifficulty || option.difficulty }}</p>
        <p class="route-option-card__risk">{{ option.riskLevel }}</p>
      </button>
    </div>
    <div class="summary-grid">
      <article><span>Distance</span><strong>{{ summary.distance }}</strong></article>
      <article><span>How Long It Takes</span><strong>{{ summary.duration }}</strong></article>
      <article><span>Difficulty</span><strong>{{ summary.difficulty }}</strong></article>
      <article><span>Risk</span><strong>{{ summary.risk }}</strong></article>
    </div>

    <div class="go-tag" :class="{ 'go-tag--danger': summary.isDangerous }">
      {{ summary.safetyStatus }}
    </div>
    <aside class="ai-reminder-window" aria-label="AI assistant route reminder">
      <div class="ai-reminder-window__head">
        <span class="ai-reminder-window__badge">AI</span>
        <div>
          <p class="ai-reminder-window__title">AI Assistant Reminder</p>
          <p class="ai-reminder-window__meta">Generated from the latest route planning data</p>
        </div>
      </div>
      <p class="ai-reminder-window__body">{{ summary.intro }}</p>
    </aside>
    <button class="primary-btn" @click="emit('view-details')">View Route Details</button>
  </section>
</template>

<style scoped>
.planner-summary {
  border: 1px solid rgba(33, 72, 59, 0.12);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.9);
  padding: 0.9rem;
  display: grid;
  gap: 0.7rem;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.012), 0 2px 8px rgba(0,0,0,0.03), 0 10px 24px rgba(25,56,45,0.05);
}

.summary-kicker {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.67rem;
  color: #3c6558;
  font-weight: 800;
}

.route-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.45rem;
}

.route-option-card {
  border: 1px solid rgba(33, 72, 59, 0.12);
  border-radius: 0.9rem;
  background: #fffaf2;
  color: #2f4f45;
  text-align: left;
  padding: 0.5rem;
  transition: all 0.2s ease;
}

.route-option-card--active {
  border-color: rgba(33, 72, 59, 0.34);
  background: #f2f7ee;
  box-shadow: 0 0 0 3px rgba(46, 125, 107, 0.13);
}

.route-option-card__title {
  font-size: 0.78rem;
  font-weight: 800;
}

.route-option-card__meta {
  margin-top: 0.1rem;
  font-size: 0.7rem;
  color: #456359;
}

.route-option-card__risk {
  margin-top: 0.2rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: #33564b;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.summary-grid article {
  border: 1px solid #e0e9e2;
  border-radius: 0.6rem;
  padding: 0.5rem;
  background: #fbfefc;
}

.summary-grid span {
  font-size: 0.64rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #4b6860;
  font-weight: 700;
}

.summary-grid strong {
  display: block;
  margin-top: 0.2rem;
  color: #1f3931;
}

.go-tag {
  display: inline-flex;
  width: fit-content;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  background: #dbf5ea;
  color: #166645;
  font-weight: 800;
  font-size: 0.78rem;
}

.go-tag--danger {
  background: #ffe3e3;
  color: #a20f0f;
  border: 1px solid #ff8a8a;
  box-shadow: 0 0 0 2px rgba(214, 31, 31, 0.16);
}

.ai-reminder-window {
  border: 1px solid rgba(30, 91, 72, 0.18);
  border-left: 4px solid #2f7d60;
  border-radius: 0.75rem;
  background:
    linear-gradient(135deg, rgba(246, 252, 247, 0.98), rgba(255, 250, 242, 0.96));
  padding: 0.7rem 0.75rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82), 0 8px 18px rgba(31, 57, 49, 0.06);
}

.ai-reminder-window__head {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
}

.ai-reminder-window__badge {
  flex: 0 0 auto;
  display: inline-grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 999px;
  background: #21483b;
  color: #fffaf2;
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0;
  box-shadow: 0 0 0 3px rgba(47, 125, 96, 0.12);
}

.ai-reminder-window__title {
  color: #1f3931;
  font-size: 0.85rem;
  line-height: 1.2;
  font-weight: 900;
}

.ai-reminder-window__meta {
  margin-top: 0.12rem;
  color: #5c746b;
  font-size: 0.68rem;
  line-height: 1.25;
  font-weight: 700;
}

.ai-reminder-window__body {
  margin-top: 0.55rem;
  color: #34534a;
  font-size: 0.84rem;
  line-height: 1.48;
}

.primary-btn {
  border: 0;
  border-radius: 999px;
  padding: 0.82rem 1rem;
  font-weight: 800;
  min-height: 3rem;
  line-height: 1.1;
  background: linear-gradient(135deg, #173b31, #2f604e 68%, #7f9b75);
  color: #fffaf2;
  box-shadow: 0 14px 30px rgba(23, 59, 49, 0.2);
}

@media (max-width: 980px) {
  .route-options {
    grid-template-columns: 1fr;
  }
}
</style>
