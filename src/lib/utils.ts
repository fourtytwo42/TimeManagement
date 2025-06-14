import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { startOfMonth, endOfMonth, addDays, format, parseISO, differenceInMinutes, subMonths, addMonths } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Date utility functions for bi-monthly pay periods
export function getCurrentPayPeriod(date: Date = new Date()) {
  const day = date.getDate()
  const month = date.getMonth()
  const year = date.getFullYear()
  
  if (day <= 15) {
    // First half of month (1-15)
    return {
      start: new Date(year, month, 1),
      end: new Date(year, month, 15, 23, 59, 59, 999)
    }
  } else {
    // Second half of month (16-EOM)
    const lastDay = endOfMonth(date)
    return {
      start: new Date(year, month, 16),
      end: new Date(year, month, lastDay.getDate(), 23, 59, 59, 999)
    }
  }
}

export function getPayPeriodDates(periodStart: Date, periodEnd: Date): Date[] {
  const dates: Date[] = []
  let currentDate = new Date(periodStart)
  
  while (currentDate <= periodEnd) {
    dates.push(new Date(currentDate))
    currentDate = addDays(currentDate, 1)
  }
  
  return dates
}

// Time calculation utilities
export function calculateDailyHours(
  in1?: Date | string | null,
  out1?: Date | string | null,
  in2?: Date | string | null,
  out2?: Date | string | null,
  in3?: Date | string | null,
  out3?: Date | string | null,
  plawaHours: number = 0
): number {
  let totalMinutes = 0
  
  // Helper function to convert string dates to Date objects
  const toDate = (dateValue?: Date | string | null): Date | null => {
    if (!dateValue) return null
    if (dateValue instanceof Date) return dateValue
    return new Date(dateValue)
  }
  
  // Convert all inputs to Date objects
  const date1In = toDate(in1)
  const date1Out = toDate(out1)
  const date2In = toDate(in2)
  const date2Out = toDate(out2)
  const date3In = toDate(in3)
  const date3Out = toDate(out3)
  
  // Calculate minutes for each time pair
  if (date1In && date1Out) {
    const minutes1 = differenceInMinutes(date1Out, date1In)
    totalMinutes += minutes1
  }
  if (date2In && date2Out) {
    const minutes2 = differenceInMinutes(date2Out, date2In)
    totalMinutes += minutes2
  }
  if (date3In && date3Out) {
    const minutes3 = differenceInMinutes(date3Out, date3In)
    totalMinutes += minutes3
  }
  
  // Convert to hours and add PLAWA hours
  const workHours = totalMinutes / 60
  const result = Math.round((workHours + plawaHours) * 100) / 100
  
  return result // Round to 2 decimal places
}

export function calculatePeriodTotal(entries: Array<{
  in1?: Date | string | null
  out1?: Date | string | null
  in2?: Date | string | null
  out2?: Date | string | null
  in3?: Date | string | null
  out3?: Date | string | null
  plawaHours: number
}>): number {
  const total = entries.reduce((sum, entry) => {
    return sum + calculateDailyHours(
      entry.in1,
      entry.out1,
      entry.in2,
      entry.out2,
      entry.in3,
      entry.out3,
      entry.plawaHours
    )
  }, 0)
  
  return Math.round(total * 100) / 100
}

