import { createRouter, createWebHistory } from 'vue-router'
import TimeTrackingView from '../views/TimeTrackingView.vue'
import MonthlyReportsView from '../views/MonthlyReportsView.vue'
import DefaultProjectsView from '../views/DefaultProjectsView.vue'
import YearlyStatisticsView from '../views/YearlyStatisticsView.vue'

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
    {
      path: '/default-projects',
      name: 'defaultprojects',
      component: DefaultProjectsView,
    },
    {
      path: '/yearly-statistics',
      name: 'yearlystatistics',
      component: YearlyStatisticsView,
    },
  ],
})

export default router
