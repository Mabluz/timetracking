<template>
  <div class="date-picker-container" ref="containerRef">
    <div class="date-input-wrapper" @click="toggleCalendar">
      <input
        ref="inputRef"
        v-model="displayValue"
        type="text"
        class="excel-input date-input"
        :class="{ 'error': hasError, 'focused': showCalendar }"
        placeholder="dd/mm/yyyy"
        readonly
        @keydown="handleKeydown"
      />
      <div class="date-input-icon">📅</div>
    </div>
    
    <div v-if="hasError" class="error-message">
      {{ errorMessage }}
    </div>

    <!-- Calendar Popup -->
    <div v-if="showCalendar" class="calendar-popup" @click.stop>
      <div class="calendar-header">
        <button @click="previousMonth" class="nav-btn" type="button">‹</button>
        <div class="month-year">
          <select v-model="selectedMonth" class="month-select">
            <option v-for="(month, index) in monthNames" :key="index" :value="index">
              {{ month }}
            </option>
          </select>
          <select v-model="selectedYear" class="year-select">
            <option v-for="year in yearRange" :key="year" :value="year">
              {{ year }}
            </option>
          </select>
        </div>
        <button @click="nextMonth" class="nav-btn" type="button">›</button>
      </div>

      <div class="calendar-grid">
        <!-- Day headers -->
        <div class="day-header" v-for="day in dayHeaders" :key="day">{{ day }}</div>
        
        <!-- Calendar days -->
        <button
          v-for="day in calendarDays"
          :key="`${day.date}-${day.isCurrentMonth}`"
          @click="selectDate(day)"
          class="day-cell"
          :class="{
            'other-month': !day.isCurrentMonth,
            'selected': day.isSelected,
            'today': day.isToday,
            'weekend': day.isWeekend
          }"
          type="button"
          :disabled="!day.isCurrentMonth"
        >
          {{ day.day }}
        </button>
      </div>

      <div class="calendar-footer">
        <button @click="selectToday" class="today-btn" type="button">Today</button>
        <button @click="clearDate" class="clear-btn" type="button">Clear</button>
        <button @click="closeCalendar" class="close-btn" type="button">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useDateFormat } from '@/composables/useDateFormat'

interface Props {
  modelValue: string // ISO date format
  placeholder?: string
  disabled?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Select date...',
  disabled: false
})

const emit = defineEmits<Emits>()

const { formatDateForDisplay, formatDateForStorage, getTodayISO } = useDateFormat()

// Refs
const containerRef = ref<HTMLElement>()
const inputRef = ref<HTMLInputElement>()
const showCalendar = ref(false)
const displayValue = ref('')
const hasError = ref(false)
const errorMessage = ref('')

// Calendar state
const selectedMonth = ref(new Date().getMonth())
const selectedYear = ref(new Date().getFullYear())

// Constants
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const dayHeaders = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

// Computed properties
const yearRange = computed(() => {
  const currentYear = new Date().getFullYear()
  const years = []
  for (let year = currentYear - 10; year <= currentYear + 10; year++) {
    years.push(year)
  }
  return years
})

const selectedDate = computed(() => {
  if (!props.modelValue) return null
  return new Date(props.modelValue)
})

const calendarDays = computed(() => {
  const days = []
  const firstDay = new Date(selectedYear.value, selectedMonth.value, 1)
  const lastDay = new Date(selectedYear.value, selectedMonth.value + 1, 0)
  const startDate = new Date(firstDay)
  const today = new Date()
  
  // Start from Sunday of the week containing the first day
  startDate.setDate(firstDay.getDate() - firstDay.getDay())
  
  // Generate 42 days (6 weeks)
  for (let i = 0; i < 42; i++) {
    const currentDate = new Date(startDate)
    currentDate.setDate(startDate.getDate() + i)
    
    const isCurrentMonth = currentDate.getMonth() === selectedMonth.value
    const isSelected = selectedDate.value && 
      currentDate.getFullYear() === selectedDate.value.getUTCFullYear() &&
      currentDate.getMonth() === selectedDate.value.getUTCMonth() &&
      currentDate.getDate() === selectedDate.value.getUTCDate()
    
    const isToday = currentDate.toDateString() === today.toDateString()
    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6
    
    days.push({
      date: currentDate.toISOString().split('T')[0],
      day: currentDate.getDate(),
      isCurrentMonth,
      isSelected,
      isToday,
      isWeekend,
      fullDate: currentDate
    })
  }
  
  return days
})

// Watch for modelValue changes
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    displayValue.value = formatDateForDisplay(newValue)
    // Set calendar to the selected date's month/year
    const date = new Date(newValue)
    selectedMonth.value = date.getUTCMonth()
    selectedYear.value = date.getUTCFullYear()
  } else {
    displayValue.value = ''
  }
  hasError.value = false
  errorMessage.value = ''
}, { immediate: true })

// Methods
const toggleCalendar = () => {
  if (props.disabled) return
  showCalendar.value = !showCalendar.value
  
  if (showCalendar.value) {
    positionCalendar()
  }
}

const closeCalendar = () => {
  showCalendar.value = false
}