// Validation utilities
export function validateTimeEntry(
  in1?: Date | string | null,
  out1?: Date | string | null,
  in2?: Date | string | null,
  out2?: Date | string | null,
  in3?: Date | string | null,
  out3?: Date | string | null
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Helper function to convert string dates to Date objects
  const toDate = (dateValue?: Date | string | null): Date | null => {
    if (!dateValue) return null
    if (dateValue instanceof Date) return dateValue
    return new Date(dateValue)
  }
  
  // Convert all inputs to Date objects
  const date1In = toDate(in1)
  const date1Out = toDate(out1)
  const date2In = toDate(in2)
  const date2Out = toDate(out2)
  const date3In = toDate(in3)
  const date3Out = toDate(out3)
  
  // Check that each in time is before its corresponding out time
  if (date1In && date1Out && date1In >= date1Out) {
    errors.push("First in time must be before first out time")
  }
  if (date2In && date2Out && date2In >= date2Out) {
    errors.push("Second in time must be before second out time")
  }
  if (date3In && date3Out && date3In >= date3Out) {
    errors.push("Third in time must be before third out time")
  }
  
  // Check for overlapping time periods
  const periods: Array<{ start: Date; end: Date }> = []
  if (date1In && date1Out) periods.push({ start: date1In, end: date1Out })
  if (date2In && date2Out) periods.push({ start: date2In, end: date2Out })
  if (date3In && date3Out) periods.push({ start: date3In, end: date3Out })
  
  for (let i = 0; i < periods.length; i++) {
    for (let j = i + 1; j < periods.length; j++) {
      const period1 = periods[i]
      const period2 = periods[j]
      
      if (
        (period1.start <= period2.start && period2.start < period1.end) ||
        (period2.start <= period1.start && period1.start < period2.end)
      ) {
        errors.push("Time periods cannot overlap")
        break
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

export function validatePlawaHours(plawaHours: number): { isValid: boolean; error?: string } {
  if (plawaHours < 0) {
    return { isValid: false, error: "PLAWA hours cannot be negative" }
  }
  if (plawaHours > 24) {
    return { isValid: false, error: "PLAWA hours cannot exceed 24 hours per day" }
  }
  return { isValid: true }
}

// Format utilities
export function formatTime(date: Date): string {
  return format(date, 'h:mm a')
}

export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function formatDateTime(date: Date): string {
  return format(date, 'yyyy-MM-dd HH:mm')
}

export function parseTimeString(timeString: string, baseDate: Date): Date {
  const [hours, minutes] = timeString.split(':').map(Number)
  const result = new Date(baseDate)
  result.setHours(hours, minutes, 0, 0)
  return result
}

// Pay period utilities
export function getPayPeriodFromDate(date: Date) {
  return getCurrentPayPeriod(date)
}

export function generateAvailablePayPeriods(monthsBack: number = 6, monthsForward: number = 3): Array<{
  start: Date
  end: Date
  label: string
  isCurrent: boolean
  isPast: boolean
  isFuture: boolean
}> {
  const periods: Array<{
    start: Date
    end: Date
    label: string
    isCurrent: boolean
    isPast: boolean
    isFuture: boolean
  }> = []
  
  const today = new Date()
  const currentPeriod = getCurrentPayPeriod(today)
  
  // Generate periods going back
  for (let i = monthsBack; i >= 0; i--) {
    const targetDate = subMonths(today, i)
    const year = targetDate.getFullYear()
    const month = targetDate.getMonth()
    
    // First half of month (1-15)
    const firstHalf = {
      start: new Date(year, month, 1),
      end: new Date(year, month, 15, 23, 59, 59, 999)
    }
    
    // Second half of month (16-EOM)
    const lastDay = endOfMonth(targetDate)
    const secondHalf = {
      start: new Date(year, month, 16),
      end: new Date(year, month, lastDay.getDate(), 23, 59, 59, 999)
    }
    
    // Add first half
    const isCurrentFirst = firstHalf.start.getTime() === currentPeriod.start.getTime()
    periods.push({
      ...firstHalf,
      label: `${format(firstHalf.start, 'MMM dd')} - ${format(firstHalf.end, 'MMM dd, yyyy')}`,
      isCurrent: isCurrentFirst,
      isPast: firstHalf.end < today && !isCurrentFirst,
      isFuture: firstHalf.start > today && !isCurrentFirst
    })
    
    // Add second half
    const isCurrentSecond = secondHalf.start.getTime() === currentPeriod.start.getTime()
    periods.push({
      ...secondHalf,
      label: `${format(secondHalf.start, 'MMM dd')} - ${format(secondHalf.end, 'MMM dd, yyyy')}`,
      isCurrent: isCurrentSecond,
      isPast: secondHalf.end < today && !isCurrentSecond,
      isFuture: secondHalf.start > today && !isCurrentSecond
    })
  }
  
  // Generate future periods
  for (let i = 1; i <= monthsForward; i++) {
    const targetDate = addMonths(today, i)
    const year = targetDate.getFullYear()
    const month = targetDate.getMonth()
    
    // First half of month (1-15)
    const firstHalf = {
      start: new Date(year, month, 1),
      end: new Date(year, month, 15, 23, 59, 59, 999)
    }
    
    // Second half of month (16-EOM)
    const lastDay = endOfMonth(targetDate)
    const secondHalf = {
      start: new Date(year, month, 16),
      end: new Date(year, month, lastDay.getDate(), 23, 59, 59, 999)
    }
    
    // Add first half
    periods.push({
      ...firstHalf,
      label: `${format(firstHalf.start, 'MMM dd')} - ${format(firstHalf.end, 'MMM dd, yyyy')}`,
      isCurrent: false,
      isPast: false,
      isFuture: true
    })
    
    // Add second half
    periods.push({
      ...secondHalf,
      label: `${format(secondHalf.start, 'MMM dd')} - ${format(secondHalf.end, 'MMM dd, yyyy')}`,
      isCurrent: false,
      isPast: false,
      isFuture: true
    })
  }
  
  // Sort by start date and remove duplicates
  return periods
    .filter((period, index, self) => 
      index === self.findIndex(p => p.start.getTime() === period.start.getTime())
    )
    .sort((a, b) => a.start.getTime() - b.start.getTime())
}

export function formatPayPeriodLabel(start: Date, end: Date): string {
  return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`
}

// Settings utilities
export function parseUserSettings(settingsString: string): Record<string, any> {
  try {
    return JSON.parse(settingsString)
  } catch {
    return {}
  }
}

export function stringifyUserSettings(settings: Record<string, any>): string {
  return JSON.stringify(settings)
} 