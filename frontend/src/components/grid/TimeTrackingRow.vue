<template>
  <div class="time-entry-row">
    <!-- Main Row -->
    <div class="excel-grid-row" :class="{ 'selected': isExpanded }">
      <!-- Date -->
      <div class="excel-grid-cell">
        <DatePicker
          v-model="localEntry.date"
          @update:modelValue="handleFieldChange"
        />
      </div>

      <!-- Start Time -->
      <div class="excel-grid-cell">
        <TimeInput
          v-model="localEntry.startTime"
          :has-error="getFieldErrors('startTime').length > 0"
          @update:modelValue="handleTimeChange"
        />
      </div>

      <!-- End Time -->
      <div class="excel-grid-cell">
        <TimeInput
          v-model="localEntry.endTime"
          :has-error="getFieldErrors('endTime').length > 0"
          @update:modelValue="handleTimeChange"
        />
      </div>

      <!-- Hours Away -->
      <div class="excel-grid-cell">
        <input
          v-model.number="localEntry.hoursAway"
          type="number"
          step="0.25"
          min="0"
          max="24"
          class="excel-input"
          @change="handleTimeChange"
        />
      </div>

      <!-- Total Hours (calculated) -->
      <div class="excel-grid-cell total-hours">
        <span class="excel-status info">{{ (localEntry.totalHours || 0).toFixed(2) }}h</span>
      </div>

      <!-- Projects Summary -->
      <div class="excel-grid-cell projects-cell">
        <div class="projects-summary">
          <span v-if="!localEntry.projects || localEntry.projects.length === 0" class="excel-status">
            No projects
          </span>
          <span v-else class="excel-status success">
            {{ localEntry.projects.length }} project{{ localEntry.projects.length !== 1 ? 's' : '' }}
            ({{ (projectTotalHours || 0).toFixed(2) }}h)
          </span>
        </div>
        <button 
          @click="toggleProjects" 
          class="excel-btn expand-btn"
          :class="{ 'expanded': isExpanded }"
        >
          {{ isExpanded ? '🔽' : '▶️' }}
        </button>
      </div>

      <!-- Actions -->
      <div class="excel-grid-cell actions-cell">
        <button @click="deleteRow" class="excel-btn btn-delete" title="Delete entry">
          🗑️
        </button>
      </div>
    </div>

    <!-- Validation Messages -->
    <div v-if="errors && errors.length > 0" class="validation-row">
      <ValidationIndicator :errors="errors" />
    </div>

    <!-- Expanded Projects Section -->
    <div v-if="isExpanded" class="projects-section">
      <div class="projects-header">
        <h4>📊 Project Allocation</h4>
        <button @click="addProject" class="excel-btn primary">
          ➕ Add Project
        </button>
      </div>
      
      <div class="projects-grid">
        <!-- Project Header -->
        <div class="excel-grid-row excel-grid-header project-grid-row">
          <div class="excel-grid-cell">📝 Project Name</div>
          <div class="excel-grid-cell">⏱️ Hours Allocated</div>
          <div class="excel-grid-cell">💬 Comments</div>
          <div class="excel-grid-cell">⚙️ Actions</div>
        </div>

        <!-- Project Rows -->
        <div 
          v-for="(project, index) in localEntry.projects" 
          :key="project.id || index"
          class="excel-grid-row project-grid-row"
        >
          <div class="excel-grid-cell">
            <input
              v-model="project.name"
              type="text"
              class="excel-input"
              placeholder="Project name"
              @change="handleProjectChange"
              :list="`projects-list-${entry.id}`"
            />
          </div>
          <div class="excel-grid-cell">
            <input
              v-model.number="project.hoursAllocated"
              type="number"
              step="0.25"
              min="0"
              :max="localEntry.totalHours || 0"
              class="excel-input"
              @change="handleProjectChange"
            />
          </div>
          <div class="excel-grid-cell">
            <input
              v-model="project.comment"
              type="text"
              class="excel-input"
              placeholder="Comments"
              @change="handleProjectChange"
            />
          </div>
          <div class="excel-grid-cell">
            <button 
              @click="removeProject(index)" 
              class="excel-btn btn-delete"
              title="Remove project"
            >
              🗑️
            </button>
          </div>
        </div>

        <!-- Project Hours Summary -->
        <div v-if="localEntry.projects && localEntry.projects.length > 0" class="projects-summary-row">
          <div class="summary-text">
            📊 Total allocated: {{ (projectTotalHours || 0).toFixed(2) }}h / {{ (localEntry.totalHours || 0).toFixed(2) }}h
            <span 
              v-if="hoursRemaining !== 0" 
              class="excel-status"
              :class="{ 
                'error': hoursRemaining < 0, 
                'warning': hoursRemaining > 0,
                'success': hoursRemaining === 0 
              }"
            >
              {{ hoursRemaining > 0 ? `⚠️ ${(hoursRemaining || 0).toFixed(2)}h remaining` : `❌ ${Math.abs(hoursRemaining || 0).toFixed(2)}h over` }}
            </span>
          </div>
        </div>
      </div>

      <!-- Project Autocomplete Data List -->
      <datalist :id="`projects-list-${entry.id}`">
        <option v-for="project in availableProjects" :key="project.name" :value="project.name" />
      </datalist>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTimeTrackingStore } from '@/stores/timetracking'
