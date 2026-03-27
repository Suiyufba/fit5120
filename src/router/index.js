import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'

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
      component: () => import('../views/RoutePlanner.vue')
    },
    {
      path: '/route-detail',
      name: 'route-detail',
      component: () => import('../views/RouteDetail.vue')
    },
    {
      path: '/community-reports',
      name: 'community-reports',
      component: () => import('../views/CommunityReports.vue')
    },
    {
      path: '/knowledge-hub',
      name: 'knowledge-hub',
      component: () => import('../views/KnowledgeHub.vue')
    },
    {
      path: '/report-hazard',
      name: 'report-hazard',
      component: () => import('../views/ReportHazard.vue')
    },
    {
      path: '/location/:id?',
      name: 'location-detail',
      component: () => import('../views/LocationDetail.vue')
    },
  ]
})

export default router
