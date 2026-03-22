<script setup>
import { ref } from 'vue'

const expandedFaq = ref(null)

function toggleFaq(index) {
  expandedFaq.value = expandedFaq.value === index ? null : index
}

const protectionMethods = [
  {
    icon: '🧴',
    title: 'Sunscreen',
    subtitle: 'Your daily shield',
    tips: [
      'Use SPF 50+ broad-spectrum sunscreen',
      'Apply 20 minutes before going outdoors',
      'Reapply every 2 hours, or after swimming/sweating',
      'Use about 1 teaspoon for your face, 1 tablespoon per limb',
      'Don\'t forget ears, neck, feet, and lips'
    ],
    color: '#FFF7ED'
  },
  {
    icon: '👒',
    title: 'Hats & Clothing',
    subtitle: 'Cover up smart',
    tips: [
      'Wear a broad-brimmed hat (7.5cm+ brim)',
      'Choose UPF 50+ rated clothing when possible',
      'Dark, tightly woven fabrics offer better protection',
      'Long sleeves and collared shirts are ideal',
      'Rash vests / swim shirts at the pool or beach'
    ],
    color: '#EFF6FF'
  },
  {
    icon: '🕶️',
    title: 'Sunglasses',
    subtitle: 'Protect your eyes',
    tips: [
      'Choose sunglasses labelled UV 400 or Category 3/4',
      'Wrap-around styles block peripheral UV rays',
      'Bigger lenses = more coverage',
      'Kids need quality sunglasses too',
      'Polarised lenses reduce glare but check UV rating'
    ],
    color: '#F0FDF4'
  },
  {
    icon: '🌳',
    title: 'Seek Shade',
    subtitle: 'Stay protected outdoors',
    tips: [
      'Use trees, shelters, umbrellas, or canopies',
      'Remember UV can reflect off water, sand, and concrete',
      'Shade is most important between 10am–2pm',
      'Create your own shade with a portable umbrella',
      'Plan outdoor activities around shade availability'
    ],
    color: '#FEFCE8'
  },
  {
    icon: '⏰',
    title: 'Timing',
    subtitle: 'Plan your day around UV',
    tips: [
      'Schedule outdoor activities before 10am or after 3pm',
      'Check the UV Index daily using our UV Tracker',
      'UV can be high even on cool or cloudy days',
      'In summer, UV is dangerous from early morning',
      'Be extra cautious near water, snow, or at altitude'
    ],
    color: '#FDF2F8'
  },
  {
    icon: '📱',
    title: 'Stay Informed',
    subtitle: 'Knowledge is protection',
    tips: [
      'Check the UV Index on our UV Tracker before heading out',
      'Set reminders to reapply sunscreen',
      'Learn to recognise signs of sun damage',
      'Monitor moles for changes (ABCDE rule)',
      'Schedule annual skin checks with your GP'
    ],
    color: '#F5F3FF'
  }
]

const faqs = [
  {
    q: 'How much sunscreen should I actually use?',
    a: 'For full body coverage, you need about 35ml (7 teaspoons) — that\'s roughly 1 teaspoon per limb, 1 for front torso, 1 for back, and 1 for face/neck. Most people only apply 25-50% of what\'s needed.'
  },
  {
    q: 'Is SPF 50 twice as good as SPF 25?',
    a: 'Not exactly. SPF 30 blocks about 96.7% of UVB rays, while SPF 50 blocks about 98%. The difference is small, but SPF 50+ is still recommended because most people under-apply. The "+" means it\'s been tested to at least SPF 60.'
  },
  {
    q: 'Do I need sun protection in winter?',
    a: 'In many parts of Australia, yes! UV levels can still reach 3+ (the threshold for protection) during winter, especially in northern states. Always check the UV Index regardless of season.'
  },
  {
    q: 'Can I get enough Vitamin D while being sun safe?',
    a: 'Yes. In summer, just a few minutes of incidental exposure (walking to the car, hanging washing) is usually enough. In winter, you may need slightly longer exposure on a small area. Talk to your GP if you\'re concerned about Vitamin D levels.'
  },
  {
    q: 'What about waterproof sunscreen — is it really waterproof?',
    a: 'No sunscreen is fully waterproof. "Water resistant" sunscreens maintain their SPF rating for 40-80 minutes of water activity. You should always reapply after swimming, towelling off, or heavy sweating.'
  }
]
</script>