import { useValidation } from '@/composables/useValidation'
import ValidationIndicator from '@/components/common/ValidationIndicator.vue'
import DatePicker from '@/components/common/DatePicker.vue'
import TimeInput from '@/components/common/TimeInput.vue'
import type { TimeEntry, Project } from '@/types'

interface Props {
  entry: TimeEntry
  isExpanded: boolean
}

interface Emits {
  (e: 'update', id: string, updates: Partial<TimeEntry>): void
  (e: 'delete', id: string): void
  (e: 'toggle-projects', id: string): void
  (e: 'calculate-hours', id: string, startTime: string, endTime: string, hoursAway: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const store = useTimeTrackingStore()
const localEntry = ref<TimeEntry>({ ...props.entry })

// Validation
const { validateTimeEntry, setErrors, errors, getFieldErrors } = useValidation()

// Computed properties
const availableProjects = computed(() => store.projects)

const projectTotalHours = computed(() => {
  return (localEntry.value.projects || []).reduce((sum, project) => sum + (project.hoursAllocated || 0), 0)
})

const hoursRemaining = computed(() => {
  return (localEntry.value.totalHours || 0) - (projectTotalHours.value || 0)
})

// Watch for external changes to the entry
watch(() => props.entry, (newEntry) => {
  localEntry.value = { ...newEntry }
  validateEntry()
}, { deep: true })

// Watch for local changes to validate
watch(localEntry, () => {
  validateEntry()
}, { deep: true })

// Validation methods
const validateEntry = () => {
  const validationErrors = validateTimeEntry(localEntry.value)
  setErrors(validationErrors)
}

// Methods
const handleFieldChange = () => {
  emit('update', localEntry.value.id, {
    date: localEntry.value.date
  })
}

const handleTimeChange = () => {
  emit('calculate-hours', 
    localEntry.value.id, 
    localEntry.value.startTime, 
    localEntry.value.endTime, 
    localEntry.value.hoursAway
  )
}

const handleProjectChange = () => {
  // Only save if all projects have valid names (prevent backend validation errors)
  const hasInvalidProjects = localEntry.value.projects?.some(project => !project.name?.trim())
  if (!hasInvalidProjects) {
    emit('update', localEntry.value.id, {
      projects: localEntry.value.projects
    })
  }
}

const toggleProjects = () => {
  emit('toggle-projects', localEntry.value.id)
}

const deleteRow = () => {
  emit('delete', localEntry.value.id)
}

const addProject = () => {
  const newProject: Project = {
    id: `proj-${Date.now()}`,
    name: '',
    hoursAllocated: 0,
    comment: ''
  }
  if (!localEntry.value.projects) {
    localEntry.value.projects = []
  }
  localEntry.value.projects.push(newProject)
  // Don't automatically save when adding empty project - wait for user to enter name
}

const removeProject = (index: number) => {
  if (localEntry.value.projects && localEntry.value.projects.length > index) {
    localEntry.value.projects.splice(index, 1)
    handleProjectChange()
  }
}
</script>

<style scoped>
.time-entry-row {
  border-bottom: 1px solid #dee2e6;
}

.excel-grid-row {
  display: grid;
  grid-template-columns: minmax(140px, 1fr) minmax(120px, 1fr) minmax(120px, 1fr) minmax(120px, 1fr) minmax(140px, 1fr) minmax(200px, 2fr) minmax(120px, 1fr);
  transition: background-color 0.2s;
  min-height: 50px;
}

.grid-row:hover {
  background-color: #f8f9fa;
}

.row-selected {
  background-color: #e3f2fd !important;
}

.grid-cell {
  padding: 8px;
  border-right: 1px solid #dee2e6;
  display: flex;
  align-items: center;
  min-height: 44px;
}

.grid-cell:last-child {
  border-right: none;
}

.cell-input {
  width: 100%;
  border: 1px solid transparent;
  background: transparent;
  padding: 4px 6px;
  border-radius: 3px;
  font-size: 14px;
  transition: border-color 0.2s, background-color 0.2s;
}

.cell-input:focus {
  outline: none;
  border-color: #007bff;
  background-color: white;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.cell-input:hover {
  border-color: #ced4da;
  background-color: white;
}

.total-hours {
  justify-content: center;
  font-weight: 600;
  color: #495057;
}

.calculated-value {
  font-family: 'Courier New', monospace;
  font-size: 14px;
}

.projects-cell {
  justify-content: space-between;
}

.projects-summary {
  flex: 1;
}

.no-projects {
  color: #6c757d;
  font-style: italic;
}

.project-count {
  color: #495057;
  font-size: 14px;
}

.expand-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 3px;
  color: #6c757d;
  transition: background-color 0.2s, color 0.2s;
}

.expand-btn:hover {
  background-color: #e9ecef;
  color: #495057;
}

.expand-btn.expanded {
  color: #007bff;
}

.actions-cell {
  justify-content: center;
}

.btn-delete {
  background: none;
  border: none;
  cursor: pointer;
  color: #dc3545;
  font-size: 16px;
  padding: 4px 8px;
  border-radius: 3px;
  transition: background-color 0.2s;
}

.btn-delete:hover {
  background-color: #f8d7da;
}

.validation-row {
  background-color: #fff;
  padding: 8px 16px;
  border-left: 4px solid #dc3545;
  border-bottom: 1px solid #dee2e6;
}

.projects-section {
  background-color: #f8f9fa;
  padding: 16px;
  border-top: 1px solid #dee2e6;
}

.projects-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.projects-header h4 {
  margin: 0;
  color: #495057;
  font-size: 16px;
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-small {
  padding: 4px 8px;
  font-size: 11px;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.projects-grid {
  border: 1px solid #dee2e6;
  border-radius: 4px;
  background: white;
}

.project-grid-row {
  display: grid;
  grid-template-columns: 1fr 120px 1fr 60px;
}

.project-row:last-child {
  border-bottom: none;
}

.project-header {
  background-color: #e9ecef;
  font-weight: 600;
}

.project-cell {
  padding: 8px;
  border-right: 1px solid #dee2e6;
  display: flex;
  align-items: center;
  min-height: 36px;
}

.project-cell:last-child {
  border-right: none;
  justify-content: center;
}

.projects-summary-row {
  padding: 8px;
  background-color: #f8f9fa;
  border-top: 1px solid #dee2e6;
  font-size: 14px;
  color: #495057;
}

.summary-text {
  font-weight: 500;
}

.hours-over {
  color: #dc3545;
  font-weight: 600;
}

.hours-under {
  color: #28a745;
  font-weight: 600;
}

/* Responsive design */
@media (max-width: 1200px) {
  .excel-grid-row {
    grid-template-columns: minmax(120px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(120px, 1fr) minmax(150px, 1.5fr) minmax(100px, 1fr);
  }
}

@media (max-width: 768px) {
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
  
  .project-grid-row {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(4, auto);
  }
}
</style>