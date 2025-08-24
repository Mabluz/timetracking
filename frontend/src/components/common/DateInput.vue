<template>
  <div class="date-input-container">
    <input
      ref="dateInputRef"
      v-model="displayValue"
      type="text"
      class="excel-input date-input"
      :class="{ 'error': hasError }"
      placeholder="dd/mm/yyyy"
      maxlength="10"
      @input="handleInput"
      @blur="handleBlur"
      @focus="handleFocus"
      @keydown="handleKeydown"
    />
    <div v-if="hasError" class="error-message">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useDateFormat } from '@/composables/useDateFormat'

interface Props {
  modelValue: string // ISO date format (yyyy-mm-dd)
  placeholder?: string
  disabled?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'dd/mm/yyyy',
  disabled: false
})

const emit = defineEmits<Emits>()

const { 
  formatDateForDisplay, 
  formatDateForStorage, 
  isValidDateFormat, 
  getTodayFormatted 
} = useDateFormat()

const dateInputRef = ref<HTMLInputElement>()
const displayValue = ref('')
const hasError = ref(false)
const errorMessage = ref('')
const isFocused = ref(false)

// Convert ISO date to display format when modelValue changes
watch(() => props.modelValue, (newValue) => {
  if (newValue && !isFocused.value) {
    const formatted = formatDateForDisplay(newValue)
    displayValue.value = formatted
  } else if (!newValue) {
    displayValue.value = ''
  }
  hasError.value = false
  errorMessage.value = ''
}, { immediate: true })

// Auto-format input as user types
const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  let value = target.value.replace(/[^\d]/g, '') // Remove non-digits
  
  // Auto-add slashes
  if (value.length >= 2) {
    value = value.substring(0, 2) + '/' + value.substring(2)
  }
  if (value.length >= 5) {
    value = value.substring(0, 5) + '/' + value.substring(5, 9)
  }
  
  displayValue.value = value
  
  // Clear error while typing
  if (hasError.value) {
    hasError.value = false
    errorMessage.value = ''
  }
}

// Validate and emit when user finishes editing
const handleBlur = () => {
  isFocused.value = false
  
  if (!displayValue.value.trim()) {
    // Empty value is valid
    emit('update:modelValue', '')
    hasError.value = false
    errorMessage.value = ''
    return
  }
  
  if (isValidDateFormat(displayValue.value)) {
    // Valid format - convert to ISO and emit
    const isoDate = formatDateForStorage(displayValue.value)
    if (isoDate) {
      emit('update:modelValue', isoDate)
      hasError.value = false
      errorMessage.value = ''
    } else {
      showError('Invalid date')
    }
  } else {
    showError('Please enter date as dd/mm/yyyy')
  }
}

const handleFocus = () => {
  isFocused.value = true
}

// Handle special keys
const handleKeydown = (event: KeyboardEvent) => {
  // Allow: backspace, delete, tab, escape, enter
  if ([8, 9, 27, 13, 46].indexOf(event.keyCode) !== -1 ||
      // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      (event.keyCode === 65 && event.ctrlKey === true) ||
      (event.keyCode === 67 && event.ctrlKey === true) ||
      (event.keyCode === 86 && event.ctrlKey === true) ||
      (event.keyCode === 88 && event.ctrlKey === true)) {
    return
  }
  
  // Ensure that it is a number and stop the keypress
  if ((event.shiftKey || (event.keyCode < 48 || event.keyCode > 57)) && (event.keyCode < 96 || event.keyCode > 105)) {
    event.preventDefault()
  }
  
  // Handle Enter key to validate
  if (event.keyCode === 13) {
    handleBlur()
  }
}

const showError = (message: string) => {
  hasError.value = true
  errorMessage.value = message
}

// Expose methods for parent component
defineExpose({
  focus: () => dateInputRef.value?.focus(),
  blur: () => dateInputRef.value?.blur()
})
</script>

<style scoped>
.date-input-container {
  position: relative;
  width: 100%;
}

.date-input {
  width: 100%;
  font-family: 'Courier New', monospace;
  letter-spacing: 0.5px;
}

.date-input.error {
  border-color: var(--error-color, #dc3545);
  box-shadow: 0 0 0 1px var(--error-color, #dc3545);
}

.error-message {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--error-bg, #f8d7da);
  color: var(--error-color, #721c24);
  font-size: 11px;
  padding: 4px 6px;
  border-radius: 2px;
  border: 1px solid var(--error-color, #dc3545);
  z-index: 10;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Animation for error message */
.error-message {
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