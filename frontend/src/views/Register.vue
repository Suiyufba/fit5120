<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { signUp } from '../services/authStore'

const router = useRouter()
const loading = ref(false)
const errorMessage = ref('')

const form = reactive({
  email: '',
  password: '',
  age: '',
  region: '',
  securityQuestion: 'What is the name of your first hiking trail?',
  securityAnswer: '',
  assessmentAnswers: {
    q_weather: '',
    q_injury: '',
    q_lost: '',
    q_fire: '',
  },
})

const assessmentQuestions = [
  {
    id: 'q_weather',
    title: 'You see a weather warning before departure. What do you do?',
    options: [
      { value: 'a', label: 'Go as planned and decide on the trail.' },
      { value: 'b', label: 'Delay the trip and review official alerts.' },
      { value: 'c', label: 'Ask friends first, then decide.' },
    ],
  },
  {
    id: 'q_injury',
    title: 'A teammate sprains an ankle and there is no signal nearby. What do you do?',
    options: [
      { value: 'a', label: 'Stabilize, keep warm, and send two people to find signal for help.' },
      { value: 'b', label: 'Keep moving and deal with it later at destination.' },
      { value: 'c', label: 'Let the injured teammate walk alone slowly.' },
    ],
  },
  {
    id: 'q_lost',
    title: 'You realize your group is off-route. What is your first action?',
    options: [
      { value: 'a', label: 'Stop, re-check position, and return to a known waypoint.' },
      { value: 'b', label: 'Keep climbing and hope to spot the route.' },
      { value: 'c', label: 'Pick a random direction and continue.' },
    ],
  },
  {
    id: 'q_fire',
    title: 'You spot a distant bushfire smoke column while hiking. What do you do?',
    options: [
      { value: 'a', label: 'Move closer to assess the fire before deciding.' },
      { value: 'b', label: 'Move away immediately and notify authorities.' },
      { value: 'c', label: 'Take photos and post on social media first.' },
    ],
  },
]

async function handleSubmit() {
  loading.value = true
  errorMessage.value = ''
  try {
    await signUp({
      email: form.email,
      password: form.password,
      age: form.age,
      region: form.region,
      securityQuestion: form.securityQuestion,
      securityAnswer: form.securityAnswer,
      assessmentAnswers: form.assessmentAnswers,
    })
    router.push('/profile')
  } catch (error) {
    errorMessage.value = error?.message || 'Registration failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="register-page">
    <section class="register-card">
      <p class="register-kicker">goHiking Membership</p>
      <h1>Create Your Hiking Profile</h1>
      <p class="register-subtitle">Complete your profile, safety quiz, and security question to get your hiking level.</p>

      <form class="register-form" @submit.prevent="handleSubmit">
        <div class="register-grid">
          <label>
            <span>Email</span>
            <input v-model="form.email" type="email" required autocomplete="email" />
          </label>
          <label>
            <span>Password</span>
            <input v-model="form.password" type="password" required minlength="8" autocomplete="new-password" />
          </label>
          <label>
            <span>Age</span>
            <input v-model="form.age" type="number" min="10" max="100" required />
          </label>
          <label>
            <span>Region</span>
            <input v-model="form.region" type="text" placeholder="e.g. Melbourne, VIC" required />
          </label>
          <label>
            <span>Security Question</span>
            <select v-model="form.securityQuestion" required>
              <option>What is the name of your first hiking trail?</option>
              <option>Which city were you born in?</option>
              <option>What is your favorite outdoor activity?</option>
              <option>What was your childhood nickname?</option>
            </select>
          </label>
          <label>
            <span>Security Answer</span>
            <input v-model="form.securityAnswer" type="text" required />
          </label>
        </div>

        <section class="quiz-panel">
          <h2>Trail Safety Scenario Quiz</h2>
          <article v-for="question in assessmentQuestions" :key="question.id" class="quiz-item">
            <p>{{ question.title }}</p>
            <div class="quiz-options">
              <label v-for="option in question.options" :key="option.value">
                <input
                  v-model="form.assessmentAnswers[question.id]"
                  type="radio"
                  :name="question.id"
                  :value="option.value"
                  required
                />
                <span>{{ option.label }}</span>
              </label>
            </div>
          </article>
        </section>

        <p v-if="errorMessage" class="register-error">{{ errorMessage }}</p>

        <button type="submit" :disabled="loading">
          {{ loading ? 'Creating account...' : 'Create Account' }}
        </button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.register-page {
  min-height: calc(100vh - 72px);
  padding: 2rem 1rem;
  background:
    radial-gradient(circle at 0% 0%, rgba(92, 136, 110, 0.24), transparent 28%),
    radial-gradient(circle at 100% 100%, rgba(70, 119, 148, 0.22), transparent 32%),
    #f5f8f3;
}

.register-card {
  max-width: 880px;
  margin: 0 auto;
  border: 1px solid #d9e4d9;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.92);
  padding: 1.5rem;
  box-shadow: 0 20px 48px rgba(30, 61, 51, 0.12);
}

.register-kicker {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #47695a;
  font-size: 0.72rem;
  font-weight: 700;
}

h1 {
  margin-top: 0.25rem;
  color: #1b3932;
}

.register-subtitle {
  margin-top: 0.5rem;
  color: #4d635d;
}

.register-form {
  margin-top: 1rem;
  display: grid;
  gap: 1rem;
}

.register-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}

label {
  display: grid;
  gap: 0.35rem;
}

label > span {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #2d4c42;
  font-weight: 700;
}

input[type="email"],
input[type="password"],
input[type="number"],
select,
input[type="text"] {
  border: 1px solid #cfddd1;
  border-radius: 0.7rem;
  padding: 0.65rem 0.8rem;
  background: #fdfffd;
}

.quiz-panel {
  border: 1px solid #dce6dc;
  border-radius: 0.9rem;
  padding: 1rem;
  background: #f8fbf8;
}

h2 {
  color: #1b3932;
  font-size: 1rem;
}

.quiz-item {
  margin-top: 0.85rem;
  border: 1px solid #e0e8e0;
  border-radius: 0.7rem;
  padding: 0.8rem;
  background: #fff;
}

.quiz-item p {
  color: #25473e;
  font-weight: 700;
  margin-bottom: 0.55rem;
}

.quiz-options {
  display: grid;
  gap: 0.45rem;
}

.quiz-options label {
  grid-template-columns: auto 1fr;
  gap: 0.5rem;
  align-items: center;
}

.quiz-options label span {
  color: #436159;
  text-transform: none;
  font-weight: 500;
  letter-spacing: 0;
  font-size: 0.92rem;
}

button {
  border: none;
  border-radius: 0.8rem;
  padding: 0.75rem 0.9rem;
  color: #fff;
  font-weight: 700;
  background: linear-gradient(135deg, #305d4f 0%, #6d8f43 100%);
}

button:disabled {
  opacity: 0.6;
}

.register-error {
  color: #b63030;
  font-size: 0.84rem;
}

@media (max-width: 800px) {
  .register-grid {
    grid-template-columns: 1fr;
  }
}
</style>
