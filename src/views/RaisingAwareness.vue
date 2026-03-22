<script setup>
import { ref } from 'vue'

const activeTab = ref('facts')

const myths = [
  {
    myth: 'You can\'t get sunburnt on a cloudy day',
    fact: 'Up to 80% of UV radiation can penetrate through clouds. You can still get significant UV exposure even when it\'s overcast.',
    icon: '☁️'
  },
  {
    myth: 'Dark skin doesn\'t need sun protection',
    fact: 'While darker skin has more melanin, it still absorbs UV radiation and is susceptible to sun damage and skin cancer.',
    icon: '🧑'
  },
  {
    myth: 'A base tan protects you from sunburn',
    fact: 'A tan is actually a sign of skin damage. It only provides an SPF equivalent of about 3, which is far from adequate protection.',
    icon: '🏖️'
  },
  {
    myth: 'You only need sunscreen at the beach',
    fact: 'UV radiation is present any time you\'re outdoors — driving, walking, playing sport. UV exposure is cumulative over your lifetime.',
    icon: '🚗'
  },
  {
    myth: 'Sunscreen is all the protection you need',
    fact: 'Sunscreen is just one part of sun protection. Hats, protective clothing, shade and timing your outdoor activities are equally important.',
    icon: '🧴'
  },
  {
    myth: 'You need lots of sun for Vitamin D',
    fact: 'Most Australians get enough Vitamin D through incidental sun exposure. Just a few minutes of sun on a small area of skin is enough.',
    icon: '☀️'
  }
]

const skinTypes = [
  { type: 'Type I', desc: 'Very fair skin, freckles, red/blonde hair', burn: 'Always burns', tan: 'Never tans', risk: 'Very High', color: '#FDECEA' },
  { type: 'Type II', desc: 'Fair skin, light hair, blue/green eyes', burn: 'Burns easily', tan: 'Tans minimally', risk: 'High', color: '#FFF3E0' },
  { type: 'Type III', desc: 'Medium skin, brown hair, hazel eyes', burn: 'Sometimes burns', tan: 'Tans gradually', risk: 'Moderate-High', color: '#FFF8E1' },
  { type: 'Type IV', desc: 'Olive skin, dark brown hair/eyes', burn: 'Rarely burns', tan: 'Tans easily', risk: 'Moderate', color: '#F1F8E9' },
  { type: 'Type V', desc: 'Brown skin, dark hair/eyes', burn: 'Very rarely burns', tan: 'Tans darkly', risk: 'Lower', color: '#E8F5E9' },
  { type: 'Type VI', desc: 'Dark brown/black skin and eyes', burn: 'Almost never burns', tan: 'Deeply pigmented', risk: 'Low (but not zero)', color: '#E0F2F1' }
]
</script>

