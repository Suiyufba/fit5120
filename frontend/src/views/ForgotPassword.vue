<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { requestResetCode, resetPassword } from '../services/authStore'

const router = useRouter()
const loading = ref(false)
const step = ref('request')
const email = ref('')
const code = ref('')
const newPassword = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const debugCode = ref('')

async function handleRequestCode() {
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const result = await requestResetCode({ email: email.value })
    step.value = 'confirm'
    successMessage.value = `如果邮箱存在，验证码已发送到 ${result.email}`
    debugCode.value = result.debugCode || ''
  } catch (error) {
    errorMessage.value = error?.message || 'Failed to request reset code'
  } finally {
    loading.value = false
  }
}

async function handleConfirmReset() {
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await resetPassword({
      email: email.value,
      code: code.value,
      newPassword: newPassword.value,
    })
    successMessage.value = '密码已重置，请重新登录'
    setTimeout(() => router.push('/login'), 900)
  } catch (error) {
    errorMessage.value = error?.message || 'Failed to reset password'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="forgot-page">
    <section class="forgot-card">
      <p class="forgot-kicker">goHiking Account</p>
      <h1>Reset Password</h1>
      <p class="forgot-subtitle">通过邮箱验证码重置你的账号密码。</p>

      <form v-if="step === 'request'" class="forgot-form" @submit.prevent="handleRequestCode">
        <label>
          <span>Email</span>
          <input v-model="email" type="email" required autocomplete="email" />
        </label>

        <p v-if="errorMessage" class="forgot-error">{{ errorMessage }}</p>

        <button type="submit" :disabled="loading">
          {{ loading ? 'Sending code...' : 'Send Reset Code' }}
        </button>
      </form>

      <form v-else class="forgot-form" @submit.prevent="handleConfirmReset">
        <label>
          <span>Verification Code</span>
          <input v-model="code" type="text" minlength="6" maxlength="6" required />
        </label>

        <label>
          <span>New Password</span>
          <input v-model="newPassword" type="password" minlength="8" required />
        </label>

        <p v-if="debugCode" class="forgot-tip">
          当前未配置 SMTP，调试验证码：<strong>{{ debugCode }}</strong>
        </p>

        <p v-if="successMessage" class="forgot-success">{{ successMessage }}</p>
        <p v-if="errorMessage" class="forgot-error">{{ errorMessage }}</p>

        <button type="submit" :disabled="loading">
          {{ loading ? 'Resetting...' : 'Confirm Reset' }}
        </button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.forgot-page {
  min-height: calc(100vh - 72px);
  display: grid;
  place-items: center;
  padding: 2rem 1rem;
  background:
    radial-gradient(circle at 12% 12%, rgba(78, 121, 102, 0.22), transparent 34%),
    radial-gradient(circle at 84% 90%, rgba(71, 111, 150, 0.2), transparent 35%),
    #f3f8f5;
}

.forgot-card {
  width: min(520px, 100%);
  border-radius: 1rem;
  border: 1px solid #d8e3da;
  background: rgba(255, 255, 255, 0.92);
  padding: 1.4rem;
  box-shadow: 0 16px 44px rgba(28, 61, 50, 0.12);
}

.forgot-kicker {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #42665b;
  font-size: 0.72rem;
  font-weight: 700;
}

h1 {
  margin-top: 0.2rem;
  color: #193a33;
}

.forgot-subtitle {
  margin-top: 0.45rem;
  color: #4d625c;
}

.forgot-form {
  margin-top: 1rem;
  display: grid;
  gap: 0.85rem;
}

label {
  display: grid;
  gap: 0.33rem;
}

span {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #2b4b41;
}

input {
  border: 1px solid #cfddd2;
  border-radius: 0.7rem;
  padding: 0.68rem 0.8rem;
}

button {
  margin-top: 0.2rem;
  border: none;
  border-radius: 0.8rem;
  padding: 0.75rem 0.9rem;
  color: #fff;
  font-weight: 700;
  background: linear-gradient(135deg, #345f51 0%, #678642 100%);
}

.forgot-error {
  color: #af2e2e;
  font-size: 0.85rem;
}

.forgot-success {
  color: #215a45;
  font-size: 0.86rem;
}

.forgot-tip {
  color: #7a5c1b;
  font-size: 0.85rem;
}
</style>
