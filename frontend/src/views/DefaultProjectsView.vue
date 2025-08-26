<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useTimeTrackingStore } from '@/stores/timetracking'
import type { ProjectSummary } from '@/types'

const store = useTimeTrackingStore()

const editingProject = ref<ProjectSummary | null>(null)
const editingOriginalName = ref<string | null>(null)
const showAddForm = ref(false)
const newProjectName = ref('')

const startEdit = (project: ProjectSummary) => {
  editingProject.value = { ...project }
  editingOriginalName.value = project.name
}

const cancelEdit = () => {
  editingProject.value = null
  editingOriginalName.value = null
}

const saveEdit = async () => {
  if (!editingProject.value || !editingOriginalName.value) return
  
  try {
    // Save to backend/localStorage using the original name as the key
    await store.updateProject(editingOriginalName.value, editingProject.value)
    editingProject.value = null
    editingOriginalName.value = null
  } catch (error) {
    console.error('Failed to save project:', error)
  }
}

const deleteProject = async (projectName: string) => {
  if (confirm(`Are you sure you want to delete the project "${projectName}"?`)) {
    try {
      await store.deleteProject(projectName)
    } catch (error) {
      console.error('Failed to delete project:', error)
    }
  }
}

const addNewProject = async () => {
  if (!newProjectName.value.trim()) return
  
  try {
    await store.createProject({ name: newProjectName.value.trim() })
    newProjectName.value = ''
    showAddForm.value = false
  } catch (error) {
    console.error('Failed to create project:', error)
  }
}

const cancelAdd = () => {
  newProjectName.value = ''
  showAddForm.value = false
}

onMounted(() => {
  store.fetchProjects()
})
</script>

<template>
  <div class="default-projects-view">
    <div class="header">
      <h2>Default Projects</h2>
      <button 
        class="btn-primary" 
        @click="showAddForm = true"
        v-if="!showAddForm"
      >
        Add Project
      </button>
    </div>

    <!-- Add new project form -->
    <div v-if="showAddForm" class="add-form">
      <div class="form-row">
        <input
          v-model="newProjectName"
          type="text"
          placeholder="Project name"
          class="form-input"
          @keyup.enter="addNewProject"
          @keyup.escape="cancelAdd"
        />
        <div class="form-actions">
          <button class="btn-success" @click="addNewProject">Add</button>
          <button class="btn-secondary" @click="cancelAdd">Cancel</button>
        </div>
      </div>
    </div>

    <!-- Projects list -->
    <div class="projects-list">
      <div
        v-for="project in store.projects"
        :key="project.name"
        class="project-item"
      >
        <div v-if="editingOriginalName === project.name" class="edit-form">
          <div class="form-row">
            <input
              v-model="editingProject!.name"
              type="text"
              class="form-input"
              @keyup.enter="saveEdit"
              @keyup.escape="cancelEdit"
            />
            <div class="form-actions">
              <button class="btn-success" @click="saveEdit">Save</button>
              <button class="btn-secondary" @click="cancelEdit">Cancel</button>
            </div>
          </div>
        </div>
        
        <div v-else class="project-display">
          <div class="project-info">
            <span class="project-name">{{ project.name }}</span>
            <div class="project-stats">
              <span class="total-hours">{{ project.totalHours }}h total</span>
              <span class="last-used" v-if="project.lastUsed">
                Last used: {{ new Date(project.lastUsed).toLocaleDateString() }}
              </span>
            </div>
          </div>
          
          <div class="project-actions">
            <button class="btn-edit" @click="startEdit(project)">Edit</button>
            <button class="btn-delete" @click="deleteProject(project.name)">Delete</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="store.projects.length === 0" class="empty-state">
      <p>No projects found. Add your first project above.</p>
    </div>
  </div>
</template>

<style scoped>
.default-projects-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header h2 {
  margin: 0;
  color: #333;
  font-size: 24px;
  font-weight: 600;
}

.add-form {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.projects-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.project-item {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 16px;
}

.project-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.project-info {
  flex: 1;
}

.project-name {
  font-weight: 600;
  font-size: 16px;
  color: #333;
  display: block;
  margin-bottom: 4px;
}

.project-stats {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #6c757d;
}

.project-actions {
  display: flex;
  gap: 8px;
}

.form-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.form-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

.form-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.form-actions {
  display: flex;
  gap: 8px;
}

/* Button styles */
.btn-primary {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.btn-success {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-success:hover {
  background-color: #1e7e34;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-secondary:hover {
  background-color: #545b62;
}

.btn-edit {
  background-color: #ffc107;
  color: #212529;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-edit:hover {
  background-color: #e0a800;
}

.btn-delete {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-delete:hover {
  background-color: #c82333;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #6c757d;
}

.edit-form {
  width: 100%;
}

@media (max-width: 600px) {
  .project-display {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .project-actions {
    align-self: flex-end;
  }
  
  .form-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .form-actions {
    justify-content: flex-end;
  }
}
</style>