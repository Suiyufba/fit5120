import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import TrackUV from '../views/TrackUV.vue'
import RaisingAwareness from '../views/RaisingAwareness.vue'
import Prevention from '../views/Prevention.vue'
import Community from '../views/Community.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/track-uv', name: 'TrackUV', component: TrackUV },
  { path: '/raising-awareness', name: 'RaisingAwareness', component: RaisingAwareness },
  { path: '/prevention', name: 'Prevention', component: Prevention },
  { path: '/community', name: 'Community', component: Community },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