<template>
  <div class="page">
    <section class="page-header">
      <div class="container">
        <span class="page-badge">Protection</span>
        <h1>Prevention</h1>
        <p>Practical tips and strategies to protect your skin from UV damage every day.</p>
      </div>
    </section>

    <div class="container page-body">
      <!-- Slip Slop Slap Banner -->
      <div class="slogan-banner">
        <h2>The 5 S's of Sun Protection</h2>
        <div class="slogan-items">
          <div class="slogan-item">
            <span class="slogan-icon">👕</span>
            <span class="slogan-word">Slip</span>
            <span class="slogan-desc">on clothing</span>
          </div>
          <div class="slogan-item">
            <span class="slogan-icon">🧴</span>
            <span class="slogan-word">Slop</span>
            <span class="slogan-desc">on sunscreen</span>
          </div>
          <div class="slogan-item">
            <span class="slogan-icon">👒</span>
            <span class="slogan-word">Slap</span>
            <span class="slogan-desc">on a hat</span>
          </div>
          <div class="slogan-item">
            <span class="slogan-icon">🌳</span>
            <span class="slogan-word">Seek</span>
            <span class="slogan-desc">shade</span>
          </div>
          <div class="slogan-item">
            <span class="slogan-icon">🕶️</span>
            <span class="slogan-word">Slide</span>
            <span class="slogan-desc">on sunglasses</span>
          </div>
        </div>
      </div>

      <!-- Protection Methods -->
      <h2 class="section-title">Protection Methods</h2>
      <div class="methods-grid">
        <div
          v-for="method in protectionMethods"
          :key="method.title"
          class="method-card"
          :style="{ background: method.color }"
        >
          <div class="method-header">
            <span class="method-icon">{{ method.icon }}</span>
            <div>
              <h3>{{ method.title }}</h3>
              <span class="method-subtitle">{{ method.subtitle }}</span>
            </div>
          </div>
          <ul class="method-tips">
            <li v-for="(tip, i) in method.tips" :key="i">{{ tip }}</li>
          </ul>
        </div>
      </div>

      <!-- UV Protection Quick Guide -->
      <div class="quick-guide">
        <h2 class="section-title">UV Index Action Guide</h2>
        <div class="guide-table">
          <div class="guide-row" style="--row-color: #4ADE80">
            <span class="guide-level">0 – 2</span>
            <span class="guide-label">Low</span>
            <span class="guide-action">Minimal protection needed. Enjoy outdoors safely.</span>
          </div>
          <div class="guide-row" style="--row-color: #FACC15">
            <span class="guide-level">3 – 5</span>
            <span class="guide-label">Moderate</span>
            <span class="guide-action">Slip, slop, slap! Seek shade during midday hours.</span>
          </div>
          <div class="guide-row" style="--row-color: #FB923C">
            <span class="guide-level">6 – 7</span>
            <span class="guide-label">High</span>
            <span class="guide-action">Full protection required. Reduce time in the sun.</span>
          </div>
          <div class="guide-row" style="--row-color: #F87171">
            <span class="guide-level">8 – 10</span>
            <span class="guide-label">Very High</span>
            <span class="guide-action">Take all precautions. Avoid outdoor activities 10am–3pm.</span>
          </div>
          <div class="guide-row" style="--row-color: #C084FC">
            <span class="guide-level">11+</span>
            <span class="guide-label">Extreme</span>
            <span class="guide-action">Stay indoors if possible. Maximum protection essential.</span>
          </div>
        </div>
      </div>

      <!-- FAQs -->
      <h2 class="section-title">Frequently Asked Questions</h2>
      <div class="faq-list">
        <div
          v-for="(faq, index) in faqs"
          :key="index"
          :class="['faq-item', { open: expandedFaq === index }]"
          @click="toggleFaq(index)"
        >
          <div class="faq-question">
            <span>{{ faq.q }}</span>
            <span class="faq-toggle">{{ expandedFaq === index ? '−' : '+' }}</span>
          </div>
          <div v-if="expandedFaq === index" class="faq-answer">
            {{ faq.a }}
          </div>
        </div>
      </div>

      <!-- CTA -->
      <div class="cta-section">
        <h2>Check Today's UV Levels</h2>
        <p>Use our real-time UV Tracker to plan your sun protection before heading outdoors.</p>
        <router-link to="/track-uv" class="btn btn-primary">Open UV Tracker →</router-link>
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

