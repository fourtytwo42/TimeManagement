import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { startOfMonth, endOfMonth, addDays, format, parseISO, differenceInMinutes } from "date-fns"

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
  in1?: Date | null,
  out1?: Date | null,
  in2?: Date | null,
  out2?: Date | null,
  in3?: Date | null,
  out3?: Date | null,
  plawaHours: number = 0
): number {
  let totalMinutes = 0
  
  // Debug logging
  console.log('calculateDailyHours called with:', {
    in1: in1?.toISOString(),
    out1: out1?.toISOString(),
    in2: in2?.toISOString(),
    out2: out2?.toISOString(),
    in3: in3?.toISOString(),
    out3: out3?.toISOString(),
    plawaHours
  })
  
  // Calculate minutes for each time pair
  if (in1 && out1) {
    const minutes1 = differenceInMinutes(out1, in1)
    console.log(`Period 1: ${minutes1} minutes (${in1.toISOString()} to ${out1.toISOString()})`)
    totalMinutes += minutes1
  }
  if (in2 && out2) {
    const minutes2 = differenceInMinutes(out2, in2)
    console.log(`Period 2: ${minutes2} minutes (${in2.toISOString()} to ${out2.toISOString()})`)
    totalMinutes += minutes2
  }
  if (in3 && out3) {
    const minutes3 = differenceInMinutes(out3, in3)
    console.log(`Period 3: ${minutes3} minutes (${in3.toISOString()} to ${out3.toISOString()})`)
    totalMinutes += minutes3
  }
  
  // Convert to hours and add PLAWA hours
  const workHours = totalMinutes / 60
  const result = Math.round((workHours + plawaHours) * 100) / 100
  
  console.log(`Total minutes: ${totalMinutes}, Work hours: ${workHours}, PLAWA: ${plawaHours}, Result: ${result}`)
  
  return result // Round to 2 decimal places
}

export function calculatePeriodTotal(entries: Array<{
  in1?: Date | null
  out1?: Date | null
  in2?: Date | null
  out2?: Date | null
  in3?: Date | null
  out3?: Date | null
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
  in1?: Date | null,
  out1?: Date | null,
  in2?: Date | null,
  out2?: Date | null,
  in3?: Date | null,
  out3?: Date | null
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check that each in time is before its corresponding out time
  if (in1 && out1 && in1 >= out1) {
    errors.push("First in time must be before first out time")
  }
  if (in2 && out2 && in2 >= out2) {
    errors.push("Second in time must be before second out time")
  }
  if (in3 && out3 && in3 >= out3) {
    errors.push("Third in time must be before third out time")
  }
  
  // Check for overlapping time periods
  const periods: Array<{ start: Date; end: Date }> = []
  if (in1 && out1) periods.push({ start: in1, end: out1 })
  if (in2 && out2) periods.push({ start: in2, end: out2 })
  if (in3 && out3) periods.push({ start: in3, end: out3 })
  
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
  return format(date, 'HH:mm')
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