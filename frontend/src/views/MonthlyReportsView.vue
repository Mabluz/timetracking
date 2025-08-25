<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTimeTrackingStore } from '@/stores/timetracking'
import type { TimeEntry } from '@/types'

const store = useTimeTrackingStore()
const selectedMonth = ref<string>('')

// Get current month as default
const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format
selectedMonth.value = currentMonth

const monthlyData = computed(() => {
  if (!selectedMonth.value) return { entries: [], summary: [] }
  
  const monthEntries = store.timeEntries.filter(entry => 
    entry.date.startsWith(selectedMonth.value)
  )
  
  // Group by project
  const projectSummary = new Map<string, { hours: number, entries: number }>()
  
  monthEntries.forEach(entry => {
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
    totalDays: monthEntries.length
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

      <div class="daily-breakdown">
        <h4>Daily Breakdown</h4>
        <div v-if="monthlyData.entries.length === 0" class="no-data">
          No entries found for {{ monthName }}
        </div>
        <div v-else class="entries-list">
          <div 
            v-for="entry in monthlyData.entries" 
            :key="entry.id"
            class="entry-item"
            :class="{ imported: entry.imported }"
          >
            <div class="entry-date">
              {{ new Date(entry.date).toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
              }) }}
              <span v-if="entry.imported" class="imported-badge">Imported</span>
            </div>
            <div class="entry-details">
              <div class="entry-time">
                {{ entry.startTime }} - {{ entry.endTime }} 
                ({{ entry.totalHours }}h total)
              </div>
              <div class="entry-projects">
                <span 
                  v-for="project in entry.projects" 
                  :key="project.id"
                  class="project-tag"
                >
                  {{ project.name }}: {{ project.hoursAllocated }}h
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
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

.projects-summary,
.daily-breakdown {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.projects-summary h4,
.daily-breakdown h4 {
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

.entries-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.entry-item {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 4px;
  border-left: 4px solid #007bff;
}

.entry-item.imported {
  border-left-color: #28a745;
  background: #d4edda;
}

.entry-date {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.imported-badge {
  background: #28a745;
  color: white;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 12px;
  font-weight: 500;
}

.entry-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.entry-time {
  font-size: 14px;
  color: #495057;
}

.entry-projects {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.project-tag {
  background: #007bff;
  color: white;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 12px;
  font-weight: 500;
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
  
  .entry-projects {
    flex-direction: column;
    gap: 4px;
  }
}
</style>