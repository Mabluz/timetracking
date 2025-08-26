<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTimeTrackingStore } from '@/stores/timetracking'
import DatePicker from '@/components/common/DatePicker.vue'

// Props (if needed in future)
interface Props {
  workWeekHours?: number
}

const props = withDefaults(defineProps<Props>(), {
  workWeekHours: Number(import.meta.env.VITE_DEFAULT_WORK_DAY_HOURS) * 5 || 37.5
})

// Store
const store = useTimeTrackingStore()

// Reactive state
const fromDate = ref('')
const toDate = ref('')
const configuredWorkWeekHours = ref(props.workWeekHours)
const isManualOverride = ref(false)

// Computed properties
const defaultWorkDayHours = computed(() => Number(import.meta.env.VITE_DEFAULT_WORK_DAY_HOURS) || 7.5)

// Save date range to localStorage
const saveDateRange = () => {
  localStorage.setItem('workWeekAnalyzer_fromDate', fromDate.value)
  localStorage.setItem('workWeekAnalyzer_toDate', toDate.value)
}

// Load date range from localStorage
const loadDateRange = () => {
  const savedFromDate = localStorage.getItem('workWeekAnalyzer_fromDate')
  const savedToDate = localStorage.getItem('workWeekAnalyzer_toDate')
  
  if (savedFromDate && savedToDate) {
    fromDate.value = savedFromDate
    toDate.value = savedToDate
    return true
  }
  return false
}

// Set default date range (current week)
const initializeDateRange = () => {
  // First try to load saved dates from localStorage
  if (loadDateRange()) {
    return
  }
  
  // If no saved dates, use current week as default
  const today = new Date()
  const currentWeekStart = new Date(today)
  currentWeekStart.setDate(today.getDate() - today.getDay() + 1) // Monday
  const currentWeekEnd = new Date(today)
  currentWeekEnd.setDate(today.getDate() - today.getDay() + 7) // Sunday
  
  fromDate.value = currentWeekStart.toISOString().split('T')[0]
  toDate.value = currentWeekEnd.toISOString().split('T')[0]
}

// Initialize on mount
initializeDateRange()

// Computed properties
const filteredTimeEntries = computed(() => {
  if (!fromDate.value || !toDate.value) return []
  
  return store.timeEntries.filter(entry => {
    const entryDate = new Date(entry.date)
    const from = new Date(fromDate.value)
    const to = new Date(toDate.value)
    
    return entryDate >= from && entryDate <= to
  })
})

const totalHoursInRange = computed(() => {
  return filteredTimeEntries.value.reduce((total, entry) => {
    return total + (entry.totalHours || 0)
  }, 0)
})

const workWeekPercentage = computed(() => {
  if (configuredWorkWeekHours.value === 0) return 0
  return (totalHoursInRange.value / configuredWorkWeekHours.value) * 100
})

const isOvertime = computed(() => {
  return totalHoursInRange.value > configuredWorkWeekHours.value
})

const hoursShortfall = computed(() => {
  return Math.max(0, configuredWorkWeekHours.value - totalHoursInRange.value)
})

const overtimeHours = computed(() => {
  return Math.max(0, totalHoursInRange.value - configuredWorkWeekHours.value)
})

// Format hours to 2 decimal places
const formatHours = (hours: number): string => {
  return hours.toFixed(2)
}

// Format percentage to 1 decimal place
const formatPercentage = (percentage: number): string => {
  return percentage.toFixed(1)
}

// Date range validation
const isValidDateRange = computed(() => {
  if (!fromDate.value || !toDate.value) return false
  return new Date(fromDate.value) <= new Date(toDate.value)
})

// Update work week hours in localStorage
const updateWorkWeekHours = (newHours: number, isManual: boolean = false) => {
  configuredWorkWeekHours.value = newHours
  localStorage.setItem('workWeekHours', newHours.toString())
  if (isManual) {
    isManualOverride.value = true
    localStorage.setItem('workWeekHoursManualOverride', 'true')
  }
}

// Load work week hours from localStorage on mount
const loadWorkWeekHours = () => {
  const saved = localStorage.getItem('workWeekHours')
  const manualOverride = localStorage.getItem('workWeekHoursManualOverride')
  if (saved) {
    configuredWorkWeekHours.value = parseFloat(saved) || (Number(import.meta.env.VITE_DEFAULT_WORK_DAY_HOURS) * 5 || 37.5)
  }
  if (manualOverride === 'true') {
    isManualOverride.value = true
  }
}

// Initialize saved work week hours
loadWorkWeekHours()

