<script setup>
defineProps({
  startInput: {
    type: String,
    default: '',
  },
  endInput: {
    type: String,
    default: '',
  },
  startPoint: {
    type: Object,
    default: null,
  },
  endPoint: {
    type: Object,
    default: null,
  },
  startLabel: {
    type: String,
    default: '',
  },
  endLabel: {
    type: String,
    default: '',
  },
  startSuggestions: {
    type: Array,
    default: () => [],
  },
  endSuggestions: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['focus-input', 'search-input', 'select-location'])

function formatPointLabel(label, point) {
  if (!point) return ''
  return label || 'Selected location'
}

function formatPointCoordinates(point) {
  if (!point) return ''
  return `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`
}
</script>

<template>
  <div class="planner-points">
    <div class="point-card">
      <p>Start</p>
      <input
        class="point-input"
        type="text"
        placeholder="Type a start location"
        :value="startInput"
        @focus="emit('focus-input', 'start')"
        @input="emit('search-input', { type: 'start', value: $event.target.value })"
      />
      <strong v-if="startPoint">{{ formatPointLabel(startLabel, startPoint) }}</strong>
      <span v-if="startPoint" class="point-coordinates">{{ formatPointCoordinates(startPoint) }}</span>
      <div v-if="startSuggestions.length" class="point-suggestions">
        <button
          v-for="item in startSuggestions"
          :key="`start-${item.lat}-${item.lng}`"
          type="button"
          class="point-suggestion"
          @click="emit('select-location', { type: 'start', location: item })"
        >
          {{ item.displayName }}
        </button>
      </div>
    </div>
    <div class="point-card">
      <p>Destination</p>
      <input
        class="point-input"
        type="text"
        placeholder="Type a destination"
        :value="endInput"
        @focus="emit('focus-input', 'end')"
        @input="emit('search-input', { type: 'end', value: $event.target.value })"
      />
      <strong v-if="endPoint">{{ formatPointLabel(endLabel, endPoint) }}</strong>
      <span v-if="endPoint" class="point-coordinates">{{ formatPointCoordinates(endPoint) }}</span>
      <div v-if="endSuggestions.length" class="point-suggestions">
        <button
          v-for="item in endSuggestions"
          :key="`end-${item.lat}-${item.lng}`"
          type="button"
          class="point-suggestion"
          @click="emit('select-location', { type: 'end', location: item })"
        >
          {{ item.displayName }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.planner-points {
  display: grid;
  gap: 0.55rem;
}

.point-card {
  border: 1px solid rgba(31, 41, 51, 0.1);
  border-radius: 8px;
  padding: 0.82rem;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 10px 24px rgba(17, 24, 39, 0.05);
  display: grid;
  gap: 0.38rem;
  position: relative;
}

.point-card p {
  text-transform: uppercase;
  letter-spacing: 0.07em;
  font-size: 0.68rem;
  color: #5f6b7a;
  font-weight: 700;
}

.point-card strong {
  display: block;
  color: #111827;
  font-size: 0.86rem;
  word-break: break-word;
}

.point-coordinates {
  color: #8a94a3;
  font-size: 0.74rem;
}

.point-input {
  border: 1px solid rgba(31, 41, 51, 0.12);
  border-radius: 8px;
  padding: 0.58rem 0.68rem;
  background: #ffffff;
  color: #1f2933;
  font-size: 0.82rem;
}

.point-input:focus {
  outline: none;
  border-color: #1f6e57;
  box-shadow: 0 0 0 2px rgba(31, 110, 87, 0.12);
}

.point-suggestions {
  display: grid;
  gap: 0.25rem;
  max-height: 140px;
  overflow: auto;
  padding-right: 0.1rem;
}

.point-suggestion {
  border: 1px solid #d7e5dd;
  border-radius: 0.5rem;
  background: #ffffff;
  color: #1f2933;
  text-align: left;
  font-size: 0.76rem;
  padding: 0.36rem 0.45rem;
}
</style>
