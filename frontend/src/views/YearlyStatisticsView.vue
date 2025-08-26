<template>
  <div class="yearly-statistics">
    <div class="statistics-header">
      <h2>📊 Yearly Statistics</h2>

      <div class="year-selector">
        <label for="year">Select Year:</label>
        <select id="year" v-model="selectedYear" class="year-input">
          <option v-for="year in availableYears" :key="year" :value="year">
            {{ year }}
          </option>
        </select>
      </div>
    </div>

    <div v-if="selectedYear && statistics" class="statistics-content">
      <!-- Core Stats Section -->
      <div class="stats-section">
        <h3>🎯 Core Statistics</h3>
        <div class="stats-grid">
          <div class="stat-card primary">
            <div class="stat-value">{{ Math.round(statistics.totalHours * 100) / 100 }}h</div>
            <div class="stat-label">Total Hours Worked</div>
          </div>
          <div class="stat-card success">
            <div class="stat-value">{{ Math.round(statistics.totalRevenue).toLocaleString() }} kr</div>
            <div class="stat-label">Total Revenue Generated</div>
          </div>
          <div class="stat-card info">
            <div class="stat-value">{{ statistics.averageHourlyRate }} kr</div>
            <div class="stat-label">Average Hourly Rate</div>
          </div>
          <div class="stat-card warning">
            <div class="stat-value">{{ statistics.workingDays }}</div>
            <div class="stat-label">Working Days</div>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="charts-section">
        <div class="chart-container-wrapper">
          <h4>Monthly Hours Breakdown</h4>
          <BarChart
            :data="monthlyChartData"
            :width="800"
            :height="300"
            value-suffix="h"
            :format-value="(v) => Math.round(v * 100) / 100 + ''"
          />
        </div>

        <div class="chart-container-wrapper">
          <h4>Billable vs Non-Billable Hours</h4>
          <DonutChart
            :data="billableChartData"
            :width="300"
            :height="300"
            value-suffix="h"
            center-primary="Total Hours"
            :center-secondary="Math.round(statistics.totalHours * 100) / 100 + 'h'"
            :format-value="(v) => Math.round(v * 100) / 100 + ''"
          />
        </div>
      </div>

      <!-- Top Projects Section -->
      <div class="stats-section">
        <h3>🏆 Top 3 Projects by Revenue</h3>
        <div class="top-projects">
          <div
            v-for="(project, index) in statistics.topProjects.slice(0, 3)"
            :key="project.name"
            class="project-card"
            :class="{ 'first': index === 0, 'second': index === 1, 'third': index === 2 }"
          >
            <div class="project-rank">{{ index + 1 }}</div>
            <div class="project-info">
              <div class="project-name">{{ project.name }}</div>
              <div class="project-stats">
                <span class="project-hours">{{ Math.round(project.totalHours * 100) / 100 }}h</span>
                <span class="project-revenue">{{ Math.round(project.revenue).toLocaleString() }} kr</span>
                <span class="project-percentage">{{ project.percentage.toFixed(1) }}% of total</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Productivity Insights Section -->
      <div class="stats-section">
        <h3>🎯 Productivity Insights</h3>
        <div class="insights-grid">
          <div class="insight-card">
            <div class="insight-icon">📈</div>
            <div class="insight-content">
              <div class="insight-title">Busiest Month</div>
              <div class="insight-value">{{ statistics.busiestMonth.month }}</div>
              <div class="insight-detail">{{ Math.round(statistics.busiestMonth.hours * 100) / 100 }}h ({{ statistics.busiestMonth.percentage.toFixed(1) }}% of year)</div>
            </div>
          </div>

          <div class="insight-card">
            <div class="insight-icon">📉</div>
            <div class="insight-content">
              <div class="insight-title">Least Busy Month</div>
              <div class="insight-value">{{ statistics.leastBusyMonth.month }}</div>
              <div class="insight-detail">{{ Math.round(statistics.leastBusyMonth.hours * 100) / 100 }}h ({{ statistics.leastBusyMonth.percentage.toFixed(1) }}% of year)</div>
            </div>
          </div>

          <div class="insight-card">
            <div class="insight-icon">⏰</div>
            <div class="insight-content">
              <div class="insight-title">Average Daily Hours</div>
              <div class="insight-value">{{ statistics.averageDailyHours.toFixed(1) }}h</div>
              <div class="insight-detail">{{ statistics.averageDailyHours > defaultWorkDayHours ? 'Above' : statistics.averageDailyHours < defaultWorkDayHours ? 'Below' : 'Equal to' }} typical {{ defaultWorkDayHours }}h days</div>
            </div>
          </div>

          <div class="insight-card">
            <div class="insight-icon">🔥</div>
            <div class="insight-content">
              <div class="insight-title">Longest Work Streak</div>
              <div class="insight-value">{{ statistics.longestStreak }} days</div>
              <div class="insight-detail">Most consecutive working days</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Fun Stats Section -->
      <div class="stats-section fun-stats">
        <h3>🏆 Achievements & Fun Facts</h3>
        <div class="fun-stats-grid">
          <div class="fun-stat-card">
            <div class="fun-stat-icon">👑</div>
            <div class="fun-stat-content">
              <div class="fun-stat-title">Most Frequent Project</div>
              <div class="fun-stat-value">{{ mostFrequentProject?.name || 'N/A' }}</div>
              <div class="fun-stat-subtitle">Your VIP client of {{ selectedYear }}</div>
            </div>
          </div>

          <div class="fun-stat-card">
            <div class="fun-stat-icon">☕</div>
            <div class="fun-stat-content">
              <div class="fun-stat-title">Coffee Equivalent</div>
              <div class="fun-stat-value">{{ Math.round(statistics.coffeeEquivalent) }} cups</div>
              <div class="fun-stat-subtitle">Estimated caffeine consumed</div>
            </div>
          </div>

          <div class="fun-stat-card">
            <div class="fun-stat-icon">🎯</div>
            <div class="fun-stat-content">
              <div class="fun-stat-title">Milestones Achieved</div>
              <div class="fun-stat-badges">
                <span
                  v-for="milestone in statistics.milestones"
                  :key="milestone"
                  class="milestone-badge"
                >
                  {{ milestone }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="selectedYear" class="no-data">
      <div class="no-data-icon">📊</div>
      <h3>No Data Available</h3>
      <p>No time tracking data found for {{ selectedYear }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTimeTrackingStore } from '@/stores/timetracking'
import BarChart from '@/components/charts/BarChart.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import type { YearlyStatistics } from '@/types'

const store = useTimeTrackingStore()
const selectedYear = ref<number>(new Date().getFullYear())

const defaultWorkDayHours = computed(() => Number(import.meta.env.VITE_DEFAULT_WORK_DAY_HOURS) || 7.5)

const availableYears = computed(() => {
  const years = new Set<number>()
  store.timeEntries.forEach(entry => {
    years.add(new Date(entry.date).getFullYear())
  })
  const yearsList = Array.from(years).sort((a, b) => b - a)
  return yearsList.length > 0 ? yearsList : [new Date().getFullYear()]
})

const statistics = computed((): YearlyStatistics | null => {
  return store.calculateYearlyStatistics(selectedYear.value)
})

const mostFrequentProject = computed(() => {
  if (!statistics.value) return null
  return statistics.value.topProjects.reduce((most, current) =>
    current.totalHours > (most?.totalHours || 0) ? current : most
  )
})

const monthlyChartData = computed(() => {
  if (!statistics.value) return []

  return statistics.value.monthlyBreakdown.map(month => ({
    label: month.month,
    value: month.totalHours,
    color: '#007bff'
  }))
})

const billableChartData = computed(() => {
  if (!statistics.value) return []

  return [
    {
      label: 'Billable Hours',
      value: statistics.value.billableHours,
      color: '#28a745'
    },
    {
      label: 'Non-Billable Hours',
      value: statistics.value.nonBillableHours,
      color: '#dc3545'
    }
  ]
})

onMounted(() => {
  if (store.timeEntries.length === 0) {
    store.fetchTimeEntries()
  }
})
</script>

<style scoped>
.yearly-statistics {
  height: 100%;
  overflow-y: auto;
}

.statistics-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #dee2e6;
}