const selectDate = (day: any) => {
  if (!day.isCurrentMonth) return
  
  const isoDate = `${day.fullDate.getFullYear()}-${String(day.fullDate.getMonth() + 1).padStart(2, '0')}-${String(day.fullDate.getDate()).padStart(2, '0')}T00:00:00.000Z`
  emit('update:modelValue', isoDate)
  showCalendar.value = false
}

const selectToday = () => {
  emit('update:modelValue', getTodayISO())
  showCalendar.value = false
}

const clearDate = () => {
  emit('update:modelValue', '')
  showCalendar.value = false
}

const previousMonth = () => {
  if (selectedMonth.value === 0) {
    selectedMonth.value = 11
    selectedYear.value--
  } else {
    selectedMonth.value--
  }
}

const nextMonth = () => {
  if (selectedMonth.value === 11) {
    selectedMonth.value = 0
    selectedYear.value++
  } else {
    selectedMonth.value++
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    toggleCalendar()
  } else if (event.key === 'Escape') {
    closeCalendar()
  }
}

// Click outside to close
const handleClickOutside = (event: Event) => {
  if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
    closeCalendar()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Helper function to position calendar
const positionCalendar = () => {
  nextTick(() => {
    const popup = containerRef.value?.querySelector('.calendar-popup') as HTMLElement
    const input = inputRef.value
    
    if (popup && input) {
      const inputRect = input.getBoundingClientRect()
      popup.style.top = `${inputRect.bottom + 4}px`
      popup.style.left = `${inputRect.left}px`
    }
  })
}

// Expose methods for parent component
defineExpose({
  focus: () => inputRef.value?.focus(),
  open: () => { 
    showCalendar.value = true
    positionCalendar()
  },
  close: () => { showCalendar.value = false }
})
</script>

<style scoped>
.date-picker-container {
  position: relative;
  width: 100%;
}

.date-input-wrapper {
  position: relative;
  cursor: pointer;
}

.date-input {
  width: 100%;
  cursor: pointer;
  padding-right: 30px;
  font-family: var(--font-family, 'Segoe UI', sans-serif);
}

.date-input.focused {
  border-color: var(--grid-focus, #0078d4);
  box-shadow: 0 0 0 1px var(--grid-focus, #0078d4);
}

.date-input-icon {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  font-size: 14px;
  color: var(--excel-gray-600, #a19f9d);
}

.error-message {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--error-bg, #fde7e9);
  color: var(--error-color, #a80000);
  font-size: 11px;
  padding: 4px 6px;
  border-radius: 2px;
  border: 1px solid var(--error-color, #a80000);
  z-index: 10;
  margin-top: 2px;
}

.calendar-popup {
  position: fixed;
  background: white;
  border: 1px solid var(--grid-border, #d2d0ce);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  min-width: 280px;
  padding: 12px;
  font-family: var(--font-family, 'Segoe UI', sans-serif);
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--excel-gray-200, #edebe9);
}

.nav-btn {
  background: none;
  border: 1px solid var(--grid-border, #d2d0ce);
  border-radius: 4px;
  width: 32px;
  height: 32px;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--excel-gray-700, #8a8886);
}

.nav-btn:hover {
  background: var(--grid-hover, #f8f9fa);
  border-color: var(--excel-gray-400, #d2d0ce);
}

.month-year {
  display: flex;
  gap: 8px;
  align-items: center;
}

.month-select,
.year-select {
  border: 1px solid var(--grid-border, #d2d0ce);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 13px;
  background: white;
  cursor: pointer;
}

.month-select {
  min-width: 100px;
}

.year-select {
  min-width: 70px;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  margin-bottom: 12px;
}

.day-header {
  text-align: center;
  font-weight: 600;
  font-size: 11px;
  color: var(--excel-gray-700, #8a8886);
  padding: 8px 4px;
  background: var(--excel-gray-100, #f3f2f1);
}

.day-cell {
  background: none;
  border: none;
  padding: 8px 4px;
  text-align: center;
  cursor: pointer;
  font-size: 13px;
  border-radius: 4px;
  color: var(--excel-gray-800, #323130);
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.day-cell:hover:not(:disabled) {
  background: var(--grid-hover, #f8f9fa);
}

.day-cell.other-month {
  color: var(--excel-gray-400, #d2d0ce);
  cursor: not-allowed;
}

.day-cell.selected {
  background: var(--excel-blue, #0078d4);
  color: white;
}

.day-cell.today:not(.selected) {
  background: var(--excel-blue-light, #deecf9);
  color: var(--excel-blue, #0078d4);
  font-weight: 600;
}

.day-cell.weekend:not(.other-month):not(.selected) {
  color: var(--excel-gray-600, #a19f9d);
}

.calendar-footer {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--excel-gray-200, #edebe9);
}

.today-btn,
.clear-btn,
.close-btn {
  border: 1px solid var(--grid-border, #d2d0ce);
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  background: white;
  color: var(--excel-gray-700, #8a8886);
}

.today-btn {
  background: var(--excel-blue, #0078d4);
  color: white;
  border-color: var(--excel-blue-dark, #106ebe);
}

.today-btn:hover {
  background: var(--excel-blue-dark, #106ebe);
}

.clear-btn:hover,
.close-btn:hover {
  background: var(--grid-hover, #f8f9fa);
}

/* Animation */
.calendar-popup {
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>