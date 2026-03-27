<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { resetPassword } from '../services/authStore'

const router = useRouter()
const loading = ref(false)
const email = ref('')
const securityQuestion = ref('What is the name of your first hiking trail?')
const securityAnswer = ref('')
const newPassword = ref('')
const errorMessage = ref('')
const successMessage = ref('')

async function handleConfirmReset() {
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await resetPassword({
      email: email.value,
      securityQuestion: securityQuestion.value,
      securityAnswer: securityAnswer.value,
      newPassword: newPassword.value,
    })
    successMessage.value = 'Password reset successfully. Redirecting to sign in...'
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
      <p class="forgot-kicker">GoHiking Account</p>
      <h1>Reset Password</h1>
      <p class="forgot-subtitle">Reset with your email and security answer.</p>

      <form class="forgot-form" @submit.prevent="handleConfirmReset">
        <label>
          <span>Email</span>
          <input v-model="email" type="email" required autocomplete="email" />
        </label>

        <label>
          <span>Security Question</span>
          <select v-model="securityQuestion" required>
            <option>What is the name of your first hiking trail?</option>
            <option>Which city were you born in?</option>
            <option>What is your favorite outdoor activity?</option>
            <option>What was your childhood nickname?</option>
          </select>
        </label>

        <label>
          <span>Security Answer</span>
          <input v-model="securityAnswer" type="text" required />
        </label>

        <label>
          <span>New Password</span>
          <input v-model="newPassword" type="password" minlength="8" required />
        </label>

        <p v-if="successMessage" class="forgot-success">{{ successMessage }}</p>
        <p v-if="errorMessage" class="forgot-error">{{ errorMessage }}</p>

        <button type="submit" :disabled="loading">
          {{ loading ? 'Resetting...' : 'Reset Password' }}
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

select {
  border: 1px solid #cfddd2;
  border-radius: 0.7rem;
  padding: 0.68rem 0.8rem;
  background: #fff;
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

</style>
