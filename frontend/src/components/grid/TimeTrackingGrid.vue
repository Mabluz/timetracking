<template>
  <div class="time-tracking-grid">
    <!-- Header Toolbar -->
    <div class="excel-toolbar">
      <h2>Time Tracking</h2>
      <div class="excel-toolbar-group">
        <button @click="addTodayEntry" class="excel-btn primary">
          ➕ Add Today
        </button>
        <div class="file-actions">
          <input
            ref="fileInputRef"
            type="file"
            accept=".json"
            @change="importData"
            style="display: none"
          />
          <button @click="triggerImport" class="excel-btn">
            📁 Import
          </button>
          <button @click="exportData" class="excel-btn">
            💾 Export
          </button>
        </div>
      </div>
    </div>

    <!-- Grid Container -->
    <div class="grid-container">
      <div 
        ref="gridRef"
        class="excel-grid"
      >
      <!-- Grid Header Row -->
      <div class="excel-grid-row excel-grid-header">
        <div class="excel-grid-cell">📅 Date</div>
        <div class="excel-grid-cell">🕐 Start Time</div>
        <div class="excel-grid-cell">🕐 End Time</div>
        <div class="excel-grid-cell">⏰ Hours Away</div>
        <div class="excel-grid-cell">⏱️ Total Hours</div>
        <div class="excel-grid-cell">📊 Projects</div>
        <div class="excel-grid-cell">⚙️ Actions</div>
      </div>

      <!-- Data Rows -->
      <template v-for="entry in sortedTimeEntries" :key="entry.id">
        <TimeTrackingRow 
          :entry="entry"
          :is-expanded="expandedRows.has(entry.id)"
          @update="updateEntry"
          @delete="deleteEntry"
          @toggle-projects="toggleProjectsExpansion"
          @calculate-hours="calculateAndUpdateHours"
        />
      </template>

      <!-- Empty State -->
      <div v-if="sortedTimeEntries.length === 0" class="empty-state">
        <p>No time entries found.</p>
        <button @click="addTodayEntry" class="btn btn-primary">
          Add Your First Entry
        </button>
      </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>

    <!-- Error State -->
    <div v-if="error" class="error-message">
      <p>{{ error }}</p>
      <button @click="retryLoad" class="btn btn-secondary">Retry</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useTimeTrackingStore } from '@/stores/timetracking'
import TimeTrackingRow from './TimeTrackingRow.vue'
import type { TimeEntry } from '@/types'

const store = useTimeTrackingStore()
const expandedRows = ref(new Set<string>())
const gridRef = ref<HTMLElement>()
const fileInputRef = ref<HTMLInputElement>()

// Removed global keyboard navigation

// Computed properties
const sortedTimeEntries = computed(() => store.sortedTimeEntries)
const loading = computed(() => store.loading)
const error = computed(() => store.error)

// Methods
const updateEntry = async (id: string, updates: Partial<TimeEntry>) => {
  try {
    await store.updateTimeEntry(id, updates)
  } catch (err) {
    console.error('Failed to update entry:', err)
  }
}

const deleteEntry = async (id: string) => {
  if (confirm('Are you sure you want to delete this time entry?')) {
    try {
      await store.deleteTimeEntry(id)
    } catch (err) {
      console.error('Failed to delete entry:', err)
    }
  }
}

const addTodayEntry = () => {
  store.addTodayEntry()
}

const toggleProjectsExpansion = (entryId: string) => {
  if (expandedRows.value.has(entryId)) {
    expandedRows.value.delete(entryId)
  } else {
    expandedRows.value.add(entryId)
  }
}

const calculateAndUpdateHours = (entryId: string, startTime: string, endTime: string, hoursAway: number) => {
  const totalHours = store.calculateTotalHours(startTime, endTime, hoursAway)
  updateEntry(entryId, { startTime, endTime, hoursAway, totalHours })
}

const triggerImport = () => {
  fileInputRef.value?.click()
}

