<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTimeTrackingStore } from '@/stores/timetracking'
import MonthlyCalendar from '@/components/calendar/MonthlyCalendar.vue'
import type { TimeEntry } from '@/types'

const store = useTimeTrackingStore()
const selectedMonth = ref<string>('')

// Get current month as default
const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format
selectedMonth.value = currentMonth

const monthlyData = computed(() => {
  if (!selectedMonth.value) return { entries: [], summary: [], totalHours: 0, totalDays: 0, totalOvertimeHours: 0 }
  
  
  const monthEntries = store.timeEntries.filter(entry => 
    entry.date.startsWith(selectedMonth.value)
  )
  
  // Group by project
  const projectSummary = new Map<string, { hours: number, entries: number }>()
  
  // Calculate overtime
  const defaultWorkDayHours = Number(import.meta.env.VITE_DEFAULT_WORK_DAY_HOURS) || 7.5
  let totalOvertimeHours = 0
  
  monthEntries.forEach(entry => {
    // Calculate overtime for each entry
    const entryOvertimeHours = Math.max(0, (entry.totalHours || 0) - defaultWorkDayHours)
    totalOvertimeHours += entryOvertimeHours
    
    entry.projects.forEach(project => {
      const existing = projectSummary.get(project.name) || { hours: 0, entries: 0 }
      existing.hours += project.hoursAllocated
      existing.entries += 1
      projectSummary.set(project.name, existing)
    })
  })
  
  const summary = Array.from(projectSummary.entries()).map(([name, data]) => ({
    name,
    hours: Math.round(data.hours * 100) / 100,
    entries: data.entries
  })).sort((a, b) => b.hours - a.hours)
  
  return {
    entries: monthEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    summary,
    totalHours: summary.reduce((total, project) => total + project.hours, 0),
    totalDays: monthEntries.length,
    totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100
  }
})

const monthName = computed(() => {
  if (!selectedMonth.value) return ''
  const [year, month] = selectedMonth.value.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
})

const markMonthAsImported = async () => {
  if (!selectedMonth.value) return
  
  const monthEntries = store.timeEntries.filter(entry => 
    entry.date.startsWith(selectedMonth.value)
  )
  
  // Update all entries for this month to mark as imported
  for (const entry of monthEntries) {
    if (!entry.imported) {
      await store.updateTimeEntry(entry.id, { imported: true })
    }
  }
}

onMounted(() => {
  if (store.timeEntries.length === 0) {
    store.fetchTimeEntries()
  }
})
</script>

<template>
  <div class="monthly-reports">
    <div class="reports-header">
      <h2>Monthly Reports</h2>
      
      <div class="month-selector">
        <label for="month">Select Month:</label>
        <input 
          id="month"
          type="month" 
          v-model="selectedMonth"
          class="month-input"
        />
      </div>
    </div>

    <div v-if="selectedMonth" class="reports-content">
      <div class="month-summary">
        <h3>{{ monthName }} Summary</h3>
        <div class="summary-stats">
          <div class="stat-item">
            <span class="stat-label">Total Hours:</span>
            <span class="stat-value">{{ Math.round(monthlyData.totalHours * 100) / 100 }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Working Days:</span>
            <span class="stat-value">{{ monthlyData.totalDays }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Overtime Hours:</span>
            <span class="stat-value overtime" :class="{ 'has-overtime': monthlyData.totalOvertimeHours > 0 }">
              {{ monthlyData.totalOvertimeHours > 0 ? '+' : '' }}{{ monthlyData.totalOvertimeHours }}h
            </span>
          </div>
        </div>
        
        <button 
          @click="markMonthAsImported"
          class="import-button"
          :disabled="monthlyData.entries.length === 0"
        >
          Mark Month as Imported
        </button>
      </div>

      <div class="projects-summary">
        <h4>Projects Summary</h4>
        <div v-if="monthlyData.summary.length === 0" class="no-data">
          No projects found for {{ monthName }}
        </div>
        <div v-else class="projects-list">
          <div 
            v-for="project in monthlyData.summary" 
            :key="project.name"
            class="project-item"
          >
            <div class="project-name">{{ project.name }}</div>
            <div class="project-stats">
              <span class="project-hours">{{ project.hours }}h</span>
              <span class="project-entries">({{ project.entries }} entries)</span>
            </div>
          </div>
        </div>
      </div>

      <MonthlyCalendar 
        :selected-month="selectedMonth"
        :entries="monthlyData.entries"
      />
    </div>
  </div>
</template>

<style scoped>
.monthly-reports {
  height: 100%;
  overflow-y: auto;
}

.reports-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #dee2e6;
}

.reports-header h2 {
  margin: 0;
  color: #333;
  font-size: 24px;
  font-weight: 600;
}

.month-selector {
  display: flex;
  align-items: center;
  gap: 12px;
}

.month-selector label {
  font-weight: 500;
  color: #495057;
}

.month-input {
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  background: white;
}

.reports-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.month-summary {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.month-summary h3 {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 20px;
}

.summary-stats {
  display: flex;
  gap: 32px;
  margin-bottom: 20px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 14px;
  color: #6c757d;
  font-weight: 500;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #007bff;
}

.stat-value.overtime {
  color: #6c757d;
  transition: all 0.3s ease;
}

.stat-value.overtime.has-overtime {
  color: #fd7e14;
  background: linear-gradient(135deg, #fff3cd, #ffeaa7);
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid #ffc107;
  box-shadow: 0 2px 4px rgba(255, 193, 7, 0.2);
}

.import-button {
  background: #28a745;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
}

.import-button:hover:not(:disabled) {
  background: #218838;
}

.import-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.projects-summary {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.projects-summary h4 {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 18px;
}

.no-data {
  text-align: center;
  color: #6c757d;
  font-style: italic;
  padding: 20px;
}

.projects-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.project-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 4px;
  border-left: 4px solid #007bff;
}

.project-name {
  font-weight: 500;
  color: #333;
}

.project-stats {
  display: flex;
  align-items: center;
  gap: 8px;
}

.project-hours {
  font-weight: 600;
  color: #007bff;
}

.project-entries {
  font-size: 14px;
  color: #6c757d;
}

@media (max-width: 768px) {
  .reports-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .summary-stats {
    flex-direction: column;
    gap: 16px;
  }
  
  .project-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>