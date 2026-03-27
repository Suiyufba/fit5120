<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { logout, useAuthState } from '../services/authStore'

const router = useRouter()
const { state } = useAuthState()

const levelMeta = computed(() => {
  const level = state.user?.experienceLevel || 'newcomer'
  if (level === 'advanced') {
    return { label: '老手', desc: '可以承担复杂线路，建议开启高阶路线规划。', badge: '#1f6e57' }
  }
  if (level === 'intermediate') {
    return { label: '中等', desc: '具备基本风控能力，建议挑战中级路线。', badge: '#8c6b23' }
  }
  return { label: '新人', desc: '建议先走基础路线，优先学习风险识别。', badge: '#3d5b7d' }
})

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
          <p>Age</p>
          <strong>{{ state.user.age }}</strong>
        </article>
        <article>
          <p>Region</p>
          <strong>{{ state.user.region }}</strong>
        </article>
        <article>
          <p>Assessment Score</p>
          <strong>{{ state.user.assessmentScore }}</strong>
        </article>
        <article>
          <p>Join Time</p>
          <strong>{{ new Date(state.user.createdAt).toLocaleDateString() }}</strong>
        </article>
      </div>

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
  width: min(780px, 100%);
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

.profile-grid article {
  border: 1px solid #dde7de;
  border-radius: 0.75rem;
  background: #fbfefc;
  padding: 0.8rem;
}

.profile-grid p {
  color: #4d665e;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.profile-grid strong {
  color: #193730;
  font-size: 1.05rem;
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
  .profile-grid {
    grid-template-columns: 1fr;
  }
}
</style>