const importData = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return

  try {
    const text = await file.text()
    const data = JSON.parse(text)
    
    // Validate the imported data structure
    if (!data.timeEntries || !Array.isArray(data.timeEntries)) {
      throw new Error('Invalid data format: timeEntries array not found')
    }
    
    // Confirm with user before importing
    const confirmed = confirm(
      `Import ${data.timeEntries.length} time entries? This will replace all current data.`
    )
    
    if (confirmed) {
      // Import time entries
      for (const entry of data.timeEntries) {
        try {
          await store.createTimeEntry({
            date: entry.date,
            startTime: entry.startTime,
            endTime: entry.endTime,
            hoursAway: entry.hoursAway || 0,
            totalHours: entry.totalHours || 0,
            projects: entry.projects || []
          })
        } catch (error) {
          console.error('Failed to import entry:', entry, error)
        }
      }
      
      // Import projects if available
      if (data.projects && Array.isArray(data.projects)) {
        for (const project of data.projects) {
          try {
            await store.createProject({ name: project.name })
          } catch (error) {
            console.error('Failed to import project:', project, error)
          }
        }
      }
      
      // Refresh data
      await store.initialize()
      
      alert('Data imported successfully!')
    }
  } catch (error) {
    console.error('Import failed:', error)
    alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
  
  // Clear the file input
  if (target) {
    target.value = ''
  }
}

const exportData = () => {
  const exportData = {
    metadata: {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      totalEntries: store.timeEntries.length
    },
    timeEntries: store.timeEntries,
    projects: store.projects
  }
  
  const data = JSON.stringify(exportData, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `timetracking-export-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const retryLoad = () => {
  store.initialize()
}


// Lifecycle
onMounted(async () => {
  await store.initialize()
})
</script>

<style scoped>
.time-tracking-grid {
  position: relative;
  height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden;
}

.grid-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e0e0e0;
}

.grid-header h2 {
  margin: 0;
  color: #333;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.file-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #545b62;
}

.grid-container {
  flex: 1;
  overflow: auto;
  margin: 0 20px 20px 20px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  background: white;
}

.excel-grid-row {
  display: grid;
  grid-template-columns: minmax(140px, 1fr) minmax(120px, 1fr) minmax(120px, 1fr) minmax(120px, 1fr) minmax(140px, 1fr) minmax(200px, 2fr) minmax(120px, 1fr);
  border-bottom: 1px solid #dee2e6;
  min-height: 50px;
}

.grid-row:last-child {
  border-bottom: none;
}

.grid-header-row {
  background-color: #f8f9fa;
  font-weight: 600;
}

.grid-cell {
  padding: 12px 8px;
  border-right: 1px solid #dee2e6;
  display: flex;
  align-items: center;
  min-height: 44px;
}

.grid-cell:last-child {
  border-right: none;
}

.grid-cell.keyboard-focus {
  background-color: #e3f2fd;
  border: 2px solid #2196f3;
  box-shadow: 0 0 0 1px #2196f3;
}

.header-cell {
  font-weight: 600;
  color: #495057;
  background-color: #f8f9fa;
}

.empty-state {
  padding: 40px;
  text-align: center;
  color: #6c757d;
}

.empty-state p {
  margin-bottom: 20px;
  font-size: 16px;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e0e0e0;
  border-top: 3px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  padding: 20px;
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  margin-top: 20px;
  text-align: center;
}

.error-message p {
  margin-bottom: 10px;
}

/* Responsive design */
@media (max-width: 1200px) {
  .excel-grid-row {
    grid-template-columns: minmax(120px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(120px, 1fr) minmax(150px, 1.5fr) minmax(100px, 1fr);
  }
}

@media (max-width: 768px) {
  .time-tracking-grid {
    padding: 0;
  }
  
  .grid-container {
    margin: 0;
    border-radius: 0;
  }
  
  .excel-grid-row {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(7, auto);
  }
  
  .excel-grid-cell {
    border-right: none;
    border-bottom: 1px solid #dee2e6;
    padding: 12px;
  }
  
  .excel-grid-cell:last-child {
    border-bottom: none;
  }
}
</style>