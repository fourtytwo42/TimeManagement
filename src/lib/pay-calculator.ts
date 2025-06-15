import { prisma } from './db'

export interface PayRateInfo {
  payRate: number
  effectiveDate: Date
  endDate?: Date
}

export interface PayCalculation {
  totalHours: number
  totalPay: number
  payBreakdown: Array<{
    payRate: number
    hours: number
    pay: number
    effectiveDate: Date
    endDate?: Date
  }>
}

/**
 * Get pay rate history for a user
 */
export async function getUserPayRateHistory(userId: string): Promise<PayRateInfo[]> {
  try {
    const payRateHistory = await (prisma as any).payRateHistory.findMany({
      where: { userId },
      orderBy: { effectiveDate: 'asc' }
    })

    return payRateHistory.map((rate: any) => ({
      payRate: rate.payRate,
      effectiveDate: rate.effectiveDate,
      endDate: rate.endDate || undefined
    }))
  } catch (error) {
    console.error('Error fetching pay rate history:', error)
    return []
  }
}

/**
 * Get the effective pay rate for a specific date
 */
export function getPayRateForDate(payRateHistory: PayRateInfo[], date: Date): number {
  // Find the rate that was effective on the given date
  const effectiveRate = payRateHistory
    .filter(rate => {
      const effectiveDate = new Date(rate.effectiveDate)
      const endDate = rate.endDate ? new Date(rate.endDate) : null
      
      return effectiveDate <= date && (!endDate || endDate > date)
    })
    .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime())[0]

  return effectiveRate?.payRate || 0
}

/**
 * Calculate pay for timesheets considering effective dates
 */
export async function calculatePayForTimesheets(
  userId: string, 
  timesheets: Array<{
    periodStart: Date | string
    periodEnd: Date | string
    totalHours: number
  }>
): Promise<PayCalculation> {
  const payRateHistory = await getUserPayRateHistory(userId)
  
  if (payRateHistory.length === 0) {
    // No pay rate history, use current user pay rate
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { payRate: true }
    })
    
    const totalHours = timesheets.reduce((sum, ts) => sum + ts.totalHours, 0)
    const payRate = user?.payRate || 0
    
    return {
      totalHours,
      totalPay: totalHours * payRate,
      payBreakdown: [{
        payRate,
        hours: totalHours,
        pay: totalHours * payRate,
        effectiveDate: new Date()
      }]
    }
  }

  let totalHours = 0
  let totalPay = 0
  const payBreakdown: PayCalculation['payBreakdown'] = []

  // Group timesheets by pay rate periods
  const payRateGroups = new Map<string, { payRate: number, hours: number, effectiveDate: Date, endDate?: Date }>()

  for (const timesheet of timesheets) {
    const periodStart = new Date(timesheet.periodStart)
    const payRate = getPayRateForDate(payRateHistory, periodStart)
    
    // Find the effective rate info for grouping
    const rateInfo = payRateHistory.find(rate => {
      const effectiveDate = new Date(rate.effectiveDate)
      const endDate = rate.endDate ? new Date(rate.endDate) : null
      return effectiveDate <= periodStart && (!endDate || endDate > periodStart)
    })

    const key = `${payRate}-${rateInfo?.effectiveDate.toISOString()}`
    
    if (payRateGroups.has(key)) {
      payRateGroups.get(key)!.hours += timesheet.totalHours
    } else {
      payRateGroups.set(key, {
        payRate,
        hours: timesheet.totalHours,
        effectiveDate: rateInfo?.effectiveDate || new Date(),
        endDate: rateInfo?.endDate
      })
    }
    
    totalHours += timesheet.totalHours
    totalPay += timesheet.totalHours * payRate
  }

  // Convert groups to breakdown
  Array.from(payRateGroups.values()).forEach(group => {
    payBreakdown.push({
      payRate: group.payRate,
      hours: group.hours,
      pay: group.hours * group.payRate,
      effectiveDate: group.effectiveDate,
      endDate: group.endDate
    })
  })

  return {
    totalHours,
    totalPay,
    payBreakdown: payBreakdown.sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime())
  }
}

/**
 * Calculate estimated annual earnings for a user
 */
export async function calculateEstimatedAnnualEarnings(userId: string, year?: number): Promise<{
  totalHours: number
  totalPay: number
  payBreakdown: PayCalculation['payBreakdown']
}> {
  const currentYear = year || new Date().getFullYear()
  const yearStart = new Date(currentYear, 0, 1)
  const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59)

  // Get all approved timesheets for the year
  const timesheets = await prisma.timesheet.findMany({
    where: {
      userId,
      state: 'APPROVED',
      periodStart: {
        gte: yearStart,
        lte: yearEnd
      }
    },
    include: {
      entries: true
    }
  })

  // Calculate total hours for each timesheet
  const timesheetData = timesheets.map(timesheet => {
    const totalHours = timesheet.entries.reduce((sum, entry) => {
      let hours = 0
      
      // Calculate regular hours from in/out times
      if (entry.in1 && entry.out1) {
        hours += (new Date(entry.out1).getTime() - new Date(entry.in1).getTime()) / (1000 * 60 * 60)
      }
      if (entry.in2 && entry.out2) {
        hours += (new Date(entry.out2).getTime() - new Date(entry.in2).getTime()) / (1000 * 60 * 60)
      }
      if (entry.in3 && entry.out3) {
        hours += (new Date(entry.out3).getTime() - new Date(entry.in3).getTime()) / (1000 * 60 * 60)
      }
      
      // Add PLAWA hours
      hours += entry.plawaHours
      
      return sum + hours
    }, 0)

    return {
      periodStart: timesheet.periodStart,
      periodEnd: timesheet.periodEnd,
      totalHours
    }
  })

  return await calculatePayForTimesheets(userId, timesheetData)
} 