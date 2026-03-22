<script setup>
import { ref, onMounted } from 'vue'

const isDark = ref(false)

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

onMounted(() => {
  const savedTheme = localStorage.getItem('theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    isDark.value = true
    document.documentElement.setAttribute('data-theme', 'dark')
  }
})
</script>

<template>
  <button 
    class="theme-toggle" 
    @click="toggleTheme"
    :title="isDark ? '切换到亮色模式' : '切换到深色模式'"
    aria-label="切换主题"
  >
    <span class="icon-sun" :class="{ hidden: isDark }">☀️</span>
    <span class="icon-moon" :class="{ hidden: !isDark }">🌙</span>
  </button>
</template>

<style scoped>
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.2s;
  font-size: 1.2rem;
}

.theme-toggle:hover {
  background: rgba(255, 107, 53, 0.1);
}

.icon-sun,
.icon-moon {
  transition: opacity 0.2s, transform 0.2s;
}

.hidden {
  opacity: 0;
  position: absolute;
  pointer-events: none;
}
</style>