<script setup>
defineProps({
  canPlan: {
    type: Boolean,
    required: true,
  },
  loading: {
    type: Boolean,
    required: true,
  },
  hasSelection: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['plan-route', 'reset'])
</script>

<template>
  <div class="planner-actions">
    <button class="primary-btn" :disabled="!canPlan" @click="emit('plan-route')">
      {{ loading ? 'Planning...' : 'Plan Safe Route' }}
    </button>
    <button class="ghost-btn" @click="emit('reset')">Reset Points</button>
  </div>
</template>

<style scoped>
.planner-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.primary-btn,
.ghost-btn {
  border: 0;
  border-radius: 999px;
  padding: 0.82rem 1rem;
  font-weight: 800;
  min-height: 3rem;
  line-height: 1.1;
}

.primary-btn {
  background: #ff385c;
  color: #ffffff;
  box-shadow: 0 14px 30px rgba(255, 56, 92, 0.2);
}

.primary-btn:disabled {
  opacity: 0.6;
}

.ghost-btn {
  border: 1px solid rgba(31, 41, 51, 0.12);
  background: rgba(255, 255, 255, 0.86);
  color: #111827;
}
</style>
