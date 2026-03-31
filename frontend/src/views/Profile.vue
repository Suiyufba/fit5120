<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { logout, saveProfile, saveSensitiveProfile, useAuthState } from '../services/authStore'

const router = useRouter()
const { state } = useAuthState()

const profileForm = reactive({
  age: '',
  region: '',
})

const sensitiveForm = reactive({
  email: '',
  securityQuestion: '',
  securityAnswer: '',
  newPassword: '',
  confirmPassword: '',
})

const profileLoading = ref(false)
const profileMessage = ref('')
const profileError = ref('')

const sensitiveLoading = ref(false)
const sensitiveMessage = ref('')
const sensitiveError = ref('')

const levelMeta = computed(() => {
  const level = state.user?.experienceLevel || 'newcomer'
  if (level === 'advanced') {
    return { label: 'Advanced', desc: 'You can handle complex trails. Advanced planning is recommended.', badge: '#1f6e57' }
  }
  if (level === 'intermediate') {
    return { label: 'Intermediate', desc: 'You have solid risk awareness. Intermediate routes are a good fit.', badge: '#8c6b23' }
  }
  return { label: 'Newcomer', desc: 'Start with basic routes and focus on hazard awareness first.', badge: '#3d5b7d' }
})

watch(
  () => state.user,
  (user) => {
    if (!user) return
    profileForm.age = user.age ?? ''
    profileForm.region = user.region || ''
    sensitiveForm.email = user.email || ''
    sensitiveForm.securityQuestion = user.securityQuestion || ''
  },
  { immediate: true }
)

function resetSensitiveInputs() {
  sensitiveForm.securityAnswer = ''
  sensitiveForm.newPassword = ''
  sensitiveForm.confirmPassword = ''
}

async function handleSaveProfile() {
  profileLoading.value = true
  profileMessage.value = ''
  profileError.value = ''

  try {
    await saveProfile({
      age: profileForm.age,
      region: profileForm.region,
    })
    profileMessage.value = 'Profile updated successfully.'
  } catch (error) {
    profileError.value = error?.message || 'Failed to update profile'
  } finally {
    profileLoading.value = false
  }
}

async function handleSaveSensitive() {
  sensitiveLoading.value = true
  sensitiveMessage.value = ''
  sensitiveError.value = ''

  try {
    if (!sensitiveForm.securityQuestion) {
      throw new Error('Security question is missing for this account')
    }
    if (!sensitiveForm.securityAnswer.trim()) {
      throw new Error('Security answer is required')
    }
    if (sensitiveForm.newPassword && sensitiveForm.newPassword !== sensitiveForm.confirmPassword) {
      throw new Error('New password and confirm password must match')
    }
    if (!sensitiveForm.email.trim() && !sensitiveForm.newPassword.trim()) {
      throw new Error('Update your email or enter a new password')
    }

    await saveSensitiveProfile({
      email: sensitiveForm.email,
      newPassword: sensitiveForm.newPassword,
      securityQuestion: sensitiveForm.securityQuestion,
      securityAnswer: sensitiveForm.securityAnswer,
    })
    resetSensitiveInputs()
    sensitiveMessage.value = 'Sensitive account details updated successfully.'
  } catch (error) {
    sensitiveError.value = error?.message || 'Failed to update credentials'
  } finally {
    sensitiveLoading.value = false
  }
}

function handleLogout() {
  logout()
  router.push('/login')
}
</script>

<template>
  <main class="profile-page">
    <section class="profile-card" v-if="state.user">
      <div class="profile-head">
        <div>
          <p class="profile-kicker">Member Center</p>
          <h1>{{ state.user.email }}</h1>
        </div>
        <span class="level-badge" :style="{ background: levelMeta.badge }">{{ levelMeta.label }}</span>
      </div>

      <p class="level-desc">{{ levelMeta.desc }}</p>

      <div class="profile-grid">
        <article>
          <p>Assessment Score</p>
          <strong>{{ state.user.assessmentScore }}</strong>
        </article>
        <article>
          <p>Join Time</p>
          <strong>{{ new Date(state.user.createdAt).toLocaleDateString() }}</strong>
        </article>
      </div>

      <section class="profile-panel">
        <div class="panel-head">
          <div>
            <h2>Basic Profile</h2>
            <p>Age and region can be updated directly from your profile.</p>
          </div>
        </div>

        <form class="profile-form" @submit.prevent="handleSaveProfile">
          <label>
            <span>Age</span>
            <input v-model="profileForm.age" type="number" min="10" max="100" required />
          </label>
          <label>
            <span>Region</span>
            <input v-model="profileForm.region" type="text" required />
          </label>
          <p v-if="profileMessage" class="form-success">{{ profileMessage }}</p>
          <p v-if="profileError" class="form-error">{{ profileError }}</p>
          <button type="submit" class="primary-btn" :disabled="profileLoading">
            {{ profileLoading ? 'Saving...' : 'Save Profile' }}
          </button>
        </form>
      </section>

      <section class="profile-panel profile-panel--sensitive">
        <div class="panel-head">
          <div>
            <h2>Email & Password</h2>
            <p>To change your email or password, answer your security question correctly first.</p>
          </div>
          <span class="security-pill">Protected</span>
        </div>

        <form class="profile-form" @submit.prevent="handleSaveSensitive">
          <label>
            <span>Email</span>
            <input v-model="sensitiveForm.email" type="email" />
          </label>
          <label>
            <span>Security Question</span>
            <input :value="sensitiveForm.securityQuestion" type="text" disabled />
          </label>
          <label>
            <span>Security Answer</span>
            <input v-model="sensitiveForm.securityAnswer" type="text" required />
          </label>
          <label>
            <span>New Password</span>
            <input v-model="sensitiveForm.newPassword" type="password" minlength="12" placeholder="Leave blank to keep current password" />
          </label>
          <label>
            <span>Confirm New Password</span>
            <input v-model="sensitiveForm.confirmPassword" type="password" minlength="12" placeholder="Repeat your new password" />
          </label>
          <p v-if="sensitiveMessage" class="form-success">{{ sensitiveMessage }}</p>
          <p v-if="sensitiveError" class="form-error">{{ sensitiveError }}</p>
          <button type="submit" class="primary-btn" :disabled="sensitiveLoading">
            {{ sensitiveLoading ? 'Verifying...' : 'Update Email / Password' }}
          </button>
        </form>
      </section>

      <button class="logout-btn" @click="handleLogout">Sign Out</button>
    </section>
  </main>