// Reset to automatic calculation
const resetToAutoCalculation = () => {
  isManualOverride.value = false
  localStorage.removeItem('workWeekHoursManualOverride')
  
  // Recalculate based on current date range
  if (fromDate.value && toDate.value) {
    const calculatedHours = calculateWorkWeekHours(fromDate.value, toDate.value)
    configuredWorkWeekHours.value = calculatedHours
    updateWorkWeekHours(calculatedHours)
  }
}

// Calculate work week hours based on date range (Monday-Friday, configured hours per day)
const calculateWorkWeekHours = (from: string, to: string): number => {
  const defaultWorkDayHours = Number(import.meta.env.VITE_DEFAULT_WORK_DAY_HOURS) || 7.5
  if (!from || !to) return defaultWorkDayHours * 5 // Default fallback
  
  const fromDate = new Date(from)
  const toDate = new Date(to)
  
  if (fromDate > toDate) return defaultWorkDayHours * 5 // Invalid range, use default
  
  let workDays = 0
  const currentDate = new Date(fromDate)
  
  // Iterate through each day in the range
  while (currentDate <= toDate) {
    const dayOfWeek = currentDate.getDay()
    // Monday = 1, Tuesday = 2, ..., Friday = 5
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      workDays++
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return workDays * defaultWorkDayHours
}

// Watch for date changes and save to localStorage and update store
watch([fromDate, toDate], () => {
  if (fromDate.value && toDate.value) {
    saveDateRange()
    store.setHighlightDateRange(fromDate.value, toDate.value)
    
    // Auto-calculate work week hours based on selected date range (only if not manually overridden)
    if (!isManualOverride.value) {
      const calculatedHours = calculateWorkWeekHours(fromDate.value, toDate.value)
      configuredWorkWeekHours.value = calculatedHours
      updateWorkWeekHours(calculatedHours)
    }
  }
}, { immediate: true })
</script>

<template>
  <div class="work-week-analyzer">
    <div class="analyzer-header">
      <h3>Work Week Analysis</h3>
    </div>
    
    <!-- Date Range Selector -->
    <div class="date-range-section">
      <div class="date-inputs">
        <div class="date-input-group">
          <label for="from-date">From Date:</label>
          <DatePicker 
            id="from-date"
            v-model="fromDate" 
            class="date-picker"
          />
        </div>
        <div class="date-input-group">
          <label for="to-date">To Date:</label>
          <DatePicker 
            id="to-date"
            v-model="toDate" 
            class="date-picker"
          />
        </div>
      </div>
      
      <!-- Date Range Validation -->
      <div v-if="!isValidDateRange" class="validation-error">
        Please ensure 'To Date' is after 'From Date'
      </div>
    </div>

    <!-- Work Week Configuration -->
    <div class="config-section">
      <div class="config-input-group">
        <label for="work-week-hours">Work Week Hours:</label>
        <div class="work-week-controls">
          <input 
            id="work-week-hours"
            type="number" 
            step="0.5"
            min="1"
            max="80"
            v-model.number="configuredWorkWeekHours"
            @change="updateWorkWeekHours(configuredWorkWeekHours, true)"
            class="work-week-input"
            :class="{ 'manual-override': isManualOverride }"
          />
          <button 
            v-if="isManualOverride"
            @click="resetToAutoCalculation"
            class="reset-btn"
            title="Reset to automatic calculation based on selected dates"
          >
            🔄 Auto
          </button>
        </div>
        <small v-if="isManualOverride" class="override-note">
          Manual override active. Work week hours won't auto-update when dates change.
        </small>
        <small v-else class="auto-calc-note">
          Auto-calculated based on work days (Mon-Fri, {{ defaultWorkDayHours }}h/day) in selected range.
        </small>
      </div>
    </div>

    <!-- Analysis Results -->
    <div v-if="isValidDateRange" class="analysis-results">
      <div class="stats-grid">
        <div class="stat-card hours-logged">
          <div class="stat-label">Hours Logged</div>
          <div class="stat-value">{{ formatHours(totalHoursInRange) }}</div>
        </div>
        
        <div class="stat-card target-hours">
          <div class="stat-label">Target Hours</div>
          <div class="stat-value">{{ formatHours(configuredWorkWeekHours) }}</div>
        </div>
        
        <div class="stat-card percentage" :class="{ 'over-target': isOvertime, 'under-target': !isOvertime && totalHoursInRange < configuredWorkWeekHours }">
          <div class="stat-label">Completion</div>
          <div class="stat-value">{{ formatPercentage(workWeekPercentage) }}%</div>
        </div>
      </div>
      
      <!-- Progress Bar -->
      <div class="progress-section">
        <div class="progress-bar-container">
          <div 
            class="progress-bar" 
            :class="{ 'overtime': isOvertime }"
            :style="{ width: Math.min(100, workWeekPercentage) + '%' }"
          ></div>
          <div 
            v-if="isOvertime" 
            class="overtime-bar"
            :style="{ width: Math.min(50, (workWeekPercentage - 100) * 0.5) + '%' }"
          ></div>
        </div>
        <div class="progress-labels">
          <span>0h</span>
          <span>{{ formatHours(configuredWorkWeekHours) }}h</span>
        </div>
      </div>
      
      <!-- Status Message -->
      <div class="status-section">
        <div v-if="isOvertime" class="status-message overtime-message">
          <strong>Overtime:</strong> {{ formatHours(overtimeHours) }} hours over target
        </div>
        <div v-else-if="hoursShortfall > 0" class="status-message shortfall-message">
          <strong>Remaining:</strong> {{ formatHours(hoursShortfall) }} hours to reach target
        </div>
        <div v-else class="status-message complete-message">
          <strong>Target achieved!</strong> Work week complete
        </div>
      </div>
      
      <!-- Days Summary -->
      <div v-if="filteredTimeEntries.length > 0" class="days-summary">
        <div class="summary-header">
          <strong>{{ filteredTimeEntries.length }} day(s) in selected range</strong>
        </div>
        <div class="daily-breakdown">
          <div 
            v-for="entry in filteredTimeEntries" 
            :key="entry.id"
            class="daily-entry"
          >
            <span class="entry-date">{{ new Date(entry.date).toLocaleDateString() }}</span>
            <span class="entry-hours">{{ formatHours(entry.totalHours) }}h</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- No Data Message -->
    <div v-else-if="isValidDateRange && filteredTimeEntries.length === 0" class="no-data-message">
      No time entries found for the selected date range.
    </div>
  </div>
</template>

<style scoped>
.work-week-analyzer {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.analyzer-header h3 {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 18px;
  font-weight: 600;
  border-bottom: 2px solid #007bff;
  padding-bottom: 8px;
}

.date-range-section {
  margin-bottom: 16px;
}

.date-inputs {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
}

.date-input-group {
  flex: 1;
}

.date-input-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #555;
  margin-bottom: 4px;
}

.date-picker {
  width: 100%;
}

.validation-error {
  color: #dc3545;
  font-size: 14px;
  font-weight: 500;
  padding: 8px;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
}

.config-section {
  margin-bottom: 20px;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 6px;
}

.config-input-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #555;
  margin-bottom: 4px;
}

