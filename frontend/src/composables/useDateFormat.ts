import { ref, computed } from 'vue'

export function useDateFormat() {
  // Convert ISO date (yyyy-mm-dd or full ISO string) to dd/mm/yyyy format
  const formatDateForDisplay = (isoDate: string): string => {
    if (!isoDate) return ''
    
    try {
      // Parse using Date constructor to handle full ISO strings
      const date = new Date(isoDate)
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date')
      }
      
      // Get date parts in local time
      const day = date.getUTCDate().toString().padStart(2, '0')
      const month = (date.getUTCMonth() + 1).toString().padStart(2, '0')
      const year = date.getUTCFullYear().toString()
      
      return `${day}/${month}/${year}`
    } catch (error) {
      console.error('Error formatting date for display:', error, 'Input:', isoDate)
      return ''
    }
  }

  // Convert dd/mm/yyyy format to ISO date string (to match backend format)
  const formatDateForStorage = (displayDate: string): string => {
    if (!displayDate) return ''
    
    try {
      // Handle both dd/mm/yyyy and dd-mm-yyyy formats
      const cleanDate = displayDate.replace(/[-]/g, '/')
      const parts = cleanDate.split('/')
      
      if (parts.length !== 3) {
        throw new Error('Invalid date format')
      }
      
      const day = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10)
      const year = parseInt(parts[2], 10)
      
      // Validate date parts
      if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) {
        throw new Error('Invalid date values')
      }
      
      // Create ISO date string with time component to match backend format
      const isoDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T00:00:00.000Z`
      
      // Validate the date is actually valid
      const testDate = new Date(isoDate)
      if (testDate.getUTCDate() !== day || testDate.getUTCMonth() + 1 !== month || testDate.getUTCFullYear() !== year) {
        throw new Error('Invalid date')
      }
      
      return isoDate
    } catch (error) {
      console.error('Error parsing date:', error)
      return ''
    }
  }

  // Validate dd/mm/yyyy format
  const isValidDateFormat = (dateString: string): boolean => {
    const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
    const match = dateString.match(dateRegex)
    
    if (!match) return false
    
    const day = parseInt(match[1], 10)
    const month = parseInt(match[2], 10)
    const year = parseInt(match[3], 10)
    
    // Basic validation
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) {
      return false
    }
    
    // Check if the date is actually valid
    try {
      const isoDate = formatDateForStorage(dateString)
      return isoDate !== ''
    } catch {
      return false
    }
  }

  // Get today's date in dd/mm/yyyy format
  const getTodayFormatted = (): string => {
    const today = new Date()
    const day = today.getDate().toString().padStart(2, '0')
    const month = (today.getMonth() + 1).toString().padStart(2, '0')
    const year = today.getFullYear().toString()
    
    return `${day}/${month}/${year}`
  }

  // Get today's date in ISO format (to match backend format)
  const getTodayISO = (): string => {
    const today = new Date()
    const year = today.getFullYear()
    const month = (today.getMonth() + 1).toString().padStart(2, '0')
    const day = today.getDate().toString().padStart(2, '0')
    
    return `${year}-${month}-${day}T00:00:00.000Z`
  }

  return {
    formatDateForDisplay,
    formatDateForStorage,
    isValidDateFormat,
    getTodayFormatted,
    getTodayISO
  }
}