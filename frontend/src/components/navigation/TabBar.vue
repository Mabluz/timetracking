<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()
const currentPath = computed(() => route.path)
</script>

<template>
  <nav class="tab-bar">
    <RouterLink 
      to="/"
      class="tab-item" 
      :class="{ active: currentPath === '/' }"
    >
      Time tracking
    </RouterLink>
    <RouterLink 
      to="/monthly-reports"
      class="tab-item" 
      :class="{ active: currentPath === '/monthly-reports' }"
    >
      Monthly reports
    </RouterLink>
    <RouterLink 
      to="/default-projects"
      class="tab-item" 
      :class="{ active: currentPath === '/default-projects' }"
    >
      Default projects
    </RouterLink>
  </nav>
</template>

<style scoped>
.tab-bar {
  display: flex;
  background: white;
  border-bottom: 1px solid #dee2e6;
  margin-bottom: 20px;
}

.tab-item {
  padding: 12px 24px;
  text-decoration: none;
  color: #6c757d;
  font-weight: 500;
  border-bottom: 3px solid transparent;
  transition: all 0.2s ease;
  cursor: pointer;
}

.tab-item:hover {
  color: #495057;
  background-color: #f8f9fa;
}

.tab-item.active {
  color: #007bff;
  border-bottom-color: #007bff;
  background-color: #fff;
}
</style>