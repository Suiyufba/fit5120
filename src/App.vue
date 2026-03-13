<script setup>
import Navbar from './components/Navbar.vue'
</script>

<template>
  <div id="app-wrapper">
    <Navbar />
    <main>
      <router-view />
    </main>
  </div>
</template>

<style scoped>
main {
  min-height: calc(100vh - 52px);
}
</style>
