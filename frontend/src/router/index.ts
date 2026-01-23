import { createRouter, createWebHistory } from 'vue-router'
import TimeTrackingView from '../views/TimeTrackingView.vue'
import MonthlyReportsView from '../views/MonthlyReportsView.vue'
import DefaultProjectsView from '../views/DefaultProjectsView.vue'
import YearlyStatisticsView from '../views/YearlyStatisticsView.vue'
import LoginView from '../views/LoginView.vue'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      name: 'timetracking',
      component: TimeTrackingView,
      meta: { requiresAuth: true }
    },
    {
      path: '/monthly-reports',
      name: 'monthlyreports',
      component: MonthlyReportsView,
      meta: { requiresAuth: true }
    },
    {
      path: '/default-projects',
      name: 'defaultprojects',
      component: DefaultProjectsView,
      meta: { requiresAuth: true }
    },
    {
      path: '/yearly-statistics',
      name: 'yearlystatistics',
      component: YearlyStatisticsView,
      meta: { requiresAuth: true }
    },
  ],
})

// Global route guard for authentication
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const isAuthRoute = to.name === 'login'

  // If going to login page, allow it
  if (isAuthRoute) {
    next()
    return
  }

  // If password protection is not enabled, allow access to all routes
  if (!authStore.isPasswordProtected) {
    next()
    return
  }

  // If user is authenticated, allow access
  if (authStore.isAuthenticated) {
    next()
    return
  }

  // If user is not authenticated and trying to access protected route, redirect to login
  next({ name: 'login' })
})

export default router
