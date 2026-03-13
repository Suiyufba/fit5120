<script setup>
</script>

<template>
  <div class="page">
    <section class="page-header">
      <div class="container">
        <span class="page-badge">Education</span>
        <h1>Raising Awareness</h1>
        <p>Understanding the impact of UV radiation on young Australians.</p>
      </div>
    </section>
    <div class="container page-body">
      <div class="coming-soon">
        <span class="cs-icon">📚</span>
        <h2>Coming Soon</h2>
        <p>We're building educational resources about UV risks, skin cancer statistics, and how to stay informed. Check back soon!</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  background: linear-gradient(135deg, #1B4965 0%, #2D6A8F 100%);
  padding: 60px 0;
  color: white;
}
.page-badge {
  display: inline-block;
  padding: 4px 14px;
  background: rgba(255,255,255,0.15);
  border-radius: 100px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.page-header h1 { font-size: 2.5rem; font-weight: 800; margin-bottom: 12px; }
.page-header p { font-size: 1.1rem; opacity: 0.85; }
.page-body { padding: 60px 0; }
.coming-soon {
  text-align: center;
  padding: 80px 20px;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}
.cs-icon { font-size: 3rem; margin-bottom: 16px; display: block; }
.coming-soon h2 { font-size: 1.5rem; margin-bottom: 12px; color: var(--color-secondary); }
.coming-soon p { color: var(--color-text-secondary); max-width: 400px; margin: 0 auto; }
</style>
