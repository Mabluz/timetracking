<script setup lang="ts">
import { computed } from 'vue'
import { useTimeTrackingStore } from '@/stores/timetracking'
import TimeTrackingGrid from '@/components/grid/TimeTrackingGrid.vue'
import SaveNotification from '@/components/common/SaveNotification.vue'

const store = useTimeTrackingStore()

const showNotification = computed(() => !!store.lastSaved)
const lastSavedTime = computed(() => store.lastSaved)
</script>

<template>
  <div id="app">
    <header class="app-header">
      <div class="header-content">
        <h1>Time Tracking Application</h1>
        <div class="header-status">
          <span class="status-indicator" :class="{ 'online': store.isOnline, 'offline': !store.isOnline }">
            {{ store.isOnline ? 'Online' : 'Offline' }}
          </span>
        </div>
      </div>
    </header>

    <main class="app-main">
      <TimeTrackingGrid />
    </main>

    <!-- Save Notification -->
    <SaveNotification 
      :show="showNotification" 
      :timestamp="lastSavedTime"
    />
  </div>
</template>

<style scoped>
#app {
  min-height: 100vh;
  background-color: #f8f9fa;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.app-header {
  background: white;
  border-bottom: 1px solid #dee2e6;
  padding: 16px 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header-content {
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.app-header h1 {
  margin: 0;
  color: #333;
  font-size: 24px;
  font-weight: 600;
}

.header-status {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 4px;
}

.status-indicator::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator.online {
  color: #28a745;
  background-color: #d4edda;
}

.status-indicator.online::before {
  background-color: #28a745;
}

.status-indicator.offline {
  color: #dc3545;
  background-color: #f8d7da;
}

.status-indicator.offline::before {
  background-color: #dc3545;
}

.app-main {
  padding: 0;
}

/* Global styles for the application */
:global(body) {
  margin: 0;
  padding: 0;
  background-color: #f8f9fa;
}

:global(*) {
  box-sizing: border-box;
}

/* Responsive design */
@media (max-width: 768px) {
  .header-content {
    padding: 0 16px;
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }
  
  .app-header h1 {
    font-size: 20px;
  }
  
  .app-main {
    padding: 0;
  }
}
</style>
