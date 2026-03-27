<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import SiteFooter from '../components/SiteFooter.vue'
import { fetchKnowledgeArticles } from '../services/knowledgeApi'

const loading = ref(false)
const error = ref('')
const articles = ref([])
const activeFilter = ref('all')
let inflightController

const topicFilters = computed(() => {
  const topics = new Set(articles.value.map((item) => item.topic).filter(Boolean))
  return ['all', ...Array.from(topics)]
})

const filteredArticles = computed(() => {
  if (activeFilter.value === 'all') return articles.value
  return articles.value.filter((item) => item.topic === activeFilter.value)
})

const featuredArticle = computed(() => {
  if (!filteredArticles.value.length) return null
  return filteredArticles.value.find((item) => item.isFeatured) || filteredArticles.value[0]
})

const regularArticles = computed(() => {
  if (!featuredArticle.value) return []
  return filteredArticles.value.filter((item) => item.id !== featuredArticle.value.id)
})

function formatDate(dateString) {
  const ts = Date.parse(dateString || '')
  if (Number.isNaN(ts)) return 'Recently updated'
  return new Date(ts).toLocaleDateString()
}

async function loadArticles() {
  if (inflightController) inflightController.abort()
  inflightController = new AbortController()

  loading.value = true
  error.value = ''
  try {
    const list = await fetchKnowledgeArticles({
      topic: activeFilter.value,
      signal: inflightController.signal
    })
    articles.value = list
  } catch (nextError) {
    if (nextError?.name === 'AbortError') return
    error.value = nextError?.message || 'Failed to load articles'
  } finally {
    loading.value = false
  }
}

function setFilter(topic) {
  activeFilter.value = topic
}

onMounted(loadArticles)

onUnmounted(() => {
  if (inflightController) inflightController.abort()
})
</script>

<template>
  <div>
    <main class="kb-page">
      <section class="kb-hero">
        <p class="kb-kicker">Knowledge Hub</p>
        <h1>Field Intelligence For Safer Hikes</h1>
        <p>Real articles from your database: operational risk advice, weather decisions, and practical trail safety.</p>
      </section>

      <section class="kb-filters">
        <button
          v-for="topic in topicFilters"
          :key="topic"
          class="kb-filter-btn"
          :class="{ 'kb-filter-btn--active': activeFilter === topic }"
          @click="setFilter(topic)"
        >
          {{ topic === 'all' ? 'All Topics' : topic }}
        </button>
      </section>

      <section v-if="loading" class="kb-state">Loading articles...</section>
      <section v-else-if="error" class="kb-state kb-state--error">{{ error }}</section>
      <section v-else-if="!featuredArticle" class="kb-state">No database articles found yet.</section>

      <template v-else>
        <section class="kb-featured">
          <img
            v-if="featuredArticle.imageUrl"
            :src="featuredArticle.imageUrl"
            :alt="featuredArticle.title"
            class="kb-featured-image"
          />
          <div class="kb-featured-body">
            <span class="kb-chip">{{ featuredArticle.topic }}</span>
            <h2>{{ featuredArticle.title }}</h2>
            <p class="kb-summary">{{ featuredArticle.summary }}</p>
            <p class="kb-content">{{ featuredArticle.content }}</p>
            <div class="kb-meta">
              <span>{{ featuredArticle.readMinutes }} min read</span>
              <span>{{ formatDate(featuredArticle.publishedAt) }}</span>
            </div>
            <a v-if="featuredArticle.sourceUrl" :href="featuredArticle.sourceUrl" target="_blank" rel="noreferrer" class="kb-source">
              Source Link
            </a>
          </div>
        </section>

        <section class="kb-grid">
          <article v-for="item in regularArticles" :key="item.id" class="kb-card">
            <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.title" class="kb-card-image" />
            <div class="kb-card-body">
              <span class="kb-chip">{{ item.topic }}</span>
              <h3>{{ item.title }}</h3>
              <p class="kb-summary">{{ item.summary }}</p>
              <p class="kb-content">{{ item.content }}</p>
              <div class="kb-meta">
                <span>{{ item.readMinutes }} min read</span>
                <span>{{ formatDate(item.publishedAt) }}</span>
              </div>
              <a v-if="item.sourceUrl" :href="item.sourceUrl" target="_blank" rel="noreferrer" class="kb-source">
                Source Link
              </a>
            </div>
          </article>
        </section>
      </template>
    </main>
    <SiteFooter />
  </div>
</template>

<style scoped>
.kb-page {
  max-width: 1120px;
  margin: 0 auto;
  padding: 2.2rem 1rem 4rem;
}

.kb-hero {
  border: 1px solid #d8e4db;
  border-radius: 1rem;
  background: linear-gradient(135deg, #f3faf5 0%, #eaf3fb 100%);
  padding: 1.4rem;
}

.kb-kicker {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.72rem;
  color: #3c6658;
  font-weight: 700;
}

h1 {
  margin-top: 0.3rem;
  color: #1c3931;
  font-size: 2rem;
  font-weight: 800;
}

.kb-hero p {
  color: #4a625c;
  max-width: 700px;
}

.kb-filters {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.kb-filter-btn {
  border: 1px solid #d4e0d8;
  border-radius: 999px;
  padding: 0.45rem 0.8rem;
  background: #fff;
  color: #3c5f53;
  font-weight: 700;
}

.kb-filter-btn--active {
  background: #2f6755;
  color: #fff;
  border-color: #2f6755;
}

.kb-state {
  margin-top: 1rem;
  border: 1px solid #d8e4db;
  border-radius: 0.8rem;
  padding: 0.8rem;
  color: #45635a;
  background: #fbfffc;
}

.kb-state--error {
  border-color: #e3b2a8;
  background: #fff3ef;
  color: #7f2f25;
}

.kb-featured {
  margin-top: 1rem;
  border: 1px solid #d8e4db;
  border-radius: 1rem;
  overflow: hidden;
  background: #fff;
}

.kb-featured-image {
  width: 100%;
  height: 290px;
  object-fit: cover;
}

.kb-featured-body {
  padding: 1rem;
}

.kb-chip {
  display: inline-block;
  border-radius: 999px;
  background: #e9f4ef;
  color: #275346;
  padding: 0.2rem 0.55rem;
  font-size: 0.72rem;
  font-weight: 700;
}

h2, h3 {
  margin-top: 0.45rem;
  color: #1f3a33;
  font-weight: 800;
}

.kb-summary {
  margin-top: 0.35rem;
  color: #35554b;
  font-weight: 600;
}

.kb-content {
  margin-top: 0.35rem;
  color: #48645c;
  line-height: 1.5;
  white-space: pre-wrap;
}

.kb-meta {
  margin-top: 0.65rem;
  display: flex;
  gap: 0.8rem;
  color: #5f7770;
  font-size: 0.82rem;
}

.kb-grid {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}

.kb-card {
  border: 1px solid #dae6de;
  border-radius: 0.9rem;
  overflow: hidden;
  background: #fff;
}

.kb-card-image {
  width: 100%;
  height: 190px;
  object-fit: cover;
}

.kb-card-body {
  padding: 0.85rem;
}

.kb-source {
  margin-top: 0.55rem;
  display: inline-block;
  color: #2b6b56;
  font-weight: 700;
}

@media (max-width: 900px) {
  .kb-grid {
    grid-template-columns: 1fr;
  }
}
</style>