<template>
  <div class="page">
    <section class="page-header">
      <div class="container">
        <span class="page-badge">Education</span>
        <h1>Sun Safety Hub</h1>
        <p>Understanding UV radiation and its impact on young Australians.</p>
      </div>
    </section>

    <div class="container page-body">
      <!-- Key Stats Banner -->
      <div class="stats-banner">
        <div class="stat-card">
          <span class="stat-icon">🇦🇺</span>
          <span class="stat-number">2 in 3</span>
          <span class="stat-desc">Australians will be diagnosed with skin cancer by age 70</span>
        </div>
        <div class="stat-card">
          <span class="stat-icon">☀️</span>
          <span class="stat-number">95%</span>
          <span class="stat-desc">of melanomas are caused by overexposure to UV radiation</span>
        </div>
        <div class="stat-card">
          <span class="stat-icon">👦</span>
          <span class="stat-number">5+</span>
          <span class="stat-desc">Sunburns in youth doubles melanoma risk later in life</span>
        </div>
        <div class="stat-card">
          <span class="stat-icon">📊</span>
          <span class="stat-number">17,000+</span>
          <span class="stat-desc">New melanoma cases diagnosed in Australia annually</span>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="tabs">
        <button
          :class="['tab-btn', { active: activeTab === 'facts' }]"
          @click="activeTab = 'facts'"
        >
          UV Facts
        </button>
        <button
          :class="['tab-btn', { active: activeTab === 'myths' }]"
          @click="activeTab = 'myths'"
        >
          Myths vs Facts
        </button>
        <button
          :class="['tab-btn', { active: activeTab === 'skin-types' }]"
          @click="activeTab = 'skin-types'"
        >
          Skin Types & Risk
        </button>
      </div>

      <!-- UV Facts Tab -->
      <div v-if="activeTab === 'facts'" class="tab-content">
        <div class="uv-info-grid">
          <div class="info-card">
            <div class="info-icon">🔬</div>
            <h3>What is UV Radiation?</h3>
            <p>Ultraviolet (UV) radiation is invisible energy from the sun. There are three types: UVA (aging), UVB (burning), and UVC (blocked by ozone). Both UVA and UVB reach Earth's surface and can damage your skin's DNA.</p>
          </div>
          <div class="info-card">
            <div class="info-icon">📏</div>
            <h3>The UV Index Scale</h3>
            <p>The UV Index ranges from 0 to 11+. In Australia, it frequently reaches 10-14 in summer. Protection is recommended when the UV Index is 3 or above — which can be most of the year in many parts of Australia.</p>
          </div>
          <div class="info-card">
            <div class="info-icon">⏰</div>
            <h3>Peak UV Hours</h3>
            <p>UV radiation is strongest between 10am and 2pm (11am–3pm during daylight saving). During these hours, UV intensity can be 2-3 times higher than early morning or late afternoon.</p>
          </div>
          <div class="info-card">
            <div class="info-icon">🌏</div>
            <h3>Why Australia?</h3>
            <p>Australia sits beneath a thinned ozone layer, has many clear-sky days, and a largely fair-skinned population. This combination makes Australians particularly vulnerable to UV damage.</p>
          </div>
          <div class="info-card">
            <div class="info-icon">🧬</div>
            <h3>How UV Damages Skin</h3>
            <p>UV radiation causes direct DNA damage in skin cells. Over time, accumulated damage can lead to mutations that cause skin cancer. It also breaks down collagen, leading to premature aging.</p>
          </div>
          <div class="info-card">
            <div class="info-icon">👁️</div>
            <h3>UV & Eye Health</h3>
            <p>UV exposure doesn't just affect your skin — it can also damage your eyes. Long-term exposure increases the risk of cataracts and other eye conditions. Always wear UV-protective sunglasses.</p>
          </div>
        </div>
      </div>

      <!-- Myths vs Facts Tab -->
      <div v-if="activeTab === 'myths'" class="tab-content">
        <div class="myths-grid">
          <div v-for="(item, index) in myths" :key="index" class="myth-card">
            <div class="myth-icon">{{ item.icon }}</div>
            <div class="myth-section">
              <span class="myth-label">Myth</span>
              <p class="myth-text">"{{ item.myth }}"</p>
            </div>
            <div class="fact-section">
              <span class="fact-label">Fact</span>
              <p class="fact-text">{{ item.fact }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Skin Types Tab -->
      <div v-if="activeTab === 'skin-types'" class="tab-content">
        <p class="section-intro">
          The Fitzpatrick scale classifies skin types based on how they respond to UV exposure. Knowing your skin type helps you understand your risk level and protection needs. <strong>Everyone should protect their skin, regardless of type.</strong>
        </p>
        <div class="skin-types-grid">
          <div
            v-for="skin in skinTypes"
            :key="skin.type"
            class="skin-card"
            :style="{ background: skin.color }"
          >
            <h4>{{ skin.type }}</h4>
            <p class="skin-desc">{{ skin.desc }}</p>
            <div class="skin-details">
              <div class="skin-detail">
                <span class="detail-label">Burns</span>
                <span>{{ skin.burn }}</span>
              </div>
              <div class="skin-detail">
                <span class="detail-label">Tans</span>
                <span>{{ skin.tan }}</span>
              </div>
              <div class="skin-detail">
                <span class="detail-label">UV Risk</span>
                <span class="risk-tag">{{ skin.risk }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- CTA Section -->
      <div class="cta-section">
        <h2>Ready to Take Action?</h2>
        <p>Check today's UV levels in your area and learn how to protect yourself.</p>
        <div class="cta-actions">
          <router-link to="/track-uv" class="btn btn-primary">Check UV Index →</router-link>
          <router-link to="/prevention" class="btn btn-outline">Prevention Tips</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  background: linear-gradient(135deg, var(--color-header-start) 0%, var(--color-header-mid) 50%, var(--color-header-end) 100%);
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

/* Stats Banner */
.stats-banner {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 48px;
}
.stat-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 28px 20px;
  text-align: center;
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.stat-icon { font-size: 2rem; }
.stat-number {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--color-primary);
}
.stat-desc {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 4px;
  background: #F1F5F9;
  border-radius: var(--radius-md);
  padding: 4px;
  margin-bottom: 32px;
}
.tab-btn {
  flex: 1;
  padding: 12px 20px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}
.tab-btn:hover { color: var(--color-text); }
.tab-btn.active {
  background: white;
  color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

/* UV Facts Grid */
.uv-info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}
.info-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 32px 24px;
  box-shadow: var(--shadow-md);
  transition: transform 0.2s, box-shadow 0.2s;
}
.info-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}
.info-icon { font-size: 2rem; margin-bottom: 16px; }
.info-card h3 {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-secondary);
  margin-bottom: 12px;
}
.info-card p {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  line-height: 1.7;
}

