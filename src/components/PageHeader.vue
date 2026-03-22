<script setup>
defineProps({
  badge: String,
  title: String,
  description: String
})
</script>

<template>
  <section class="page-header">
    <div class="container">
      <span class="page-badge">{{ badge }}</span>
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
    </div>
  </section>
</template>

<style scoped>
.page-header {
  background: linear-gradient(135deg, var(--color-header-start) 0%, var(--color-header-end) 100%);
  padding: 60px 0;
  color: white;
}

.page-badge {
  display: inline-block;
  padding: 4px 14px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 100px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.page-header h1 {
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 12px;
}

.page-header p {
  font-size: 1.1rem;
  opacity: 0.85;
}

@media (max-width: 768px) {
  .page-header h1 {
    font-size: 2rem;
  }
  
  .page-header {
    padding: 40px 0;
  }
}
</style>