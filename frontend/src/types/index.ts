export interface Project {
  id: string
  name: string
  hoursAllocated: number
  comment: string
  billable?: boolean
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
  imported?: boolean
}

export interface ProjectSummary {
  name: string
  totalHours: number
  lastUsed: string
  billable?: boolean
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

export interface YearlyProjectStats {
  name: string
  totalHours: number
  revenue: number
  percentage: number
  billableHours: number
  nonBillableHours: number
}

export interface MonthlyStats {
  month: string
  totalHours: number
  projectHours: Record<string, number>
}

export interface YearlyStatistics {
  year: number
  totalHours: number
  billableHours: number
  nonBillableHours: number
  totalRevenue: number
  averageHourlyRate: number
  topProjects: YearlyProjectStats[]
  monthlyBreakdown: MonthlyStats[]
  busiestMonth: { month: string; hours: number; percentage: number }
  leastBusyMonth: { month: string; hours: number; percentage: number }
  averageDailyHours: number
  workingDays: number
  longestStreak: number
  milestones: string[]
  coffeeEquivalent: number
  totalOvertimeHours: number
  overtimeDays: number
  averageOvertimeHours: number
  overtimePercentage: number
}