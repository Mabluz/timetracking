export interface Project {
  id: string
  name: string
  hoursAllocated: number
  comment: string
}

export interface TimeEntry {
  id: string
  date: string
  startTime: string
  endTime: string
  hoursAway: number
  totalHours: number
  projects: Project[]
  createdAt: string
  updatedAt: string
}

export interface ProjectSummary {
  name: string
  totalHours: number
  lastUsed: string
}

export interface DataMetadata {
  version: string
  lastModified: string
  totalEntries: number
}

export interface TimeTrackingData {
  metadata: DataMetadata
  timeEntries: TimeEntry[]
  projects: ProjectSummary[]
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  lastSaved?: string
}