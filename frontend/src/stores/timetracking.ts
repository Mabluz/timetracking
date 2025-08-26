import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TimeEntry, ProjectSummary, YearlyStatistics, YearlyProjectStats, MonthlyStats } from '@/types'
import { timeEntriesApi, projectsApi } from '@/services/api'

// Simple UUID v4 generator for client-side use
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// LocalStorage utilities
const STORAGE_KEYS = {
  TIME_ENTRIES: 'timetracking_entries',
  PROJECTS: 'timetracking_projects',
  OFFLINE_QUEUE: 'timetracking_offline_queue',
  LAST_EDITED_ENTRY: 'timetracking_last_edited_entry'
}

const localStorageHelper = {
  getTimeEntries(): TimeEntry[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TIME_ENTRIES)
      const parsed = data ? JSON.parse(data) : []
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      console.error('Error reading time entries from localStorage:', error)
      return []
    }
  },
  
  setTimeEntries(entries: TimeEntry[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TIME_ENTRIES, JSON.stringify(entries))
    } catch (error) {
      console.error('Error saving time entries to localStorage:', error)
    }
  },
  
  getProjects(): ProjectSummary[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROJECTS)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('Error reading projects from localStorage:', error)
      return []
    }
  },
  
  setProjects(projects: ProjectSummary[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects))
    } catch (error) {
      console.error('Error saving projects to localStorage:', error)
    }
  },
  
  getOfflineQueue(): any[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('Error reading offline queue from localStorage:', error)
      return []
    }
  },
  
  setOfflineQueue(queue: any[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue))
    } catch (error) {
      console.error('Error saving offline queue to localStorage:', error)
    }
  },
  
  addToOfflineQueue(action: any): void {
    const queue = this.getOfflineQueue()
    queue.push({ ...action, timestamp: Date.now() })
    this.setOfflineQueue(queue)
  },
  
  clearOfflineQueue(): void {
    this.setOfflineQueue([])
  },
  
  getLastEditedEntry(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.LAST_EDITED_ENTRY)
    } catch (error) {
      console.error('Error reading last edited entry from localStorage:', error)
      return null
    }
  },
  
  setLastEditedEntry(entryId: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_EDITED_ENTRY, entryId)
    } catch (error) {
      console.error('Error saving last edited entry to localStorage:', error)
    }
  },

  clearAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.TIME_ENTRIES)
    localStorage.removeItem(STORAGE_KEYS.PROJECTS)
    localStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE)
    localStorage.removeItem(STORAGE_KEYS.LAST_EDITED_ENTRY)
  }
}

