<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { resetPassword } from '../services/authStore'

const router = useRouter()
const loading = ref(false)
const email = ref('')
const securityQuestion = ref('What was the passphrase of your first personal emergency contact card?')
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
      <p class="forgot-kicker">HikeShield Account</p>
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
            <option>What was the passphrase of your first personal emergency contact card?</option>
            <option>What private nickname did your family use for your first camping stove?</option>
            <option>What is the hidden word in your personal offline route notebook?</option>
            <option>What custom name did you give your first headlamp?</option>
          </select>
        </label>

        <label>
          <span>Security Answer</span>
          <input v-model="securityAnswer" type="text" required />
        </label>

        <label>
          <span>New Password</span>
          <input v-model="newPassword" type="password" minlength="12" required />
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
    linear-gradient(110deg, rgba(23, 59, 49, 0.86), rgba(23, 59, 49, 0.28)),
    var(--hs-hero-image) center/cover;
}

.forgot-card {
  width: min(520px, 100%);
  border-radius: 1.25rem;
  border: 1px solid rgba(255, 255, 255, 0.48);
  background: rgba(255, 250, 242, 0.9);
  padding: 1.4rem;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.22);
  backdrop-filter: blur(18px);
}

.forgot-kicker {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: #42665b;
  font-size: 0.72rem;
  font-weight: 900;
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
  grid-template-columns: minmax(0, 1fr);
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
  width: 100%;
  border: 1px solid rgba(33, 72, 59, 0.14);
  border-radius: 0.85rem;
  padding: 0.78rem 0.9rem;
}

@media (max-width: 640px) {
  .forgot-page {
    padding: 1rem 0.85rem 1.4rem;
  }

  .forgot-card {
    padding: 1.05rem;
    border-radius: 1.1rem;
  }

  h1 {
    font-size: 1.7rem;
  }
}

select {
  width: 100%;
  border: 1px solid rgba(33, 72, 59, 0.14);
  border-radius: 0.85rem;
  padding: 0.78rem 0.9rem;
  background: #fff;
}

button {
  width: 100%;
  margin-top: 0.2rem;
  border: none;
  border-radius: 999px;
  padding: 0.86rem 1rem;
  color: #fffaf2;
  font-weight: 800;
  background: linear-gradient(135deg, #173b31, #2f604e 68%, #7f9b75);
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