.work-week-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.work-week-input {
  width: 120px;
  padding: 8px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

.work-week-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.work-week-input.manual-override {
  border-color: #ffc107;
  background-color: #fff8dc;
}

.reset-btn {
  padding: 4px 8px;
  font-size: 12px;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.reset-btn:hover {
  background-color: #5a6268;
}

.override-note {
  color: #856404;
  font-style: italic;
  font-size: 12px;
}

.auto-calc-note {
  color: #28a745;
  font-style: italic;
  font-size: 12px;
}

.analysis-results {
  border-top: 1px solid #dee2e6;
  padding-top: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  text-align: center;
  border: 1px solid #dee2e6;
}

.stat-card.over-target {
  background-color: #fff3cd;
  border-color: #ffeaa7;
}

.stat-card.under-target {
  background-color: #d1ecf1;
  border-color: #bee5eb;
}

.stat-label {
  font-size: 12px;
  color: #6c757d;
  font-weight: 500;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.progress-section {
  margin-bottom: 16px;
}

.progress-bar-container {
  position: relative;
  height: 24px;
  background-color: #e9ecef;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #28a745, #20c997);
  transition: width 0.3s ease;
  border-radius: 12px;
}

.progress-bar.overtime {
  background: linear-gradient(90deg, #28a745, #ffc107);
}

.overtime-bar {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg, #ffc107, #fd7e14);
  border-radius: 0 12px 12px 0;
  transition: width 0.3s ease;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #6c757d;
}

.status-section {
  margin-bottom: 16px;
}

.status-message {
  padding: 12px;
  border-radius: 6px;
  font-size: 14px;
}

.complete-message {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.shortfall-message {
  background-color: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}

.overtime-message {
  background-color: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

.days-summary {
  border-top: 1px solid #dee2e6;
  padding-top: 12px;
}

.summary-header {
  font-size: 14px;
  color: #495057;
  margin-bottom: 8px;
}

.daily-breakdown {
  max-height: 150px;
  overflow-y: auto;
}

.daily-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  background-color: #f8f9fa;
  margin-bottom: 4px;
  border-radius: 4px;
  font-size: 14px;
}

.entry-date {
  color: #495057;
}

.entry-hours {
  font-weight: 500;
  color: #007bff;
}

.no-data-message {
  text-align: center;
  color: #6c757d;
  font-style: italic;
  padding: 20px;
}

/* Responsive design */
@media (max-width: 768px) {
  .date-inputs {
    flex-direction: column;
    gap: 12px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .daily-entry {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>