.statistics-header h2 {
  margin: 0;
  color: #333;
  font-size: 24px;
  font-weight: 600;
}

.year-selector {
  display: flex;
  align-items: center;
  gap: 12px;
}

.year-selector label {
  font-weight: 500;
  color: #495057;
}

.year-input {
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  background: white;
}

.statistics-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.stats-section {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stats-section h3 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 20px;
  font-weight: 600;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.stat-card {
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  border-left: 4px solid #007bff;
}

.stat-card.primary {
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: white;
  border-left-color: #0056b3;
}

.stat-card.success {
  background: linear-gradient(135deg, #28a745, #1e7e34);
  color: white;
  border-left-color: #1e7e34;
}

.stat-card.info {
  background: linear-gradient(135deg, #17a2b8, #117a8b);
  color: white;
  border-left-color: #117a8b;
}

.stat-card.warning {
  background: linear-gradient(135deg, #ffc107, #d39e00);
  color: #333;
  border-left-color: #d39e00;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  opacity: 0.9;
}

.charts-section {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 32px;
  align-items: start;
}

.chart-container-wrapper {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.chart-container-wrapper h4 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 18px;
  font-weight: 600;
}

.top-projects {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.project-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 8px;
  background: #f8f9fa;
  border-left: 4px solid #dee2e6;
}

.project-card.first {
  background: linear-gradient(135deg, #ffd700, #ffed4a);
  border-left-color: #f39c12;
}

.project-card.second {
  background: linear-gradient(135deg, #c0c0c0, #95a5a6);
  border-left-color: #7f8c8d;
}

.project-card.third {
  background: linear-gradient(135deg, #cd7f32, #a0522d);
  border-left-color: #8b4513;
  color: white;
}

.project-rank {
  font-size: 24px;
  font-weight: 700;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
}

.project-info {
  flex-grow: 1;
}

.project-name {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.project-stats {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.project-hours,
.project-revenue,
.project-percentage {
  font-size: 14px;
  font-weight: 500;
}

.insights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.insight-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #007bff;
}

.insight-icon {
  font-size: 32px;
  width: 50px;
  text-align: center;
}

.insight-content {
  flex-grow: 1;
}

.insight-title {
  font-size: 14px;
  color: #6c757d;
  margin-bottom: 4px;
}

.insight-value {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.insight-detail {
  font-size: 12px;
  color: #6c757d;
}

.fun-stats {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.fun-stats h3 {
  color: white;
}

.fun-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.fun-stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

.fun-stat-icon {
  font-size: 40px;
  width: 60px;
  text-align: center;
}

.fun-stat-content {
  flex-grow: 1;
}

.fun-stat-title {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 4px;
}

.fun-stat-value {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
}

.fun-stat-subtitle {
  font-size: 12px;
  opacity: 0.8;
}

.fun-stat-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.milestone-badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.no-data {
  text-align: center;
  padding: 60px 20px;
  color: #6c757d;
}

.no-data-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.no-data h3 {
  margin-bottom: 12px;
  color: #495057;
}

@media (max-width: 768px) {
  .statistics-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .charts-section {
    grid-template-columns: 1fr;
  }

  .stats-grid,
  .insights-grid,
  .fun-stats-grid {
    grid-template-columns: 1fr;
  }

  .project-card {
    flex-direction: column;
    text-align: center;
  }
}
</style>
