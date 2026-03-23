<script setup>
import { ref, computed } from 'vue'

const currentIndex = ref(0)
const selectedAnswer = ref(null)
const showFeedback = ref(false)
const score = ref(0)

const questions = [
  {
    id: 1,
    question: '澳大利亚最大的可再生能源来源是什么？',
    options: ['太阳能', '风能', '水力发电', '天然气'],
    correct: 0,
    explanation: '太阳能是澳大利亚增长最快的可再生能源，2023年占全国发电量的15%。'
  },
  {
    id: 2,
    question: '考拉的主要食物来源是什么？',
    options: ['竹子', '桉树叶', '松针', '橡树叶'],
    correct: 1,
    explanation: '考拉主要以桉树叶为食，每天需要吃200-500克桉树叶。'
  },
  {
    id: 3,
    question: '大堡礁位于澳大利亚哪个州的海域？',
    options: ['新南威尔士州', '维多利亚州', '昆士兰州', '西澳大利亚州'],
    correct: 2,
    explanation: '大堡礁位于昆士兰州海岸，是世界上最大的珊瑚礁系统。'
  },
  {
    id: 4,
    question: '澳大利亚每年大约有多少吨塑料进入海洋？',
    options: ['约1000吨', '约5000吨', '约10000吨', '约20000吨'],
    correct: 2,
    explanation: '据统计，澳大利亚每年约有10000吨塑料进入海洋，对海洋生物造成严重威胁。'
  },
  {
    id: 5,
    question: '悉尼的哪个公园是世界上最大的市内公园之一？',
    options: ['海德公园', '皇家植物园', '世纪公园', '悉尼公园'],
    correct: 2,
    explanation: '世纪公园(Centennial Park)占地189公顷，是世界上最大的市内公园之一。'
  }
]

const currentQuestion = computed(() => questions[currentIndex.value])
const progress = computed(() => ((currentIndex.value + 1) / questions.length) * 100)
const isComplete = computed(() => currentIndex.value >= questions.length)

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
    <!-- Header -->
    <header class="quiz-header">
      <button class="back-btn" @click="$router.push('/')">←</button>
      <span class="question-counter">{{ currentIndex + 1 }}/{{ questions.length }}</span>
    </header>

    <!-- Progress Bar -->
    <div class="progress-container">
      <div class="progress-bar" :style="{ width: progress + '%' }"></div>
    </div>

    <!-- Question Content -->
    <div v-if="!isComplete" class="question-content">
      <div class="topic-badge">🌿 气候变化专题</div>
      
      <h2 class="question-text">{{ currentQuestion.question }}</h2>
      
      <div class="options">
        <button
          v-for="(option, index) in currentQuestion.options"
          :key="index"
          class="option-btn"
          :class="{ 
            selected: selectedAnswer === index,
            correct: showFeedback && index === currentQuestion.correct,
            wrong: showFeedback && selectedAnswer === index && index !== currentQuestion.correct
          }"
          @click="selectAnswer(index)"
        >
          <span class="option-letter">{{ ['A', 'B', 'C', 'D'][index] }}</span>
          <span class="option-text">{{ option }}</span>
        </button>
      </div>

      <!-- Feedback -->
      <div v-if="showFeedback" class="feedback" :class="{ success: selectedAnswer === currentQuestion.correct }">
        <div class="feedback-header">
          <span v-if="selectedAnswer === currentQuestion.correct">✅ 正确！</span>
          <span v-else>❌ 错误</span>
          <span class="points-earned">🎉 +{{ selectedAnswer === currentQuestion.correct ? 10 : 0 }} 积分</span>
        </div>
        <p class="feedback-text">{{ currentQuestion.explanation }}</p>
        <button class="next-btn" @click="nextQuestion">
          {{ currentIndex < questions.length - 1 ? '下一题 →' : '查看结果' }}
        </button>
      </div>
    </div>

    <!-- Results -->
    <div v-else class="results">
      <div class="results-icon">🎉</div>
      <h2>答题完成！</h2>
      <div class="score-card">
        <div class="score-value">{{ score }}</div>
        <div class="score-label">总积分</div>
      </div>
      <p class="score-detail">你答对了 {{ score / 10 }}/{{ questions.length }} 题</p>
      <div class="results-actions">
        <button class="btn-primary" @click="restartQuiz">再答一次</button>
        <button class="btn-secondary" @click="$router.push('/')">返回首页</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quiz-page {
  min-height: 100vh;
  background: var(--color-bg, #f8fafc);
  padding-bottom: 80px;
}

.quiz-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  max-width: 480px;
  margin: 0 auto;
}

.back-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 8px;
}

.question-counter {
  font-weight: 600;
  color: var(--color-text-secondary, #64748b);
}

.progress-container {
  background: rgba(0, 0, 0, 0.1);
  height: 4px;
}

.progress-bar {
  background: #4caf50;
  height: 100%;
  transition: width 0.3s ease;
}

.question-content {
  max-width: 480px;
  margin: 0 auto;
  padding: 24px 16px;
}

.topic-badge {
  display: inline-block;
  background: rgba(76, 175, 80, 0.1);
  color: #4caf50;
  padding: 6px 12px;
  border-radius: 100px;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 16px;
}

.question-text {
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.5;
  color: var(--color-secondary, #1b4965);
  margin-bottom: 24px;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 16px;
  background: var(--color-surface, #ffffff);
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.option-btn:hover {
  border-color: #4caf50;
}

.option-btn.selected {
  border-color: #4caf50;
  background: rgba(76, 175, 80, 0.05);
}

.option-btn.correct {
  border-color: #4caf50;
  background: rgba(76, 175, 80, 0.1);
}

.option-btn.wrong {
  border-color: #f44336;
  background: rgba(244, 67, 54, 0.1);
}

.option-letter {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  font-weight: 600;
  color: var(--color-text-secondary, #64748b);
}

.option-text {
  flex: 1;
  font-size: 1rem;
  color: var(--color-text, #1e293b);
}

.feedback {
  margin-top: 24px;
  padding: 20px;
  background: var(--color-surface, #ffffff);
  border-radius: 12px;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.feedback-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 1.125rem;
  font-weight: 600;
}

.points-earned {
  font-size: 0.875rem;
  color: #4caf50;
}

.feedback-text {
  color: var(--color-text-secondary, #64748b);
  font-size: 0.9375rem;
  line-height: 1.6;
  margin-bottom: 16px;
}

.next-btn {
  width: 100%;
  padding: 14px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 100px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.next-btn:hover {
  background: #388e3c;
}

/* Results */
.results {
  max-width: 480px;
  margin: 0 auto;
  padding: 48px 16px;
  text-align: center;
}

.results-icon {
  font-size: 4rem;
  margin-bottom: 16px;
}

.results h2 {
  font-size: 1.5rem;
  color: var(--color-secondary, #1b4965);
  margin-bottom: 24px;
}

.score-card {
  background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
  color: white;
  padding: 32px;
  border-radius: 16px;
  margin-bottom: 16px;
}

.score-value {
  font-size: 3rem;
  font-weight: 700;
}

.score-label {
  font-size: 1rem;
  opacity: 0.9;
}

.score-detail {
  color: var(--color-text-secondary, #64748b);
  margin-bottom: 24px;
}

.results-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn-primary {
  padding: 14px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 100px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary {
  padding: 14px;
  background: transparent;
  color: var(--color-text-secondary, #64748b);
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 100px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}
</style>