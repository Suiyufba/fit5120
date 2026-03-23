<script setup>
import { ref, computed } from 'vue'

const currentIndex = ref(0)
const selectedAnswer = ref(null)
const showFeedback = ref(false)
const score = ref(0)

const questions = [
  {
    id: 1,
    question: 'What is the largest renewable energy source currently expanding in Australia?',
    options: ['Solar power', 'Wind energy', 'Hydroelectricity', 'Natural gas'],
    correct: 0,
    explanation: 'Solar power is Australia\'s fastest-growing renewable energy source, accounting for over 15% of the nation\'s electricity generation, thanks to some of the highest solar irradiance levels on Earth.',
    topic: 'Energy'
  },
  {
    id: 2,
    question: 'What do koalas primarily feed on?',
    options: ['Bamboo leaves', 'Eucalyptus leaves', 'Pine needles', 'Oak leaves'],
    correct: 1,
    explanation: 'Koalas exclusively eat eucalyptus leaves, consuming 200–500 grams daily. They are highly selective, preferring specific eucalyptus species from the 700+ found across Australia.',
    topic: 'Wildlife'
  },
  {
    id: 3,
    question: 'In which Australian state is the Great Barrier Reef located?',
    options: ['New South Wales', 'Victoria', 'Queensland', 'Western Australia'],
    correct: 2,
    explanation: 'The Great Barrier Reef stretches over 2,300 km along the Queensland coast. It\'s the world\'s largest coral reef system, visible from space, and home to over 1,500 species of fish.',
    topic: 'Marine'
  },
  {
    id: 4,
    question: 'Approximately how much plastic enters Australian oceans each year?',
    options: ['~1,000 tonnes', '~5,000 tonnes', '~10,000 tonnes', '~20,000 tonnes'],
    correct: 2,
    explanation: 'An estimated 10,000 tonnes of plastic enters Australian oceans annually, posing a severe threat to marine life including sea turtles, seabirds, and dolphins.',
    topic: 'Pollution'
  },
  {
    id: 5,
    question: 'How many hectares were burned during Australia\'s 2019–2020 Black Summer bushfires?',
    options: ['5 million', '10 million', '18.6 million', '25 million'],
    correct: 2,
    explanation: 'The Black Summer fires burned approximately 18.6 million hectares, destroyed over 3,000 homes, and killed an estimated 3 billion animals — one of the worst wildlife disasters in modern history.',
    topic: 'Climate'
  }
]

const currentQuestion = computed(() => questions[currentIndex.value])
const progress = computed(() => ((currentIndex.value + 1) / questions.length) * 100)
const isComplete = computed(() => currentIndex.value >= questions.length)
const accuracy = computed(() => questions.length > 0 ? Math.round((score.value / 10) / questions.length * 100) : 0)

function selectAnswer(index) {
  if (showFeedback.value) return
  selectedAnswer.value = index
  showFeedback.value = true
  if (index === currentQuestion.value.correct) {
    score.value += 10
  }
}

function nextQuestion() {
  if (currentIndex.value < questions.length - 1) {
    currentIndex.value++
    selectedAnswer.value = null
    showFeedback.value = false
  } else {
    currentIndex.value = questions.length
  }
}

function restartQuiz() {
  currentIndex.value = 0
  selectedAnswer.value = null
  showFeedback.value = false
  score.value = 0
}
</script>

