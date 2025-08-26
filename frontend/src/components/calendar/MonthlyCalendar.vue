<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TimeEntry } from '@/types'

interface Props {
  selectedMonth: string
  entries: TimeEntry[]
}

const props = defineProps<Props>()

const calendarDays = computed(() => {
  if (!props.selectedMonth) return []
  
  
  const [year, month] = props.selectedMonth.split('-').map(Number)
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const startOfCalendar = new Date(firstDay)
  
  // Start from the beginning of the week containing the first day (Monday = 0)
  const dayOfWeek = startOfCalendar.getDay()
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Make Monday the first day
  startOfCalendar.setDate(startOfCalendar.getDate() - daysToSubtract)
  
  const days = []
  const current = new Date(startOfCalendar)
  
  // Generate 6 weeks worth of days (42 days) to ensure full calendar
  for (let i = 0; i < 42; i++) {
    // Use local date to avoid timezone issues
    const dayString = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`
    const isCurrentMonth = current.getMonth() === month - 1
    
    // Find entries for this day - handle both date formats
    const dayEntries = props.entries.filter(entry => {
      // Handle both YYYY-MM-DD and YYYY-MM-DDTHH:MM:SS.SSSZ formats
      const entryDateString = entry.date.split('T')[0] // Extract just the date part
      return entryDateString === dayString
    })
    
    
    // Calculate total hours and projects for this day
    let totalHours = 0
    const projectsMap = new Map<string, number>()
    
    dayEntries.forEach(entry => {
      totalHours += entry.totalHours
      entry.projects.forEach(project => {
        const existing = projectsMap.get(project.name) || 0
        projectsMap.set(project.name, existing + project.hoursAllocated)
      })
    })
    
    // Calculate overtime for this day
    const defaultWorkDayHours = Number(import.meta.env.VITE_DEFAULT_WORK_DAY_HOURS) || 7.5
    const overtimeHours = Math.max(0, totalHours - defaultWorkDayHours)
    
    // Create projects summary with comments
    const projects = Array.from(projectsMap.entries()).map(([name, hours]) => {
      // Find comments for this project from any entry on this day
      const projectComments = dayEntries
        .flatMap(entry => entry.projects)
        .filter(project => project.name === name && project.comment)
        .map(project => project.comment?.trim())
        .filter(comment => comment && comment.length > 0)

      return {
        name,
        hours: Math.round(hours * 100) / 100,
        comments: [...new Set(projectComments)] // Remove duplicates
      }
    }).sort((a, b) => b.hours - a.hours)
    
    days.push({
      date: new Date(current),
      dateString: dayString,
      dayNumber: current.getDate(),
      isCurrentMonth,
      isToday: dayString === new Date().toISOString().split('T')[0],
      entries: dayEntries,
      totalHours: Math.round(totalHours * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      projects,
      hasData: dayEntries.length > 0
    })
    
    current.setDate(current.getDate() + 1)
  }
  
  return days
})

const monthName = computed(() => {
  if (!props.selectedMonth) return ''
  const [year, month] = props.selectedMonth.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
})

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const showComments = ref(false)
</script>

<template>
  <div class="monthly-calendar">
    <div class="calendar-header">
      <h4>{{ monthName }} Calendar</h4>
      <div class="calendar-options">
        <label class="comments-toggle">
          <input 
            type="checkbox" 
            v-model="showComments"
            class="checkbox-input"
          />
          <span class="checkbox-label">💬</span>
          <span class="checkbox-text">Show Comments</span>
        </label>
      </div>
    </div>
    
    <div class="calendar-grid">
      <!-- Week day headers -->
      <div class="week-header">
        <div 
          v-for="day in weekDays" 
          :key="day"
          class="day-header"
        >
          {{ day }}
        </div>
      </div>
      
      
      <!-- Calendar days -->
      <div class="calendar-body">
        <div 
          v-for="day in calendarDays" 
          :key="day.dateString"
          class="calendar-day"
          :class="{
            'other-month': !day.isCurrentMonth,
            'today': day.isToday,
            'has-data': day.hasData
          }"
        >
          <div class="day-number">{{ day.dayNumber }}</div>
          
          <div v-if="day.hasData" class="day-content">
            <div class="hours-row">
              <div class="total-hours">{{ day.totalHours }}h</div>
              <div 
                v-if="day.overtimeHours > 0" 
                class="overtime-hours"
                :title="`Overtime: +${day.overtimeHours}h`"
              >
                +{{ day.overtimeHours }}h
              </div>
            </div>
            
            <div class="day-projects">
              <div 
                v-for="project in day.projects.slice(0, 3)" 
                :key="project.name"
                class="project-summary"
                :class="{ 'with-comments': showComments && project.comments.length > 0 }"
                :title="`${project.name}: ${project.hours}h${project.comments.length > 0 ? ' - ' + project.comments.join(', ') : ''}`"
              >
                <div class="project-main">
                  <span class="project-name">{{ project.name }}</span>
                  <span class="project-hours">{{ project.hours }}h</span>
                </div>
                <div 
                  v-if="showComments && project.comments.length > 0" 
                  class="project-comments"
                >
                  <div 
                    v-for="comment in project.comments" 
                    :key="comment"
                    class="project-comment"
                  >
                    {{ comment }}
                  </div>
                </div>
              </div>
              
              <div 
                v-if="day.projects.length > 3" 
                class="more-projects"
                :title="`+${day.projects.length - 3} more projects`"
              >
                +{{ day.projects.length - 3 }} more
              </div>
            </div>
            
            <div 
              v-if="day.entries.some(entry => entry.imported)" 
              class="imported-indicator"
              title="Contains imported entries"
            >
              ✓
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.monthly-calendar {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: 100%;
  min-height: 600px;
}


.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.calendar-header h4 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.calendar-options {
  display: flex;
  align-items: center;
}

.comments-toggle {
  display: flex;
  align-items: center;
  cursor: pointer;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 4px;
  transition: background-color 0.2s;
  user-select: none;
}

.comments-toggle:hover {
  background-color: #f8f9fa;
}

.comments-toggle .checkbox-input {
  opacity: 0;
  position: absolute;
  width: 0;
  height: 0;
}

.comments-toggle .checkbox-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: 2px solid #dee2e6;
  border-radius: 3px;
  background: white;
  font-size: 12px;
  transition: all 0.2s ease;
}

.comments-toggle .checkbox-input:checked + .checkbox-label {
  background: #17a2b8;
  border-color: #17a2b8;
  color: white;
}

.comments-toggle .checkbox-input:checked + .checkbox-label::before {
  content: "✓";
  position: absolute;
  font-size: 14px;
  font-weight: bold;
  color: white;
}

.comments-toggle .checkbox-input:focus + .checkbox-label {
  box-shadow: 0 0 0 2px rgba(23, 162, 184, 0.25);
}

.comments-toggle .checkbox-text {
  font-size: 14px;
  font-weight: 500;
  color: #495057;
}

.calendar-grid {
  display: flex;
  flex-direction: column;
}

.week-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  margin-bottom: 8px;
}

.day-header {
  background: #f8f9fa;
  padding: 12px 8px;
  text-align: center;
  font-weight: 600;
  color: #495057;
  border-radius: 4px;
  font-size: 14px;
}

.calendar-body {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: #dee2e6;
  border-radius: 4px;
  overflow: hidden;
}

.calendar-day {
  background: white;
  min-height: 120px;
  padding: 8px;
  position: relative;
  display: flex;
  flex-direction: column;
  transition: background-color 0.2s ease;
}

.calendar-day:hover {
  background: #f8f9fa;
}

.calendar-day.other-month {
  background: #f8f9fa;
  color: #6c757d;
}

.calendar-day.other-month:hover {
  background: #e9ecef;
}

.calendar-day.today {
  background: #e3f2fd;
  border: 2px solid #2196f3;
}

.calendar-day.has-data {
  background: #f1f3f4;
  border: 1px solid #dee2e6;
}

.calendar-day.has-data.today {
  background: #e3f2fd;
  border: 2px solid #2196f3;
}

.day-number {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 4px;
  color: #333;
}

.other-month .day-number {
  color: #adb5bd;
}

.day-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hours-row {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-wrap: wrap;
}

.total-hours {
  font-weight: 700;
  color: #28a745;
  font-size: 16px;
  background: rgba(40, 167, 69, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
}

.overtime-hours {
  font-weight: 600;
  color: #fd7e14;
  font-size: 12px;
  background: linear-gradient(135deg, #fff3cd, #ffeaa7);
  padding: 2px 5px;
  border-radius: 3px;
  border: 1px solid #ffc107;
  display: inline-block;
  animation: overtimePulse 2s ease-in-out infinite;
}

@keyframes overtimePulse {
  0% {
    box-shadow: 0 1px 2px rgba(255, 193, 7, 0.3);
  }
  50% {
    box-shadow: 0 2px 4px rgba(255, 193, 7, 0.5);
  }
  100% {
    box-shadow: 0 1px 2px rgba(255, 193, 7, 0.3);
  }
}

.day-projects {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
}

.project-summary {
  background: rgba(0, 123, 255, 0.1);
  padding: 3px 6px;
  border-radius: 3px;
  font-size: 11px;
  line-height: 1.2;
}

.project-summary.with-comments {
  background: rgba(23, 162, 184, 0.15);
  border-left: 2px solid #17a2b8;
  padding-left: 4px;
}

.project-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.project-name {
  font-weight: 500;
  color: #495057;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 4px;
}

.project-hours {
  font-weight: 600;
  color: #007bff;
  flex-shrink: 0;
}

.project-comments {
  margin-top: 2px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.project-comment {
  font-size: 10px;
  color: #6c757d;
  font-style: italic;
  background: rgba(255, 255, 255, 0.7);
  padding: 1px 3px;
  border-radius: 2px;
  line-height: 1.1;
  word-break: break-word;
  max-height: 2.2em;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.more-projects {
  font-size: 10px;
  color: #6c757d;
  font-style: italic;
  text-align: center;
  padding: 2px;
}

.imported-indicator {
  position: absolute;
  top: 4px;
  right: 4px;
  background: #28a745;
  color: white;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

@media (max-width: 768px) {
  .calendar-day {
    min-height: 80px;
    padding: 4px;
  }
  
  .day-number {
    font-size: 14px;
  }
  
  .project-summary {
    font-size: 10px;
    padding: 2px 4px;
  }
  
  .total-hours {
    font-size: 12px;
  }
  
  .imported-indicator {
    width: 14px;
    height: 14px;
    font-size: 10px;
  }
}

@media (max-width: 480px) {
  .calendar-day {
    min-height: 60px;
    padding: 2px;
  }
  
  .project-summary {
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
  }
  
  .project-hours {
    font-size: 10px;
  }
}
</style>