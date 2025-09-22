<template>
  <Transition name="notification" appear>
    <div v-if="show" class="excel-notification success">
      <div class="notification-content">
        <div class="save-icon">💾</div>
        <div class="save-text">
          <div class="save-title">Auto-saved</div>
          <div class="save-time">{{ formattedTime }}</div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  show: boolean
  timestamp: string | null
}

const props = defineProps<Props>()

const formattedTime = computed(() => {
  if (!props.timestamp) return ''
  
  const date = new Date(props.timestamp)
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
})
</script>

<style scoped>
.excel-notification {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  min-width: 200px;
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.save-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.save-text {
  flex: 1;
}

.save-title {
  font-weight: 600;
  font-size: 14px;
  line-height: 1.2;
  margin-bottom: 2px;
  color: black;
}

.save-time {
  font-size: 12px;
  font-family: 'Courier New', monospace;
  line-height: 1.2;
  opacity: 0.8;
  color: black;
}

/* Transition animations */
.notification-enter-active {
  transition: all 0.3s ease-out;
}

.notification-leave-active {
  transition: all 0.3s ease-in;
}

.notification-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.notification-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .excel-notification {
    bottom: 10px;
    right: 10px;
    left: 10px;
    min-width: unset;
  }
}
</style>