<template>
  <div class="quiz-page">
    <div class="quiz-outer">
      <!-- Quiz Header -->
      <header class="quiz-top">
        <button class="back-link" @click="$router.push('/')">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Back
        </button>
        <div class="quiz-progress-info" v-if="!isComplete">
          <span class="progress-current">{{ currentIndex + 1 }}</span>
          <span class="progress-sep">/</span>
          <span class="progress-total">{{ questions.length }}</span>
        </div>
        <div class="score-live" v-if="!isComplete">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" fill="var(--color-primary)" opacity="0.2"/>
            <circle cx="8" cy="8" r="3" fill="var(--color-primary)"/>
          </svg>
          {{ score }} pts
        </div>
      </header>

      <!-- Progress Bar -->
      <div class="progress-track" v-if="!isComplete">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>

      <!-- Desktop two-panel layout -->
      <div v-if="!isComplete" class="quiz-desktop-layout">
        <!-- Main question area -->
        <div class="question-area">
          <div class="topic-pill">{{ currentQuestion.topic }}</div>
          <h2 class="question-text">{{ currentQuestion.question }}</h2>

          <div class="options-list">
            <button
              v-for="(option, index) in currentQuestion.options"
              :key="index"
              class="option-card"
              :class="{
                selected: selectedAnswer === index && !showFeedback,
                correct: showFeedback && index === currentQuestion.correct,
                wrong: showFeedback && selectedAnswer === index && index !== currentQuestion.correct
              }"
              @click="selectAnswer(index)"
              :disabled="showFeedback"
            >
              <span class="option-key">{{ ['A', 'B', 'C', 'D'][index] }}</span>
              <span class="option-label">{{ option }}</span>
              <span class="option-indicator" v-if="showFeedback && index === currentQuestion.correct">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 9l3.5 3.5L14 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
              <span class="option-indicator wrong-icon" v-if="showFeedback && selectedAnswer === index && index !== currentQuestion.correct">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M5 5l8 8M13 5l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </span>
            </button>
          </div>

          <!-- Feedback Panel -->
          <transition name="slide-up">
            <div v-if="showFeedback" class="feedback-panel" :class="{ success: selectedAnswer === currentQuestion.correct }">
              <div class="feedback-top">
                <div class="feedback-result">
                  <span v-if="selectedAnswer === currentQuestion.correct" class="result-correct">Correct!</span>
                  <span v-else class="result-wrong">Not quite</span>
                </div>
                <div class="feedback-points">
                  +{{ selectedAnswer === currentQuestion.correct ? 10 : 0 }} pts
                </div>
              </div>
              <p class="feedback-explanation">{{ currentQuestion.explanation }}</p>
              <button class="btn-next" @click="nextQuestion">
                {{ currentIndex < questions.length - 1 ? 'Next Question' : 'See Results' }}
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
          </transition>
        </div>

        <!-- Sidebar with quiz info (desktop only) -->
        <aside class="quiz-sidebar">
          <div class="sidebar-card">
            <h3>Quiz Progress</h3>
            <div class="sidebar-progress-ring">
              <svg viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="var(--color-border-light)" stroke-width="5"/>
                <circle cx="40" cy="40" r="34" fill="none" stroke="var(--color-primary)" stroke-width="5"
                  stroke-linecap="round"
                  :stroke-dasharray="2 * Math.PI * 34"
                  :stroke-dashoffset="2 * Math.PI * 34 * (1 - progress / 100)"
                  transform="rotate(-90 40 40)"
                  style="transition: stroke-dashoffset 0.5s ease"/>
              </svg>
              <span class="ring-label">{{ Math.round(progress) }}%</span>
            </div>
          </div>

          <div class="sidebar-card">
            <h3>Current Score</h3>
            <div class="sidebar-score">{{ score }} <span>pts</span></div>
          </div>

          <div class="sidebar-card">
            <h3>Question Map</h3>
            <div class="question-dots">
              <span v-for="(q, i) in questions" :key="i"
                class="q-dot"
                :class="{
                  current: i === currentIndex,
                  done: i < currentIndex,
                  future: i > currentIndex
                }"
              >{{ i + 1 }}</span>
            </div>
          </div>
        </aside>
      </div>

      <!-- Results Screen -->
      <div v-else class="results-area">
        <div class="results-header">
          <div class="results-badge">Quiz Complete</div>
          <h2 class="results-title">Great effort!</h2>
          <p class="results-subtitle">Here's how you did on this quiz session.</p>
        </div>

        <div class="results-grid">
          <div class="results-card">
            <div class="results-score">
              <span class="rs-number">{{ score }}</span>
              <span class="rs-label">Points Earned</span>
            </div>
            <div class="results-divider"></div>
            <div class="results-detail">
              <div class="rd-row">
                <span class="rd-key">Correct Answers</span>
                <span class="rd-val">{{ score / 10 }} / {{ questions.length }}</span>
              </div>
              <div class="rd-row">
                <span class="rd-key">Accuracy</span>
                <span class="rd-val">{{ accuracy }}%</span>
              </div>
              <div class="rd-row">
                <span class="rd-key">Topics Covered</span>
                <span class="rd-val">{{ [...new Set(questions.map(q => q.topic))].length }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="results-actions">
          <button class="btn-retry" @click="restartQuiz">
            Try Again
          </button>
          <button class="btn-home" @click="$router.push('/')">
            Back to Home
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quiz-page {
  min-height: 100vh;
  background: var(--color-bg);
}

.quiz-outer {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 40px;
}

.quiz-desktop-layout {
  display: flex;
  gap: 40px;
  align-items: flex-start;
}

.quiz-desktop-layout .question-area {
  flex: 1;
  min-width: 0;
  max-width: 680px;
}

.quiz-sidebar {
  width: 280px;
  flex-shrink: 0;
  position: sticky;
  top: 80px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sidebar-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-xl);
  padding: 24px;
}

.sidebar-card h3 {
  font-family: var(--font-body);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
  margin-bottom: 16px;
}

.sidebar-progress-ring {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto;
}

.sidebar-progress-ring svg {
  width: 100%;
  height: 100%;
}

.ring-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-primary);
}

.sidebar-score {
  font-family: var(--font-display);
  font-size: 2.2rem;
  font-weight: 800;
  color: var(--color-primary);
  text-align: center;
}

.sidebar-score span {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text-muted);
}

.question-dots {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.q-dot {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  font-size: 0.78rem;
  font-weight: 700;
  transition: all 0.25s var(--ease-out-expo);
}

.q-dot.current {
  background: var(--color-primary);
  color: white;
}

.q-dot.done {
  background: var(--color-primary-muted);
  color: var(--color-primary);
}

.q-dot.future {
  background: var(--color-bg-warm);
  color: var(--color-text-muted);
}

.quiz-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 0;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  transition: color 0.2s;
}

