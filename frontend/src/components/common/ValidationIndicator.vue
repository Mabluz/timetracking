<template>
  <div v-if="errors.length > 0" class="validation-indicator">
    <div 
      v-for="error in errors" 
      :key="error.field + error.message"
      class="validation-message"
      :class="{
        'error': error.type === 'error',
        'warning': error.type === 'warning'
      }"
    >
      <div class="validation-icon">
        {{ error.type === 'error' ? '⚠' : '⚡' }}
      </div>
      <div class="validation-text">{{ error.message }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ValidationError } from '@/composables/useValidation'

interface Props {
  errors: ValidationError[]
}

defineProps<Props>()
</script>

<style scoped>
.validation-indicator {
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.validation-message {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.3;
}

.validation-message.error {
  background-color: #ffeaea;
  color: #d63031;
  border: 1px solid #fab1a0;
}

.validation-message.warning {
  background-color: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

.validation-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.validation-text {
  flex: 1;
  font-weight: 500;
}

/* Compact mode for inline display */
.validation-indicator.compact .validation-message {
  padding: 2px 6px;
  font-size: 11px;
}

.validation-indicator.compact .validation-icon {
  font-size: 12px;
}
</style>