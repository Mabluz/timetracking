import { ref, computed } from 'vue'

export interface ValidationError {
  field: string
  message: string
  type: 'error' | 'warning'
}

export interface ValidationRules {
  required?: boolean
  min?: number
  max?: number
  pattern?: RegExp
  custom?: (value: any) => string | null
}

export function useValidation() {
  const errors = ref<ValidationError[]>()

  // Time format validation (24-hour format)
  const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/

  const validateTimeFormat = (time: string): string | null => {
    if (!time) return 'Time is required'
    if (!timePattern.test(time)) {
      return 'Time must be in 24-hour format (HH:MM)'
    }
    return null
  }

  const validateTimeSequence = (startTime: string, endTime: string, hoursAway: number): ValidationError[] => {
    const errors: ValidationError[] = []

    if (!startTime || !endTime) {
      return errors
    }

    const startError = validateTimeFormat(startTime)
    if (startError) {
      errors.push({ field: 'startTime', message: startError, type: 'error' })
    }

    const endError = validateTimeFormat(endTime)
    if (endError) {
      errors.push({ field: 'endTime', message: endError, type: 'error' })
    }

    if (startError || endError) {
      return errors
    }

    // Parse times
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

    // Validate hours away
    if (hoursAway < 0) {
      errors.push({ 
        field: 'hoursAway', 
        message: 'Hours away cannot be negative', 
        type: 'error' 
      })
    }

    if (hoursAway > 24) {
      errors.push({ 
        field: 'hoursAway', 
        message: 'Hours away cannot exceed 24 hours', 
        type: 'error' 
      })
    }

    if (hoursAway > totalHours) {
      errors.push({ 
        field: 'hoursAway', 
        message: 'Hours away cannot exceed total work time', 
        type: 'error' 
      })
    }

    // Warning if work day is too long
    if (totalHours > 16) {
      errors.push({ 
        field: 'totalHours', 
        message: 'Work day exceeds 16 hours', 
        type: 'warning' 
      })
    }

    // Warning if work day is too short
    if (totalHours < 1 && totalHours > 0) {
      errors.push({ 
        field: 'totalHours', 
        message: 'Work day is less than 1 hour', 
        type: 'warning' 
      })
    }

    return errors
  }

  const validateProjectHours = (projects: any[], totalHours: number): ValidationError[] => {
    const errors: ValidationError[] = []

    if (!projects || projects.length === 0) {
      return errors
    }

    let sumProjectHours = 0
    projects.forEach((project, index) => {
      const hours = project.hoursAllocated || 0
      
      if (hours < 0) {
        errors.push({
          field: `project_${index}_hours`,
          message: `Project "${project.name}" cannot have negative hours`,
          type: 'error'
        })
      }

      if (hours > totalHours) {
        errors.push({
          field: `project_${index}_hours`,
          message: `Project "${project.name}" hours exceed total work hours`,
          type: 'error'
        })
      }

      if (!project.name?.trim()) {
        errors.push({
          field: `project_${index}_name`,
          message: 'Project name is required',
          type: 'error'
        })
      }

      sumProjectHours += hours
    })

    const difference = Math.abs(sumProjectHours - totalHours)
    
    if (sumProjectHours > totalHours) {
      errors.push({
        field: 'projects_total',
        message: `Project hours exceed total by ${difference.toFixed(2)} hours`,
        type: 'error'
      })
    } else if (difference > 0.1) { // Allow small floating point differences
      errors.push({
        field: 'projects_total',
        message: `${difference.toFixed(2)} hours unallocated`,
        type: 'warning'
      })
    }

    return errors
  }

  const validateDate = (date: string): string | null => {
    if (!date) return 'Date is required'
    
    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date format'
    }

    // Warning for future dates
    const today = new Date()
    const inputDate = new Date(date)
    
    if (inputDate > today) {
      return 'Future date selected'
    }

    return null
  }

  const validateTimeEntry = (entry: any): ValidationError[] => {
    const allErrors: ValidationError[] = []

    // Validate date
    const dateError = validateDate(entry.date)
    if (dateError) {
      allErrors.push({ 
        field: 'date', 
        message: dateError, 
        type: dateError.includes('Future') ? 'warning' : 'error' 
      })
    }

    // Validate time sequence
    const timeErrors = validateTimeSequence(
      entry.startTime, 
      entry.endTime, 
      entry.hoursAway || 0
    )
    allErrors.push(...timeErrors)

    // Validate project hours
    if (entry.projects && entry.totalHours) {
      const projectErrors = validateProjectHours(entry.projects, entry.totalHours)
      allErrors.push(...projectErrors)
    }

    return allErrors
  }

  const hasErrors = computed(() => {
    return errors.value?.some(error => error.type === 'error') || false
  })

  const hasWarnings = computed(() => {
    return errors.value?.some(error => error.type === 'warning') || false
  })

  const getFieldErrors = (field: string) => {
    return errors.value?.filter(error => error.field === field) || []
  }

  const setErrors = (newErrors: ValidationError[]) => {
    errors.value = newErrors
  }

  const clearErrors = () => {
    errors.value = []
  }

  const addError = (error: ValidationError) => {
    if (!errors.value) errors.value = []
    errors.value.push(error)
  }

  return {
    errors,
    hasErrors,
    hasWarnings,
    validateTimeEntry,
    validateTimeSequence,
    validateProjectHours,
    validateDate,
    getFieldErrors,
    setErrors,
    clearErrors,
    addError
  }
}