</template>

<style scoped>
.profile-page {
  min-height: calc(100vh - 72px);
  display: grid;
  place-items: center;
  padding: 2rem 1rem;
  background:
    radial-gradient(circle at 14% 10%, rgba(90, 138, 114, 0.2), transparent 35%),
    radial-gradient(circle at 88% 90%, rgba(74, 115, 162, 0.2), transparent 38%),
    #f3f8f6;
}

.profile-card {
  width: min(860px, 100%);
  border: 1px solid #d8e4db;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.93);
  padding: 1.4rem;
  box-shadow: 0 20px 46px rgba(27, 58, 48, 0.12);
}

.profile-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.profile-kicker {
  color: #42685c;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.72rem;
  font-weight: 700;
}

h1 {
  color: #1a3932;
  font-size: 1.5rem;
}

.level-badge {
  color: #fff;
  border-radius: 999px;
  padding: 0.45rem 0.8rem;
  font-weight: 700;
}

.level-desc {
  margin-top: 0.7rem;
  color: #48635c;
}

.profile-grid {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.profile-grid article,
.profile-panel {
  border: 1px solid #dde7de;
  border-radius: 0.75rem;
  background: #fbfefc;
  padding: 0.95rem;
}

.profile-grid p,
.profile-form span {
  color: #4d665e;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.profile-grid strong {
  color: #193730;
  font-size: 1.05rem;
}

.profile-panel {
  margin-top: 1rem;
}

.profile-panel--sensitive {
  background: linear-gradient(180deg, #fbfefc 0%, #f5faf7 100%);
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.8rem;
}

.panel-head h2 {
  color: #18372f;
  font-size: 1.1rem;
  font-weight: 800;
}

.panel-head p {
  margin-top: 0.2rem;
  color: #567068;
  font-size: 0.92rem;
}

.security-pill {
  border-radius: 999px;
  background: #e8f3ed;
  color: #2f6755;
  padding: 0.35rem 0.7rem;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.profile-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
}

.profile-form label {
  display: grid;
  gap: 0.35rem;
}

.profile-form input {
  border: 1px solid #cfddd2;
  border-radius: 0.75rem;
  padding: 0.75rem 0.85rem;
  background: #fff;
  color: #17352f;
}

.profile-form input:disabled {
  background: #f1f5f2;
  color: #50655f;
}

.form-success,
.form-error {
  grid-column: 1 / -1;
  border-radius: 0.75rem;
  padding: 0.75rem 0.85rem;
  font-size: 0.92rem;
}

.form-success {
  background: #edf9f1;
  color: #226045;
  border: 1px solid #cde7d5;
}

.form-error {
  background: #fff1ef;
  color: #a33d32;
  border: 1px solid #f0c7c0;
}

.primary-btn {
  grid-column: 1 / -1;
  border: none;
  border-radius: 0.8rem;
  padding: 0.78rem 0.95rem;
  color: #fff;
  font-weight: 700;
  background: linear-gradient(135deg, #356456 0%, #5f7f3f 100%);
}

.primary-btn:disabled {
  opacity: 0.65;
}

.logout-btn {
  margin-top: 1rem;
  border: 1px solid #bcd0bf;
  border-radius: 0.75rem;
  padding: 0.6rem 0.9rem;
  background: #ffffff;
  color: #25473d;
  font-weight: 700;
}

@media (max-width: 700px) {
  .profile-page {
    padding: 1rem 0.85rem 1.4rem;
  }

  .profile-card {
    padding: 1rem;
    border-radius: 1.1rem;
  }

  .profile-grid,
  .profile-form {
    grid-template-columns: 1fr;
  }

  .profile-head,
  .panel-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