/* Slogan Banner */
.slogan-banner {
  background: linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%);
  border-radius: var(--radius-xl);
  padding: 40px;
  margin-bottom: 48px;
  color: white;
  text-align: center;
}
.slogan-banner h2 {
  font-size: 1.5rem;
  font-weight: 800;
  margin-bottom: 28px;
}
.slogan-items {
  display: flex;
  justify-content: center;
  gap: 32px;
  flex-wrap: wrap;
}
.slogan-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 100px;
}
.slogan-icon { font-size: 2rem; }
.slogan-word {
  font-size: 1.25rem;
  font-weight: 800;
}
.slogan-desc {
  font-size: 0.85rem;
  opacity: 0.9;
}

/* Section Title */
.section-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--color-secondary);
  margin-bottom: 24px;
}

/* Methods Grid */
.methods-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 56px;
}
.method-card {
  border-radius: var(--radius-lg);
  padding: 28px;
  border: 1px solid var(--color-border);
  transition: transform 0.2s;
}
.method-card:hover { transform: translateY(-4px); }
.method-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}
.method-icon { font-size: 2rem; }
.method-header h3 {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-secondary);
  margin-bottom: 2px;
}
.method-subtitle {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}
.method-tips {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.method-tips li {
  font-size: 0.88rem;
  color: var(--color-text);
  padding-left: 20px;
  position: relative;
  line-height: 1.5;
}
.method-tips li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--color-success);
  font-weight: 700;
}

/* Quick Guide */
.quick-guide { margin-bottom: 56px; }
.guide-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.guide-row {
  display: grid;
  grid-template-columns: 80px 100px 1fr;
  align-items: center;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: 16px 24px;
  box-shadow: var(--shadow-sm);
  border-left: 4px solid var(--row-color);
}
.guide-level {
  font-weight: 800;
  font-size: 1rem;
  color: var(--color-text);
}
.guide-label {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}
.guide-action {
  font-size: 0.9rem;
  color: var(--color-text);
}

/* FAQs */
.faq-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 56px;
}
.faq-item {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: 20px 24px;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: box-shadow 0.2s;
  border: 1px solid var(--color-border);
}
.faq-item:hover { box-shadow: var(--shadow-md); }
.faq-item.open { border-color: var(--color-primary); }
.faq-question {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: var(--color-text);
  gap: 16px;
}
.faq-toggle {
  font-size: 1.4rem;
  color: var(--color-primary);
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 300;
}
.faq-answer {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--color-border);
  font-size: 0.92rem;
  color: var(--color-text-secondary);
  line-height: 1.7;
}

/* CTA */
.cta-section {
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

@media (max-width: 768px) {
  .methods-grid { grid-template-columns: 1fr; }
  .slogan-items { gap: 16px; }
  .guide-row {
    grid-template-columns: 60px 80px 1fr;
    padding: 12px 16px;
    font-size: 0.85rem;
  }
  .page-header h1 { font-size: 2rem; }
}
</style>
