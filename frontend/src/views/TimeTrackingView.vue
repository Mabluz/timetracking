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
  <div class="time-tracking-view">
    <TimeTrackingGrid />
    
    <!-- Save Notification -->
    <SaveNotification 
      :show="showNotification" 
      :timestamp="lastSavedTime"
    />
  </div>
</template>

<style scoped>
.time-tracking-view {
  height: 100%;
  position: relative;
}
</style>