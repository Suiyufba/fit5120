<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const isMenuOpen = ref(false)

const navItems = [
  { name: 'Home', path: '/' },
  { name: 'Risk Map', path: '/risk-map' },
  { name: 'Plan Route', path: '/route-planner' },
  { name: 'Community Reports', path: '/community-reports' },
  { name: 'Knowledge Hub', path: '/knowledge-hub' },
]

const isActive = (path) => {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>

<template>
  <header class="bg-white/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm bg-surface-container-low">
    <nav class="flex justify-between items-center px-8 py-4 max-w-full mx-auto">
      <router-link to="/" class="text-2xl font-black text-[#4A6741] italic font-headline tracking-tight">
        HikeShield Victoria
      </router-link>

      <div class="hidden md:flex items-center gap-8 font-headline font-bold tracking-tight text-on-surface">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="transition-all duration-300"
          :class="isActive(item.path)
            ? 'text-[#4A6741] border-b-2 border-[#4A6741] pb-1'
            : 'text-slate-600 hover:text-[#4A6741]'"
        >
          {{ item.name }}
        </router-link>
      </div>

      <div class="flex items-center gap-4">
        <button class="p-2 rounded-full hover:bg-slate-100/50 transition-all active:scale-95">
          <span class="material-symbols-outlined text-[#4A6741]">account_circle</span>
        </button>
        <button
          class="md:hidden p-2 rounded-full hover:bg-slate-100/50 transition-all"
          @click="isMenuOpen = !isMenuOpen"
        >
          <span class="material-symbols-outlined text-on-surface">{{ isMenuOpen ? 'close' : 'menu' }}</span>
        </button>
      </div>
    </nav>

    <transition name="dropdown">
      <div v-if="isMenuOpen" class="md:hidden px-8 pb-4 flex flex-col gap-2 bg-surface-container-low">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="py-3 px-4 rounded-lg font-headline font-bold tracking-tight transition-all"
          :class="isActive(item.path)
            ? 'text-[#4A6741] bg-primary/5'
            : 'text-slate-600 hover:text-[#4A6741] hover:bg-slate-50'"
          @click="isMenuOpen = false"
        >
          {{ item.name }}
        </router-link>
      </div>
    </transition>
  </header>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  max-height: 0;
}
.dropdown-enter-to,
.dropdown-leave-from {
  opacity: 1;
  max-height: 400px;
}
</style>
