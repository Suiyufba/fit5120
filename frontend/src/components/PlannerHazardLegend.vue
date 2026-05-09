<script setup>
defineProps({
  layers: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <div class="hazard-legend">
    <p>Live Risk Layer</p>
    <div class="legend-items">
      <span v-for="(meta, id) in layers" :key="id" class="legend-item">
        <i :style="{ background: meta.color }"></i>{{ meta.label }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.hazard-legend {
  border: 1px solid rgba(31, 41, 51, 0.1);
  border-radius: 8px;
  padding: 0.78rem;
  background: rgba(255, 255, 255, 0.86);
}

.hazard-legend p {
  font-size: 0.68rem;
  font-weight: 800;
  color: #2e7d6b;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.legend-items {
  margin-top: 0.45rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.34rem;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  border: 1px solid #dce6df;
  border-radius: 999px;
  padding: 0.2rem 0.45rem;
  font-size: 0.72rem;
  color: #1f2933;
  background: #ffffff;
}

.legend-item i {
  display: inline-block;
  width: 0.48rem;
  height: 0.48rem;
  border-radius: 999px;
}
</style>
