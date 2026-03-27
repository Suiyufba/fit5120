<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { confirmSignUp, signUp } from '../services/authStore'

const router = useRouter()
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const step = ref('form')
const verificationCode = ref('')
const debugCode = ref('')

const form = reactive({
  email: '',
  password: '',
  age: '',
  region: '',
  assessmentAnswers: {
    q_weather: 'b',
    q_injury: 'a',
    q_lost: 'a',
    q_fire: 'b',
  },
})

const assessmentQuestions = [
  {
    id: 'q_weather',
    title: '出发前看到天气预警，你会怎么做？',
    options: [
      { value: 'a', label: '照常出发，路上再说' },
      { value: 'b', label: '推迟行程并检查官方预警' },
      { value: 'c', label: '问朋友看法再决定' },
    ],
  },
  {
    id: 'q_injury',
    title: '队友脚踝扭伤，附近无信号时你会？',
    options: [
      { value: 'a', label: '原地处理、保暖并安排两人找信号求援' },
      { value: 'b', label: '继续前进到目的地再处理' },
      { value: 'c', label: '让队友自己慢慢走' },
    ],
  },
  {
    id: 'q_lost',
    title: '偏离轨迹后，你的优先动作是？',
    options: [
      { value: 'a', label: '停下定位、回到已知路点并记录轨迹' },
      { value: 'b', label: '继续往高处走看能不能找到路' },
      { value: 'c', label: '随机选一个方向尝试' },
    ],
  },
  {
    id: 'q_fire',
    title: '徒步途中发现远处山火烟柱，你会？',
    options: [
      { value: 'a', label: '靠近观察，确定火势后再决定' },
      { value: 'b', label: '立即远离并通知相关部门' },
      { value: 'c', label: '先拍照发社交媒体' },
    ],
  },
]

async function handleSubmit() {
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const result = await signUp({
      email: form.email,
      password: form.password,
      age: form.age,
      region: form.region,
      assessmentAnswers: form.assessmentAnswers,
    })
    step.value = 'verify'
    successMessage.value = `验证码已发送到 ${result.email}`
    debugCode.value = result.debugCode || ''
  } catch (error) {
    errorMessage.value = error?.message || 'Registration failed'
  } finally {
    loading.value = false
  }
}

async function handleVerify() {
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await confirmSignUp({
      email: form.email,
      code: verificationCode.value,
    })
    router.push('/profile')
  } catch (error) {
    errorMessage.value = error?.message || 'Verification failed'
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
      <p class="register-subtitle">填写基础信息与安全情景题，系统会给你分配徒步等级。</p>

      <form v-if="step === 'form'" class="register-form" @submit.prevent="handleSubmit">
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
                />
                <span>{{ option.label }}</span>
              </label>
            </div>
          </article>
        </section>

        <p v-if="errorMessage" class="register-error">{{ errorMessage }}</p>

        <button type="submit" :disabled="loading">
          {{ loading ? 'Sending code...' : 'Send Verification Code' }}
        </button>
      </form>

      <form v-else class="register-form" @submit.prevent="handleVerify">
        <section class="quiz-panel">
          <h2>Email Verification</h2>
          <p class="verify-tip">
            {{ successMessage || '请输入你邮箱收到的 6 位验证码。' }}
          </p>
          <p v-if="debugCode" class="verify-tip verify-tip--debug">
            当前未配置 SMTP，调试验证码：<strong>{{ debugCode }}</strong>
          </p>
          <label>
            <span>Verification Code</span>
            <input v-model="verificationCode" type="text" minlength="6" maxlength="6" required />
          </label>
        </section>

        <p v-if="errorMessage" class="register-error">{{ errorMessage }}</p>

        <button type="submit" :disabled="loading">
          {{ loading ? 'Verifying...' : 'Verify & Create Account' }}
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

.verify-tip {
  margin-top: 0.6rem;
  color: #49655d;
  font-size: 0.9rem;
}

.verify-tip--debug {
  margin-top: 0.4rem;
  color: #6a4f13;
}

@media (max-width: 800px) {
  .register-grid {
    grid-template-columns: 1fr;
  }
}
</style>