/* Myths Grid */
.myths-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}
.myth-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 28px;
  box-shadow: var(--shadow-md);
  transition: transform 0.2s;
}
.myth-card:hover { transform: translateY(-3px); }
.myth-icon { font-size: 2rem; margin-bottom: 16px; }
.myth-section {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}
.myth-label {
  display: inline-block;
  padding: 2px 10px;
  background: #FEE2E2;
  color: #DC2626;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 100px;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.myth-text {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  font-style: italic;
}
.fact-label {
  display: inline-block;
  padding: 2px 10px;
  background: #D1FAE5;
  color: #059669;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 100px;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.fact-text {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

/* Skin Types */
.section-intro {
  font-size: 1rem;
  color: var(--color-text-secondary);
  line-height: 1.7;
  margin-bottom: 28px;
  max-width: 700px;
}
.skin-types-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
.skin-card {
  border-radius: var(--radius-lg);
  padding: 24px;
  border: 1px solid var(--color-border);
  transition: transform 0.2s;
}
.skin-card:hover { transform: translateY(-3px); }
.skin-card h4 {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-secondary);
  margin-bottom: 6px;
}
.skin-desc {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin-bottom: 16px;
}
.skin-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.skin-detail {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: var(--color-text);
}
.detail-label {
  font-weight: 600;
  color: var(--color-text-secondary);
}
.risk-tag {
  font-weight: 600;
  color: var(--color-primary);
}

/* CTA */
.cta-section {
  margin-top: 64px;
  text-align: center;
  padding: 60px 40px;
  background: linear-gradient(135deg, rgba(255, 107, 53, 0.08) 0%, rgba(255, 209, 102, 0.08) 100%);
  border-radius: var(--radius-xl);
}
.cta-section h2 {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--color-secondary);
  margin-bottom: 12px;
}
.cta-section p {
  color: var(--color-text-secondary);
  margin-bottom: 28px;
  font-size: 1.05rem;
}
.cta-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
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

@media (max-width: 768px) {
  .stats-banner { grid-template-columns: repeat(2, 1fr); }
  .uv-info-grid { grid-template-columns: 1fr; }
  .myths-grid { grid-template-columns: 1fr; }
  .skin-types-grid { grid-template-columns: 1fr; }
  .tabs { flex-direction: column; }
  .cta-actions { flex-direction: column; align-items: center; }
  .page-header h1 { font-size: 2rem; }
}
</style>
