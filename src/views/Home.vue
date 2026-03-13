<script setup>
</script>

<template>
  <div class="home">
    <section class="hero">
      <div class="container hero-content">
        <div class="hero-badge">Protecting Young Australians</div>
        <h1>Your Skin Deserves <span class="highlight">Smart Protection</span></h1>
        <p class="hero-desc">
          Australia has one of the highest rates of skin cancer in the world.
          SunSafe AU helps teenagers understand UV risks and take action to protect their skin every day.
        </p>
        <div class="hero-actions">
          <router-link to="/track-uv" class="btn btn-primary">
            Track UV Levels →
          </router-link>
          <router-link to="/raising-awareness" class="btn btn-outline">
            Learn More
          </router-link>
        </div>
        <div class="hero-stats">
          <div class="stat">
            <span class="stat-number">2 in 3</span>
            <span class="stat-label">Australians diagnosed with skin cancer by 70</span>
          </div>
          <div class="stat">
            <span class="stat-number">95%</span>
            <span class="stat-label">of skin cancers caused by UV radiation</span>
          </div>
          <div class="stat">
            <span class="stat-number">#1</span>
            <span class="stat-label">Most common cancer in Australia</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero {
  min-height: calc(100vh - 72px);
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #FFF7ED 0%, #FEF3C7 50%, #DBEAFE 100%);
  position: relative;
  overflow: hidden;
}

.hero::before {
  content: '';
  position: absolute;
  top: -40%;
  right: -20%;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(255, 107, 53, 0.15) 0%, transparent 70%);
  border-radius: 50%;
}

.hero-content {
  position: relative;
  z-index: 1;
  padding: 80px 0;
  max-width: 800px;
}

.hero-badge {
  display: inline-block;
  padding: 6px 16px;
  background: rgba(255, 107, 53, 0.1);
  color: var(--color-primary);
  font-weight: 600;
  font-size: 0.875rem;
  border-radius: 100px;
  margin-bottom: 24px;
  border: 1px solid rgba(255, 107, 53, 0.2);
}

.hero h1 {
  font-size: 3.5rem;
  font-weight: 800;
  line-height: 1.15;
  margin-bottom: 20px;
  color: var(--color-secondary);
}

.highlight {
  color: var(--color-primary);
}

.hero-desc {
  font-size: 1.2rem;
  color: var(--color-text-secondary);
  line-height: 1.7;
  margin-bottom: 36px;
  max-width: 600px;
}

.hero-actions {
  display: flex;
  gap: 16px;
  margin-bottom: 60px;
}

.btn {
  display: inline-flex;
  align-items: center;
  padding: 14px 28px;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.2s;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
  box-shadow: 0 4px 14px rgba(255, 107, 53, 0.35);
}

.btn-primary:hover {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(255, 107, 53, 0.4);
}

.btn-outline {
  background: transparent;
  color: var(--color-secondary);
  border: 2px solid var(--color-border);
}

.btn-outline:hover {
  border-color: var(--color-secondary);
  background: rgba(27, 73, 101, 0.05);
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  padding-top: 40px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-number {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--color-primary);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

@media (max-width: 768px) {
  .hero h1 {
    font-size: 2.25rem;
  }

  .hero-actions {
    flex-direction: column;
  }

  .hero-stats {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .hero-content {
    padding: 40px 0;
  }
}
</style>
