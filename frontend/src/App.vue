<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import { useTimeTrackingStore } from '@/stores/timetracking'
import TabBar from '@/components/navigation/TabBar.vue'
import WorkWeekAnalyzer from '@/components/analytics/WorkWeekAnalyzer.vue'

const store = useTimeTrackingStore()
const route = useRoute()

const showWorkWeekAnalyzer = computed(() => route.path !== '/monthly-reports')
</script>

<template>
  <div id="app">
    <div class="app-layout">
      <!-- Left Sidebar Header -->
      <aside class="app-sidebar" :class="{ 'hide-analyzer': !showWorkWeekAnalyzer }">
        <div class="sidebar-header">
          <h1>Time Tracking Application</h1>
          <div class="header-status">
            <span class="status-indicator" :class="{ 'online': store.isOnline, 'offline': !store.isOnline }">
              {{ store.isOnline ? 'Online' : 'Offline' }}
            </span>
          </div>
        </div>
        
        <!-- Work Week Analysis in Sidebar -->
        <div v-if="showWorkWeekAnalyzer" class="sidebar-content">
          <WorkWeekAnalyzer />
        </div>
      </aside>

      <!-- Right Main Content -->
      <main class="app-main">
        <TabBar />
        <div class="router-content">
          <RouterView />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
#app {
  height: 100vh;
  background-color: #f8f9fa;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden;
}

.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
}

/* Left Sidebar */
.app-sidebar {
  flex: 0 0 400px;
  background: white;
  border-right: 1px solid #dee2e6;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  transition: flex 0.3s ease;
}

.app-sidebar.hide-analyzer {
  flex: 0 0 0;
  min-width: 0;
  overflow: hidden;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #dee2e6;
  background: white;
  position: sticky;
  top: 0;
  z-index: 10;
}

.sidebar-header h1 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;
}

.header-status {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  padding: 6px 10px;
  border-radius: 6px;
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

.sidebar-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.sidebar-content :deep(.work-week-analyzer) {
  margin: 0;
  box-shadow: none;
  border: none;
  background: transparent;
}

/* Right Main Content */
.app-main {
  flex: 1;
  background-color: #f8f9fa;
  overflow: hidden;
  min-width: 0; /* Prevents overflow issues */
  display: flex;
  flex-direction: column;
}

.router-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* Global styles for the application */
:global(body) {
  margin: 0;
  padding: 0;
  background-color: #f8f9fa;
  overflow: hidden;
}

:global(*) {
  box-sizing: border-box;
}

/* Responsive design */
@media (max-width: 1200px) {
  .app-sidebar {
    flex: 0 0 350px;
  }
  
  .sidebar-content {
    padding: 16px;
  }
  
  .router-content {
    padding: 16px;
  }
}

@media (max-width: 768px) {
  .app-layout {
    flex-direction: column;
  }
  
  .app-sidebar {
    flex: 0 0 auto;
    height: auto;
    max-height: 50vh;
    border-right: none;
    border-bottom: 1px solid #dee2e6;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .sidebar-header {
    padding: 16px;
  }
  
  .sidebar-header h1 {
    font-size: 18px;
  }
  
  .sidebar-content {
    padding: 16px;
    max-height: calc(50vh - 80px);
    overflow-y: auto;
  }
  
  .router-content {
    flex: 1;
    padding: 16px;
    height: auto;
    min-height: 50vh;
  }
}

@media (max-width: 480px) {
  .app-sidebar {
    max-height: 60vh;
  }
  
  .sidebar-header {
    padding: 12px;
  }
  
  .sidebar-content {
    padding: 12px;
  }
  
  .router-content {
    padding: 12px;
    min-height: 40vh;
  }
}
</style>
