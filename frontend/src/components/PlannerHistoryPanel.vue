<script setup>
defineProps({
  historyItems: {
    type: Array,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  clearingAll: {
    type: Boolean,
    default: false,
  },
  deletingId: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['refresh', 'clear-all', 'clear-item', 'select-item'])

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
  <section class="history-panel">
    <div class="history-panel__head">
      <p>Your Route History</p>
      <div class="history-actions">
        <button class="history-clear-all-btn" :disabled="clearingAll || !historyItems.length" @click="emit('clear-all')">
          {{ clearingAll ? 'Clearing...' : 'Clear All' }}
        </button>
        <button class="history-refresh-btn" :disabled="loading" @click="emit('refresh')">
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>
    </div>
    <p v-if="!historyItems.length && !loading" class="history-empty">
      No route history yet. Plan a route to save your first record.
    </p>
    <div v-else class="history-list">
      <article
        v-for="item in historyItems"
        :key="item.id"
        class="history-item"
      >
        <button
          type="button"
          class="history-item__main"
          @click="emit('select-item', item)"
        >
          <strong>
            {{ item.planPayload?.recommendedRoute?.distanceKm?.toFixed?.(1) || '0.0' }} km ·
            {{ formatDuration(item.planPayload?.recommendedRoute?.durationMin || 0) }}
          </strong>
          <span>
            {{ item.planPayload?.recommendedRoute?.riskLevel || 'Low' }}
          </span>
          <small>{{ new Date(item.createdAt).toLocaleString() }}</small>
        </button>
        <button
          type="button"
          class="history-item__clear"
          :disabled="deletingId === String(item.id)"
          @click.stop="emit('clear-item', item.id)"
        >
          {{ deletingId === String(item.id) ? 'Clearing...' : 'Clear' }}
        </button>
      </article>
    </div>
  </section>
</template>

<style scoped>
.history-panel {
  border: 1px solid rgba(33, 72, 59, 0.12);
  border-radius: 1rem;
  padding: 0.78rem;
  background: rgba(255, 255, 255, 0.86);
  display: grid;
  gap: 0.45rem;
}

.history-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
}

.history-panel__head p {
  font-size: 0.68rem;
  font-weight: 800;
  color: #3d6658;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.history-refresh-btn {
  border: 1px solid #bfd1c8;
  border-radius: 999px;
  background: #ffffff;
  color: #2f5448;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
}

.history-actions {
  display: inline-flex;
  gap: 0.3rem;
}

.history-clear-all-btn {
  border: 1px solid #e2b8b1;
  border-radius: 999px;
  background: #fff3f1;
  color: #8e2f25;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
}

.history-clear-all-btn:disabled,
.history-refresh-btn:disabled {
  opacity: 0.6;
}

.history-empty {
  font-size: 0.78rem;
  color: #45645b;
}

.history-list {
  display: grid;
  gap: 0.35rem;
  max-height: 180px;
  overflow: auto;
  padding-right: 0.15rem;
}

.history-item {
  border: 1px solid #dce6df;
  border-radius: 0.58rem;
  background: #ffffff;
  color: #27493f;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.45rem;
  align-items: center;
}

.history-item__main {
  border: 0;
  background: transparent;
  text-align: left;
  padding: 0.45rem 0.55rem;
  display: grid;
  gap: 0.1rem;
  color: inherit;
}

.history-item__main strong {
  font-size: 0.78rem;
}

.history-item__main span {
  font-size: 0.74rem;
  color: #49655d;
}

.history-item__main small {
  font-size: 0.68rem;
  color: #6a7f78;
}

.history-item__clear {
  border: 1px solid #e2b8b1;
  border-radius: 999px;
  background: #fff3f1;
  color: #8e2f25;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.22rem 0.5rem;
  margin-right: 0.55rem;
}

.history-item__clear:disabled {
  opacity: 0.6;
}
</style>
