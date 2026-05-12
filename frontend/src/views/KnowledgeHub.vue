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

/**
 * Defence-in-depth URL allowlisting for article links and images.
 * The backend already filters non-https: URLs, but this frontend guard
 * prevents rendering if a bad URL slips through (e.g. from a cached
 * response or a future API version).
 */
function safeUrl(raw) {
  if (!raw) return ''
  try {
    const parsed = new URL(raw)
    return parsed.protocol === 'https:' ? raw : ''
  } catch {
    return ''
  }
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
            :src="safeUrl(featuredArticle.imageUrl)"
            :alt="featuredArticle.title"
            class="kb-featured-image"
          />
          <div class="kb-featured-body">
            <span class="kb-chip">{{ featuredArticle.topic }}</span>
            <h2>
              <a
                v-if="featuredArticle.sourceUrl"
                :href="safeUrl(featuredArticle.sourceUrl)"
                target="_blank"
                rel="noreferrer"
                class="kb-title-link"
              >
                {{ featuredArticle.title }}
              </a>
              <span v-else>{{ featuredArticle.title }}</span>
            </h2>
            <p class="kb-summary">{{ featuredArticle.summary }}</p>
            <p class="kb-content">{{ featuredArticle.content }}</p>
            <div class="kb-meta">
              <span>{{ featuredArticle.readMinutes }} min read</span>
              <span>{{ formatDate(featuredArticle.publishedAt) }}</span>
            </div>
          </div>
        </section>

        <section class="kb-grid">
          <article v-for="item in regularArticles" :key="item.id" class="kb-card">
            <img v-if="item.imageUrl" :src="safeUrl(item.imageUrl)" :alt="item.title" class="kb-card-image" />
            <div class="kb-card-body">
              <span class="kb-chip">{{ item.topic }}</span>
              <h3>
                <a
                  v-if="item.sourceUrl"
                  :href="safeUrl(item.sourceUrl)"
                  target="_blank"
                  rel="noreferrer"
                  class="kb-title-link"
                >
                  {{ item.title }}
                </a>
                <span v-else>{{ item.title }}</span>
              </h3>
              <p class="kb-summary">{{ item.summary }}</p>
              <p class="kb-content">{{ item.content }}</p>
              <div class="kb-meta">
                <span>{{ item.readMinutes }} min read</span>
                <span>{{ formatDate(item.publishedAt) }}</span>
              </div>
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
  max-width: 1180px;
  margin: 0 auto;
  padding: clamp(1.5rem, 4vw, 3rem) 1rem 4rem;
}

.kb-hero {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(33, 72, 59, 0.12);
  border-radius: 1.25rem;
  background:
    linear-gradient(110deg, rgba(23, 59, 49, 0.95), rgba(23, 59, 49, 0.64)),
    var(--hs-hero-image) center/cover;
  padding: clamp(2rem, 5vw, 4.5rem);
  color: #fffaf2;
  box-shadow: var(--hs-shadow);
}

.kb-kicker {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.72rem;
  color: rgba(255, 250, 242, 0.76);
  font-weight: 900;
}

h1 {
  margin-top: 0.3rem;
  color: #fffaf2;
  font-size: clamp(2.8rem, 7vw, 5.7rem);
  line-height: 0.96;
  font-weight: 700;
  max-width: 760px;
}

.kb-hero p {
  color: rgba(255, 250, 242, 0.74);
  max-width: 700px;
  font-size: 1.03rem;
  line-height: 1.7;
}

.kb-filters {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.kb-filter-btn {
  border: 1px solid rgba(33, 72, 59, 0.14);
  border-radius: 999px;
  padding: 0.55rem 0.9rem;
  background: rgba(255, 250, 242, 0.88);
  color: #21483b;
  font-weight: 800;
}

.kb-filter-btn--active {
  background: #173b31;
  color: #fffaf2;
  border-color: #173b31;
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
  margin-top: 1.25rem;
  border: 1px solid rgba(33, 72, 59, 0.12);
  border-radius: 1.25rem;
  overflow: hidden;
  background: #ffffff;
  box-shadow: var(--hs-shadow-soft);
}

.kb-featured-image {
  width: 100%;
  height: 290px;
  object-fit: cover;
}

.kb-featured-body {
  padding: clamp(1rem, 3vw, 1.6rem);
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
  color: #173b31;
  font-weight: 700;
}

.kb-title-link {
  color: inherit;
  text-decoration: none;
  text-decoration-thickness: 0.08em;
  text-underline-offset: 0.18em;
  transition: color 0.18s ease, text-decoration-color 0.18s ease;
}

.kb-title-link:hover,
.kb-title-link:focus-visible {
  color: #2b6b56;
  text-decoration: underline;
  text-decoration-color: rgba(43, 107, 86, 0.42);
}

.kb-title-link:focus-visible {
  outline: 3px solid rgba(47, 96, 78, 0.2);
  outline-offset: 0.18rem;
  border-radius: 0.2rem;
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
  border: 1px solid rgba(33, 72, 59, 0.12);
  border-radius: 1rem;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.012), 0 2px 8px rgba(0,0,0,0.03), 0 10px 24px rgba(25,56,45,0.05);
}

.kb-card-image {
  width: 100%;
  height: 190px;
  object-fit: cover;
}

.kb-card-body {
  padding: 0.85rem;
}

@media (max-width: 900px) {
  .kb-page {
    padding-top: 1rem;
  }

  h1 {
    font-size: 1.7rem;
  }

  .kb-featured-image {
    height: 230px;
  }

  .kb-meta {
    flex-wrap: wrap;
    gap: 0.45rem 0.8rem;
  }

  .kb-grid {
    grid-template-columns: 1fr;
  }
}
</style>