export const useTimeTrackingStore = defineStore('timetracking', () => {
  // State
  const timeEntries = ref<TimeEntry[]>([])
  const projects = ref<ProjectSummary[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastSaved = ref<string | null>(null)
  const isOnline = ref(true)
  const highlightDateRange = ref<{ fromDate: string; toDate: string } | null>(null)
  const lastEditedEntry = ref<string | null>(null)

  // Getters
  const sortedTimeEntries = computed(() => {
    if (!Array.isArray(timeEntries.value)) {
      console.error('timeEntries.value is not an array!', timeEntries.value)
      return []
    }
    
    return [...timeEntries.value].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  })

  const totalHoursToday = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    const todayEntry = timeEntries.value.find(entry => entry.date === today)
    return todayEntry?.totalHours || 0
  })

  // Actions
  const setLastSaved = (timestamp: string) => {
    lastSaved.value = timestamp
    // Auto-hide notification after 3 seconds
    setTimeout(() => {
      if (lastSaved.value === timestamp) {
        lastSaved.value = null
      }
    }, 3000)
  }

  const fetchTimeEntries = async () => {
    try {
      loading.value = true
      error.value = null
      
      if (isOnline.value) {
        // Use direct fetch instead of axios to avoid issues
        try {
          const response = await fetch('http://localhost:3010/api/timeentries')
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          const entries = await response.json()
          
          // Ensure we have an array
          if (Array.isArray(entries)) {
            timeEntries.value = entries
            // Cache in localStorage
            localStorageHelper.setTimeEntries(timeEntries.value)
          } else {
            console.error('API response is not an array!', entries)
            timeEntries.value = []
          }
        } catch (fetchError) {
          console.error('Direct fetch failed, trying axios...', fetchError)
          // Fallback to axios
          const entries = await timeEntriesApi.getAll()
          
          if (Array.isArray(entries)) {
            timeEntries.value = entries
            // Cache in localStorage
            localStorageHelper.setTimeEntries(timeEntries.value)
          } else {
            console.error('Axios response is not an array!', entries)
            timeEntries.value = []
          }
        }
      } else {
        // Load from localStorage when offline
        timeEntries.value = localStorageHelper.getTimeEntries()
      }
    } catch (err) {
      error.value = 'Failed to fetch time entries'
      console.error('API fetch error:', err)
      isOnline.value = false
      // Fallback to localStorage
      timeEntries.value = localStorageHelper.getTimeEntries()
    } finally {
      loading.value = false
    }
  }

  const fetchProjects = async () => {
    try {
      if (isOnline.value) {
        const projectList = await projectsApi.getAll()
        projects.value = projectList
        // Cache in localStorage
        localStorageHelper.setProjects(projectList)
      } else {
        // Load from localStorage when offline
        projects.value = localStorageHelper.getProjects()
      }
    } catch (err) {
      error.value = 'Failed to fetch projects'
      console.error(err)
      isOnline.value = false
      // Fallback to localStorage
      projects.value = localStorageHelper.getProjects()
    }
  }

  const createTimeEntry = async (entry: Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      loading.value = true
      error.value = null
      
      if (isOnline.value) {
        const result = await timeEntriesApi.create(entry)
        timeEntries.value.push(result)
        localStorageHelper.setTimeEntries(timeEntries.value)
        setLastSaved(result.lastSaved)
        return result
      } else {
        // Create offline entry
        const offlineEntry: TimeEntry = {
          ...entry,
          id: generateUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        timeEntries.value.push(offlineEntry)
        localStorageHelper.setTimeEntries(timeEntries.value)
        localStorageHelper.addToOfflineQueue({
          type: 'create',
          data: entry
        })
        return offlineEntry
      }
    } catch (err) {
      error.value = 'Failed to create time entry'
      console.error(err)
      isOnline.value = false
      // Try offline mode
      const offlineEntry: TimeEntry = {
        ...entry,
        id: generateUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      timeEntries.value.push(offlineEntry)
      localStorageHelper.setTimeEntries(timeEntries.value)
      localStorageHelper.addToOfflineQueue({
        type: 'create',
        data: entry
      })
      return offlineEntry
    } finally {
      loading.value = false
    }
  }

  const updateTimeEntry = async (id: string, updates: Partial<TimeEntry>) => {
    try {
      error.value = null
      
      if (isOnline.value) {
        const result = await timeEntriesApi.update(id, updates)
        const index = timeEntries.value.findIndex(entry => entry.id === id)
        if (index !== -1) {
          timeEntries.value[index] = result
        }
        localStorageHelper.setTimeEntries(timeEntries.value)
        setLastSaved(result.lastSaved)
        return result
      } else {
        // Update offline
        const index = timeEntries.value.findIndex(entry => entry.id === id)
        if (index !== -1) {
          timeEntries.value[index] = {
            ...timeEntries.value[index],
            ...updates,
            updatedAt: new Date().toISOString()
          }
          localStorageHelper.setTimeEntries(timeEntries.value)
          localStorageHelper.addToOfflineQueue({
            type: 'update',
            id,
            data: updates
          })
          return timeEntries.value[index]
        }
        throw new Error('Entry not found')
      }
    } catch (err) {
      error.value = 'Failed to update time entry'
      console.error(err)
      isOnline.value = false
      // Try offline update
      const index = timeEntries.value.findIndex(entry => entry.id === id)
      if (index !== -1) {
        timeEntries.value[index] = {
          ...timeEntries.value[index],
          ...updates,
          updatedAt: new Date().toISOString()
        }
        localStorageHelper.setTimeEntries(timeEntries.value)
        localStorageHelper.addToOfflineQueue({
          type: 'update',
          id,
          data: updates
        })
        return timeEntries.value[index]
      }
      throw err
    }
  }

  const deleteTimeEntry = async (id: string) => {
    try {
      loading.value = true
      error.value = null
      const result = await timeEntriesApi.delete(id)
      timeEntries.value = timeEntries.value.filter(entry => entry.id !== id)
      setLastSaved(result.lastSaved)
    } catch (err) {
      error.value = 'Failed to delete time entry'
      console.error(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const createProject = async (project: Omit<ProjectSummary, 'totalHours' | 'lastUsed'>) => {
    try {
      const result = await projectsApi.create(project)
      projects.value.push(result)
      localStorageHelper.setProjects(projects.value)
      setLastSaved(result.lastSaved)
      return result
    } catch (err) {
      error.value = 'Failed to create project'
      console.error(err)
      throw err
    }
  }

  const updateProject = async (name: string, updates: Partial<ProjectSummary>) => {
    try {
      const result = await projectsApi.update(name, updates)
      const index = projects.value.findIndex(p => p.name === name)
      if (index !== -1) {
        projects.value[index] = result
        localStorageHelper.setProjects(projects.value)
        setLastSaved(result.lastSaved)
      }
      return result
    } catch (err) {
      error.value = 'Failed to update project'
      console.error(err)
      throw err
    }
  }

  const deleteProject = async (name: string) => {
    try {
      const result = await projectsApi.delete(name)
      projects.value = projects.value.filter(p => p.name !== name)
      localStorageHelper.setProjects(projects.value)
      setLastSaved(result.lastSaved)
      return result
    } catch (err) {
      error.value = 'Failed to delete project'
      console.error(err)
      throw err
    }
  }

  const calculateTotalHours = (startTime: string, endTime: string, hoursAway: number): number => {
    if (!startTime || !endTime) return 0
    
    const [startHour, startMinute] = startTime.split(':').map(Number)
    const [endHour, endMinute] = endTime.split(':').map(Number)
    
    const startTotalMinutes = startHour * 60 + startMinute
    const endTotalMinutes = endHour * 60 + endMinute
    
    let totalMinutes = endTotalMinutes - startTotalMinutes
    
    // Handle overnight shifts
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60
    }
    
    const totalHours = totalMinutes / 60
    return Math.max(0, totalHours - hoursAway)
  }

  const addTodayEntry = () => {
    const today = new Date().toISOString().split('T')[0]
    const existingEntry = timeEntries.value.find(entry => entry.date === today)
    
    if (!existingEntry) {
      const defaultEntry = {
        date: today,
        startTime: '09:00',
        endTime: '17:00',
        hoursAway: 0.5,
        totalHours: Number(import.meta.env.VITE_DEFAULT_WORK_DAY_HOURS) || 7.5,
        projects: []
      }
      createTimeEntry(defaultEntry)
    }
  }

  const setHighlightDateRange = (fromDate: string, toDate: string) => {
    highlightDateRange.value = { fromDate, toDate }
  }

  const setLastEditedEntry = (entryId: string) => {
    lastEditedEntry.value = entryId
    localStorageHelper.setLastEditedEntry(entryId)
  }

  const loadLastEditedEntry = () => {
    lastEditedEntry.value = localStorageHelper.getLastEditedEntry()
  }

  const calculateYearlyStatistics = (year: number): YearlyStatistics | null => {
    const yearEntries = timeEntries.value.filter(entry => {
      const entryYear = new Date(entry.date).getFullYear()
      return entryYear === year
    })

    if (yearEntries.length === 0) {
      return null
    }

    // Default hourly rate - configurable via environment variable
    const DEFAULT_HOURLY_RATE = Number(import.meta.env.VITE_DEFAULT_HOURLY_RATE) || 750

    // Calculate total hours and project stats
    const projectStats = new Map<string, YearlyProjectStats>()
    let totalHours = 0
    let billableHours = 0
    let nonBillableHours = 0
    
    // Overtime calculations
    const defaultWorkDayHours = Number(import.meta.env.VITE_DEFAULT_WORK_DAY_HOURS) || 7.5
    let totalOvertimeHours = 0
    let overtimeDays = 0

    yearEntries.forEach(entry => {
      totalHours += entry.totalHours
      
      // Calculate overtime for each entry
      const entryOvertimeHours = Math.max(0, (entry.totalHours || 0) - defaultWorkDayHours)
      if (entryOvertimeHours > 0) {
        totalOvertimeHours += entryOvertimeHours
        overtimeDays++
      }
      
      entry.projects.forEach(project => {
        const existing = projectStats.get(project.name) || {
          name: project.name,
          totalHours: 0,
          revenue: 0,
          percentage: 0,
          billableHours: 0,
          nonBillableHours: 0
        }
        
        existing.totalHours += project.hoursAllocated
        
        // Use project's billable property, defaulting to true if not specified
        const isBillable = project.billable !== false
        
        if (isBillable) {
          existing.billableHours += project.hoursAllocated
          existing.revenue += project.hoursAllocated * DEFAULT_HOURLY_RATE
          billableHours += project.hoursAllocated
        } else {
          existing.nonBillableHours += project.hoursAllocated
          nonBillableHours += project.hoursAllocated
        }
        
        projectStats.set(project.name, existing)
      })
    })

    // Calculate percentages for projects
    projectStats.forEach(project => {
      project.percentage = (project.totalHours / totalHours) * 100
    })

    const topProjects = Array.from(projectStats.values())
      .sort((a, b) => {
        // Primary sort: by revenue (descending)
        const revenueDiff = b.revenue - a.revenue
        if (revenueDiff !== 0) return revenueDiff
        
        // Secondary sort: by total hours (descending) when revenue is the same
        return b.totalHours - a.totalHours
      })

    // Monthly breakdown
    const monthlyStats = new Map<string, MonthlyStats>()
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    // Initialize all months
    monthNames.forEach((month, index) => {
      const monthKey = `${year}-${String(index + 1).padStart(2, '0')}`
      monthlyStats.set(monthKey, {
        month,
        totalHours: 0,
        projectHours: {}
      })
    })

    yearEntries.forEach(entry => {
      const monthKey = entry.date.substring(0, 7) // YYYY-MM
      const monthIndex = parseInt(entry.date.substring(5, 7)) - 1
      const monthName = monthNames[monthIndex]
      
      const monthData = monthlyStats.get(monthKey) || {
        month: monthName,
        totalHours: 0,
        projectHours: {}
      }
      
      monthData.totalHours += entry.totalHours
      
      entry.projects.forEach(project => {
        monthData.projectHours[project.name] = (monthData.projectHours[project.name] || 0) + project.hoursAllocated
      })
      
      monthlyStats.set(monthKey, monthData)
    })

    const monthlyBreakdown = Array.from(monthlyStats.values())
    
    // Find busiest and least busy months
    const monthsWithHours = monthlyBreakdown.filter(month => month.totalHours > 0)
    const busiestMonth = monthsWithHours.reduce((max, month) => 
      month.totalHours > max.totalHours ? month : max, 
      monthsWithHours[0] || { month: 'N/A', totalHours: 0 }
    )
    const leastBusyMonth = monthsWithHours.reduce((min, month) => 
      month.totalHours < min.totalHours ? month : min, 
      monthsWithHours[0] || { month: 'N/A', totalHours: 0 }
    )

    // Calculate working days and streaks
    const workingDays = yearEntries.length
    const sortedEntries = [...yearEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    let longestStreak = 0
    let currentStreak = 0
    let lastDate: Date | null = null

    sortedEntries.forEach(entry => {
      const currentDate = new Date(entry.date)
      
      if (lastDate) {
        const daysDiff = Math.round((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
        if (daysDiff === 1) {
          currentStreak++
        } else {
          longestStreak = Math.max(longestStreak, currentStreak)
          currentStreak = 1
        }
      } else {
        currentStreak = 1
      }
      
      lastDate = currentDate
    })
    longestStreak = Math.max(longestStreak, currentStreak)

    // Generate milestones
    const milestones: string[] = []
    if (totalHours >= 1000) milestones.push('🎯 1000+ Hours Logged')
    if (totalHours >= 1500) milestones.push('🚀 1500+ Hours Achieved')
    if (totalHours >= 2000) milestones.push('⭐ 2000+ Hours Mastery')
    if (billableHours / totalHours > 0.8) milestones.push('💰 80%+ Billable Hours')
    if (longestStreak >= 30) milestones.push('🔥 30+ Day Work Streak')
    if (workingDays >= 200) milestones.push('📅 200+ Working Days')

    // Calculate average daily hours
    const averageDailyHours = workingDays > 0 ? totalHours / workingDays : 0

    // Fun coffee calculation (1 cup per 4 hours worked)
    const coffeeEquivalent = Math.round(totalHours / 4)
    
    // Calculate overtime statistics
    const averageOvertimeHours = overtimeDays > 0 ? totalOvertimeHours / overtimeDays : 0
    const overtimePercentage = totalHours > 0 ? (totalOvertimeHours / totalHours) * 100 : 0

    return {
      year,
      totalHours: Math.round(totalHours * 100) / 100,
      billableHours: Math.round(billableHours * 100) / 100,
      nonBillableHours: Math.round(nonBillableHours * 100) / 100,
      totalRevenue: Math.round(billableHours * DEFAULT_HOURLY_RATE),
      averageHourlyRate: DEFAULT_HOURLY_RATE,
      topProjects,
      monthlyBreakdown,
      busiestMonth: {
        month: busiestMonth.month,
        hours: Math.round(busiestMonth.totalHours * 100) / 100,
        percentage: totalHours > 0 ? Math.round((busiestMonth.totalHours / totalHours) * 100 * 100) / 100 : 0
      },
      leastBusyMonth: {
        month: leastBusyMonth.month,
        hours: Math.round(leastBusyMonth.totalHours * 100) / 100,
        percentage: totalHours > 0 ? Math.round((leastBusyMonth.totalHours / totalHours) * 100 * 100) / 100 : 0
      },
      averageDailyHours: Math.round(averageDailyHours * 100) / 100,
      workingDays,
      longestStreak,
      milestones,
      coffeeEquivalent,
      totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
      overtimeDays,
      averageOvertimeHours: Math.round(averageOvertimeHours * 100) / 100,
      overtimePercentage: Math.round(overtimePercentage * 100) / 100
    }
  }

  // Network status detection
  const checkOnlineStatus = () => {
    isOnline.value = navigator.onLine
  }
  
  // Sync offline queue when back online
  const syncOfflineQueue = async () => {
    if (!isOnline.value) return
    
    const queue = localStorageHelper.getOfflineQueue()
    if (queue.length === 0) return
    
    console.log('Syncing offline queue:', queue.length, 'items')
    
    for (const action of queue) {
      try {
        switch (action.type) {
          case 'create':
            await timeEntriesApi.create(action.data)
            break
          case 'update':
            await timeEntriesApi.update(action.id, action.data)
            break
          case 'delete':
            await timeEntriesApi.delete(action.id)
            break
        }
      } catch (error) {
        console.error('Failed to sync action:', action, error)
        // Keep failed actions in queue
        continue
      }
    }
    
    // Clear queue after successful sync
    localStorageHelper.clearOfflineQueue()
    
    // Refresh data from server
    await Promise.all([fetchTimeEntries(), fetchProjects()])
  }
  
  // Initialize
  const initialize = async () => {
    // Reset to safe defaults
    timeEntries.value = []
    projects.value = []
    error.value = null
    
    // Set up network status listeners
    window.addEventListener('online', () => {
      checkOnlineStatus()
      syncOfflineQueue()
    })
    window.addEventListener('offline', checkOnlineStatus)
    
    // Initial status check
    checkOnlineStatus()
    
    // Load data
    await Promise.all([fetchTimeEntries(), fetchProjects()])
    
    // Load last edited entry
    loadLastEditedEntry()
    
    // Sync offline queue if online
    if (isOnline.value) {
      await syncOfflineQueue()
    }
  }

  return {
    // State
    timeEntries,
    projects,
    loading,
    error,
    lastSaved,
    isOnline,
    highlightDateRange,
    lastEditedEntry,
    
    // Getters
    sortedTimeEntries,
    totalHoursToday,
    
    // Actions
    fetchTimeEntries,
    fetchProjects,
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    createProject,
    updateProject,
    deleteProject,
    calculateTotalHours,
    addTodayEntry,
    initialize,
    setLastSaved,
    setHighlightDateRange,
    setLastEditedEntry,
    loadLastEditedEntry,
    calculateYearlyStatistics
  }
})