<template>
  <div class="time-input-container">
    <input
      ref="inputRef"
      v-model="inputValue"
      type="text"
      class="excel-input time-input"
      :class="{ 'error': hasError }"
      placeholder="HH:MM"
      maxlength="5"
      @input="handleInput"
      @blur="handleBlur"
      @focus="handleFocus"
    />
    <div class="clock-icon" @click="openTimePicker">🕐</div>
    
    <!-- Time Picker Modal -->
    <div v-if="showPicker" class="time-picker-overlay" @click="closePicker">
      <div class="time-picker-modal" @click.stop>
        <VueDatePicker
          v-model="directTimeValue"
          time-picker
          :is24="true"
          :minutes-increment="15"
          :inline="true"
          auto-apply
          @update:model-value="handleTimeSelect"
        />
        <div class="picker-actions">
          <button @click="setCurrentTime" class="action-btn now-btn">Now</button>
          <button @click="closePicker" class="action-btn done-btn">Done</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, onUnmounted } from 'vue'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'

interface Props {
  modelValue: string
  hasError?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const inputRef = ref<HTMLInputElement>()
const showPicker = ref(false)
const inputValue = ref('')

// Sync input value with model value
watch(() => props.modelValue, (newValue) => {
  const newInputValue = newValue || ''
  if (inputValue.value !== newInputValue) {
    inputValue.value = newInputValue
  }
}, { immediate: true })

// Time value for the VueDatePicker (uses { hours, minutes } format)
const directTimeValue = ref({ hours: 0, minutes: 0 })

// Handle when time is selected in time picker
const handleTimeSelect = (value: { hours: number; minutes: number } | null) => {
  if (value) {
    const hours = value.hours.toString().padStart(2, '0')
    const minutes = value.minutes.toString().padStart(2, '0')
    const timeString = `${hours}:${minutes}`
    
    inputValue.value = timeString
    emit('update:modelValue', timeString)
  }
}

// Initialize timeValue from modelValue or inputValue
const initializeTimeValue = () => {
  let timeString = props.modelValue
  
  if (!timeString && inputValue.value) {
    timeString = inputValue.value
  }
  
  if (!timeString) {
    const now = new Date()
    const minute = Math.round(now.getMinutes() / 15) * 15
    const adjustedMinute = minute === 60 ? 0 : minute
    const adjustedHour = minute === 60 ? (now.getHours() + 1) % 24 : now.getHours()
    
    directTimeValue.value.hours = adjustedHour
    directTimeValue.value.minutes = adjustedMinute
    return
  }

  const [hours, minutes] = timeString.split(':').map(Number)
  if (isNaN(hours) || isNaN(minutes)) {
    directTimeValue.value.hours = 0
    directTimeValue.value.minutes = 0
    return
  }

  directTimeValue.value.hours = hours
  directTimeValue.value.minutes = minutes
}

// Watch for modelValue changes and update timeValue
watch(() => props.modelValue, () => {
  initializeTimeValue()
}, { immediate: true })

// Watch for inputValue changes (when user types)
watch(() => inputValue.value, () => {
  if (!props.modelValue && inputValue.value) {
    initializeTimeValue()
  }
})

const validateAndFormatTime = (input: string): string | null => {
  // Remove any non-digit characters except colon
  const cleaned = input.replace(/[^\d:]/g, '')

  // Handle various input formats
  if (cleaned.match(/^\d{1,2}$/)) {
    // Just hours (1-2 digits)
    const hour = parseInt(cleaned, 10)
    if (hour >= 0 && hour <= 23) {
      return `${hour.toString().padStart(2, '0')}:00`
    }
  }

  if (cleaned.match(/^\d{1,2}:\d{0,2}$/)) {
    // Time format with optional minutes (handle cases like "8:" or "08:")
    const [hourStr, minuteStr] = cleaned.split(':')
    const hour = parseInt(hourStr, 10)
    const minute = minuteStr ? parseInt(minuteStr, 10) : 0

    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    }
  }

