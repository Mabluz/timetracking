import { createRouter, createWebHistory } from 'vue-router'
import TimeTrackingView from '../views/TimeTrackingView.vue'
import MonthlyReportsView from '../views/MonthlyReportsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'timetracking',
      component: TimeTrackingView,
    },
    {
      path: '/monthly-reports',
      name: 'monthlyreports',
      component: MonthlyReportsView,
    },
  ],
})

export default router