.back-link:hover {
  color: var(--color-text);
}

.quiz-progress-info {
  font-family: var(--font-display);
  font-size: 1rem;
}

.progress-current {
  font-weight: 700;
  color: var(--color-text);
}

.progress-sep {
  color: var(--color-text-muted);
  margin: 0 2px;
}

.progress-total {
  color: var(--color-text-muted);
}

.score-live {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-primary);
}

.progress-track {
  height: 4px;
  background: var(--color-border-light);
  border-radius: 2px;
  margin-bottom: 40px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
  border-radius: 2px;
  transition: width 0.5s var(--ease-out-expo);
}

.question-area {
  padding-bottom: 80px;
}

.topic-pill {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-accent);
  background: var(--color-accent-muted);
  padding: 5px 14px;
  border-radius: var(--radius-full);
  margin-bottom: 20px;
}

.question-text {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.35;
  color: var(--color-text);
  margin-bottom: 32px;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-card {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 18px 20px;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  text-align: left;
  font-size: 1rem;
  transition: all 0.25s var(--ease-out-expo);
}

.option-card:not(:disabled):hover {
  border-color: var(--color-primary-light);
  background: var(--color-primary-muted);
}

.option-card.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-muted);
}

.option-card.correct {
  border-color: var(--color-success);
  background: rgba(45, 122, 79, 0.06);
}

.option-card.wrong {
  border-color: var(--color-error);
  background: rgba(192, 57, 43, 0.04);
}

.option-key {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  background: var(--color-bg-warm);
  border-radius: var(--radius-md);
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.option-card.correct .option-key {
  background: var(--color-success);
  color: white;
}

.option-card.wrong .option-key {
  background: var(--color-error);
  color: white;
}

.option-label {
  flex: 1;
  color: var(--color-text);
}

.option-indicator {
  color: var(--color-success);
}

.option-indicator.wrong-icon {
  color: var(--color-error);
}

/* Feedback */
.feedback-panel {
  margin-top: 28px;
  padding: 24px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-xl);
}

.feedback-panel.success {
  border-color: rgba(45, 122, 79, 0.2);
}

.feedback-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.result-correct {
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-success);
}

.result-wrong {
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-error);
}

.feedback-points {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-primary);
  background: var(--color-primary-muted);
  padding: 4px 12px;
  border-radius: var(--radius-full);
}

.feedback-explanation {
  font-size: 0.92rem;
  line-height: 1.65;
  color: var(--color-text-secondary);
  margin-bottom: 20px;
}

.btn-next {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  justify-content: center;
  padding: 14px 24px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-full);
  font-size: 0.95rem;
  font-weight: 600;
  transition: all 0.3s var(--ease-out-expo);
}

.btn-next:hover {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
}

.slide-up-enter-active {
  animation: slideUpIn 0.4s var(--ease-out-expo);
}

@keyframes slideUpIn {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Results */
.results-area {
  padding: 48px 0 80px;
  text-align: center;
  max-width: 640px;
  margin: 0 auto;
}

.results-header {
  margin-bottom: 36px;
}

.results-badge {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-primary);
  background: var(--color-primary-muted);
  padding: 5px 14px;
  border-radius: var(--radius-full);
  margin-bottom: 16px;
}

.results-title {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 8px;
}

.results-subtitle {
  font-size: 1rem;
  color: var(--color-text-secondary);
}

.results-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-xl);
  padding: 36px;
  margin-bottom: 32px;
  text-align: center;
}

.results-score {
  margin-bottom: 24px;
}

.rs-number {
  display: block;
  font-family: var(--font-display);
  font-size: 4rem;
  font-weight: 800;
  color: var(--color-primary);
  line-height: 1;
  margin-bottom: 4px;
}

.rs-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.results-divider {
  height: 1px;
  background: var(--color-border-light);
  margin-bottom: 24px;
}

.rd-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
}

.rd-key {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.rd-val {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-text);
}

.results-grid {
  max-width: 480px;
  margin: 0 auto;
}

.results-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  max-width: 480px;
  margin: 0 auto;
}

.btn-retry {
  padding: 14px 24px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-full);
  font-size: 0.95rem;
  font-weight: 600;
  transition: all 0.3s var(--ease-out-expo);
}

.btn-retry:hover {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
}

.btn-home {
  padding: 14px 24px;
  background: transparent;
  color: var(--color-text-secondary);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: 0.95rem;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-home:hover {
  border-color: var(--color-text-muted);
  color: var(--color-text);
}

@media (max-width: 900px) {
  .quiz-sidebar {
    display: none;
  }

  .quiz-desktop-layout {
    display: block;
  }

  .quiz-desktop-layout .question-area {
    max-width: 100%;
  }
}

@media (max-width: 768px) {
  .quiz-outer {
    padding: 0 16px;
  }

  .question-text {
    font-size: 1.25rem;
  }

  .results-actions {
    flex-direction: column;
  }
}
</style>