  if (cleaned.match(/^\d{3,4}$/)) {
    // HHMM or HMM format (like 2130 or 915)
    if (cleaned.length === 3) {
      // HMM format (e.g., 915 = 09:15)
      const hour = parseInt(cleaned.substring(0, 1), 10)
      const minute = parseInt(cleaned.substring(1), 10)
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      }
    } else {
      // HHMM format (e.g., 2130 = 21:30)
      const hour = parseInt(cleaned.substring(0, 2), 10)
      const minute = parseInt(cleaned.substring(2), 10)
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      }
    }
  }

  return null
}

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  let value = target.value
  
  // Auto-add colon after 2 digits
  if (value.length === 2 && !value.includes(':') && /^\d{2}$/.test(value)) {
    value += ':'
    target.value = value
    inputValue.value = value
  }
}

// Removed handleKeyDown and adjustTime functions since we're not using them anymore

const handleBlur = (event: FocusEvent) => {
  const value = inputValue.value.trim()
  if (!value) {
    emit('update:modelValue', '')
    return
  }

  const formattedTime = validateAndFormatTime(value)
  if (formattedTime) {
    inputValue.value = formattedTime
    emit('update:modelValue', formattedTime)
  } else {
    // Reset to previous valid value
    inputValue.value = props.modelValue || ''
  }
}

const handleFocus = () => {
  // Don't auto-select text to allow normal cursor positioning
}

const openTimePicker = () => {
  initializeTimeValue()
  showPicker.value = true
}

const closePicker = () => {
  showPicker.value = false
}

const setCurrentTime = () => {
  const now = new Date()
  const hour = now.getHours()
  const minute = Math.round(now.getMinutes() / 15) * 15
  const adjustedMinute = minute === 60 ? 0 : minute
  const adjustedHour = minute === 60 ? (hour + 1) % 24 : hour
  
  directTimeValue.value.hours = adjustedHour
  directTimeValue.value.minutes = adjustedMinute
  
  const timeString = `${adjustedHour.toString().padStart(2, '0')}:${adjustedMinute.toString().padStart(2, '0')}`
  inputValue.value = timeString
  emit('update:modelValue', timeString)
  closePicker()
}

// Close picker on escape key - using document level handler to avoid interference
const handleEscapeKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && showPicker.value) {
    closePicker()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEscapeKey)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscapeKey)
})
</script>

<style scoped>
.time-input-container {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.time-input {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  text-align: center;
  min-width: 80px;
  width: 100%;
  padding: 8px 32px 8px 12px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.time-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.time-input.error {
  border-color: #dc3545;
  box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.25);
}

.time-input::placeholder {
  color: #6c757d;
  font-style: italic;
}

.clock-icon {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  color: #6c757d;
  cursor: pointer;
  user-select: none;
  transition: color 0.2s;
  z-index: 2;
}

.clock-icon:hover {
  color: #007bff;
}

/* Time Picker Modal */
.time-picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
}

.time-picker-modal {
  background: white;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  padding: 20px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: auto;
  pointer-events: auto;
  position: relative;
  z-index: 10001;
}

.picker-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #dee2e6;
}

.action-btn {
  padding: 6px 12px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.now-btn {
  background: #28a745;
  color: white;
  border-color: #28a745;
}

.now-btn:hover {
  background: #218838;
}

.done-btn {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.done-btn:hover {
  background: #0056b3;
}

/* Vue DatePicker styling for inline mode */
:deep(.dp__main) {
  width: auto;
}

:deep(.dp__theme_light) {
  --dp-primary-color: #007bff;
  --dp-primary-disabled-color: #6c757d;
  --dp-secondary-color: #f8f9fa;
  --dp-background-color: #ffffff;
  --dp-text-color: #212529;
  --dp-hover-color: #e9ecef;
  --dp-hover-text-color: #212529;
  --dp-border-color: #dee2e6;
  --dp-border-color-hover: #007bff;
  --dp-disabled-color: #e9ecef;
  --dp-disabled-color-text: #6c757d;
}
</style>