<template>
  <div class="time-entry-row">
    <!-- Main Row -->
    <div class="excel-grid-row" :class="{ 'selected': isExpanded, 'highlighted': isHighlighted, 'last-edited': isLastEdited, 'imported': localEntry.imported }">
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
        <span class="total-hours-display">{{ (localEntry.totalHours || 0).toFixed(2) }}h</span>
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
          class="excel-btn expand-btn projects-toggle-btn"
          :class="{ 'expanded': isExpanded }"
          :title="isExpanded ? 'Hide project details' : 'Show project details'"
        >
          <span class="toggle-icon">{{ isExpanded ? '🔽' : '▶️' }}</span>
          <span class="toggle-text">{{ isExpanded ? 'Hide' : 'Projects' }}</span>
        </button>
      </div>

      <!-- Actions -->
      <div class="excel-grid-cell actions-cell">
        <div class="actions-group">
          <label class="imported-checkbox" title="Mark as imported elsewhere">
            <input
              type="checkbox"
              v-model="localEntry.imported"
              @change="handleImportedChange"
              class="checkbox-input"
            />
            <span class="checkbox-label">📤</span>
          </label>
          <button @click="deleteRow" class="excel-btn btn-delete" title="Delete entry">
            🗑️
          </button>
        </div>
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
import { ref, computed, watch, nextTick } from 'vue'
import { useTimeTrackingStore } from '@/stores/timetracking'
import { useValidation } from '@/composables/useValidation'
import ValidationIndicator from '@/components/common/ValidationIndicator.vue'
import DatePicker from '@/components/common/DatePicker.vue'
import TimeInput from '@/components/common/TimeInput.vue'
import type { TimeEntry, Project } from '@/types'

interface Props {
  entry: TimeEntry
  isExpanded: boolean
  isHighlighted?: boolean
  isLastEdited?: boolean
}

interface Emits {
  (e: 'update', id: string, updates: Partial<TimeEntry>): void
  (e: 'delete', id: string): void
  (e: 'toggle-projects', id: string): void
  (e: 'calculate-hours', id: string, startTime: string, endTime: string, hoursAway: number): void
  (e: 'entry-edited', id: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const store = useTimeTrackingStore()
const localEntry = ref<TimeEntry>({
  ...props.entry,
  imported: props.entry.imported ?? false
})

// Flag to prevent external updates from overriding local changes
const isUpdatingLocally = ref(false)

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
  if (!isUpdatingLocally.value) {
    localEntry.value = {
      ...newEntry,
      imported: newEntry.imported ?? false
    }
    validateEntry()
  }
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
  emit('entry-edited', localEntry.value.id)
  emit('update', localEntry.value.id, {
    date: localEntry.value.date
  })
}

const handleTimeChange = () => {
  emit('entry-edited', localEntry.value.id)
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
    emit('entry-edited', localEntry.value.id)
    emit('update', localEntry.value.id, {
      projects: localEntry.value.projects
    })
  }
}

const handleImportedChange = () => {
  isUpdatingLocally.value = true

  emit('entry-edited', localEntry.value.id)
  emit('update', localEntry.value.id, {
    imported: localEntry.value.imported
  })

  // Reset the flag after a short delay
  nextTick(() => {
    setTimeout(() => {
      isUpdatingLocally.value = false
    }, 100)
  })
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

.excel-grid-row.highlighted {
  background-color: #fff3cd !important;
  border-left: 4px solid #ffc107;
}

.excel-grid-row.highlighted:hover {
  background-color: #ffeaa7 !important;
}

.excel-grid-row.last-edited {
  background-color: #e8f5e8 !important;
  border-left: 4px solid #28a745;
  box-shadow: 0 2px 4px rgba(40, 167, 69, 0.2);
}

.excel-grid-row.last-edited:hover {
  background-color: #d4f4d4 !important;
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

.total-hours-display {
  font-size: 16px;
  font-weight: 700;
  color: #2c3e50;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 50%, #f8f9fa 100%);
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #e9ecef;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
  font-family: 'Segoe UI', system-ui, sans-serif;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
  text-align: center;
  position: relative;
}

.total-hours-display:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.12);
  border-color: #ced4da;
  color: #1a252f;
}

.calculated-value {
  font-family: 'Courier New', monospace;
  font-size: 14px;
}

.projects-cell {
  justify-content: space-between;
  align-items: center;
  display: flex;
  gap: 8px;
}

.projects-summary {
  flex: 1;
  min-width: 0;
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

.projects-toggle-btn {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border: 2px solid #dee2e6;
  border-radius: 6px;
  padding: 6px 10px;
  min-width: 80px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-weight: 500;
  color: #495057;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

.projects-toggle-btn:hover {
  background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%);
  border-color: #ced4da;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.projects-toggle-btn.expanded {
  background: linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%);
  border-color: #17a2b8;
  color: #0c5460;
}

.projects-toggle-btn.expanded:hover {
  background: linear-gradient(135deg, #bee5eb 0%, #a6d9e6 100%);
  border-color: #138496;
}

.toggle-icon {
  font-size: 14px;
  line-height: 1;
}

.toggle-text {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.actions-cell {
  justify-content: center;
}

.actions-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.imported-checkbox {
  display: flex;
  align-items: center;
  cursor: pointer;
  position: relative;
}

.checkbox-input {
  opacity: 0;
  position: absolute;
  width: 0;
  height: 0;
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 2px solid #dee2e6;
  border-radius: 4px;
  background: white;
  font-size: 14px;
  transition: all 0.2s ease;
  user-select: none;
}

.checkbox-input:checked + .checkbox-label {
  background: #28a745;
  border-color: #28a745;
  color: white;
}

.checkbox-input:checked + .checkbox-label::before {
  content: "✓";
  position: absolute;
  font-size: 16px;
  font-weight: bold;
  color: white;
}

.checkbox-input:focus + .checkbox-label {
  box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.25);
}

.checkbox-label:hover {
  border-color: #28a745;
  background: #f8f9fa;
}

.checkbox-input:checked + .checkbox-label:hover {
  background: #218838;
  border-color: #1e7e34;
}

/* Grey-out styling for imported rows */
.excel-grid-row.imported {
  opacity: 0.6;
  background-color: #acadae !important;
  color: #6c757d;
}

.excel-grid-row.imported:hover {
  opacity: 0.75;
  background-color: #e9ecef !important;
}

.excel-grid-row.imported input {
  background-color: #acadae !important;
  color: #6c757d;
}

.excel-grid-row.imported .total-hours-display {
  opacity: 0.7;
  background: linear-gradient(135deg, #f1f3f4 0%, #e8eaed 50%, #f1f3f4 100%);
  color: #5f6368;
  border-color: #dadce0;
}

.excel-grid-row.imported .projects-toggle-btn {
  opacity: 0.7;
  background: linear-gradient(135deg, #f1f3f4 0%, #e8eaed 100%);
  color: #5f6368;
  border-color: #dadce0;
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
