import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import { restoreSession, useAuthState } from '../services/authStore'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior() {
    return { top: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/risk-map',
      name: 'risk-map',
      component: () => import('../views/RiskMap.vue')
    },
    {
      path: '/route-planner',
      name: 'route-planner',
      component: () => import('../views/RoutePlanner.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/route-detail',
      name: 'route-detail',
      component: () => import('../views/RouteDetail.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/community-reports',
      name: 'community-reports',
      component: () => import('../views/CommunityReports.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/knowledge-hub',
      name: 'knowledge-hub',
      component: () => import('../views/KnowledgeHub.vue')
    },
    {
      path: '/report-hazard',
      name: 'report-hazard',
      component: () => import('../views/ReportHazard.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/location/:id?',
      name: 'location-detail',
      component: () => import('../views/LocationDetail.vue')
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/Login.vue'),
      meta: { guestOnly: true }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/Register.vue'),
      meta: { guestOnly: true }
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('../views/ForgotPassword.vue'),
      meta: { guestOnly: true }
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/Profile.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/admin-dashboard',
      name: 'admin-dashboard',
      component: () => import('../views/AdminDashboard.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
  ]
})

router.beforeEach(async (to) => {
  await restoreSession()
  const { isAuthenticated, state } = useAuthState()

  if (to.meta.requiresAuth && !isAuthenticated.value) {
    return { name: 'login', query: { redirect: encodeURIComponent(to.fullPath) } }
  }

  if (to.meta.guestOnly && isAuthenticated.value) {
    return { name: 'profile' }
  }

  if (to.meta.requiresAdmin && !state.user?.isAdmin) {
    return { name: 'profile' }
  }

  return true
})

export default router
