import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt-auth'
import { prisma } from '@/lib/db'

// Local constants to replace Prisma enums
const ROLES = {
  HR: 'HR',
  ADMIN: 'ADMIN'
} as const
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const user = verifyToken(token)

    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    if (user.role !== 'HR' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const months = parseInt(searchParams.get('months') || '12')

    // Get user details
    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        payRate: true,
        createdAt: true,
        manager: {
          select: {
            name: true
          }
        }
      }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Calculate date range
    const endDate = new Date()
    const startDate = subMonths(endDate, months)

    // Get all timesheets for the user in the date range
    const timesheets = await prisma.timesheet.findMany({
      where: {
        userId: params.id,
        periodStart: {
          gte: startDate
        }
      },
      include: {
        entries: true,
        messages: {
          include: {
            sender: {
              select: {
                name: true,
                role: true
              }
            }
          }
        }
      },
      orderBy: {
        periodStart: 'desc'
      }
    })

    // Calculate metrics
    let totalHours = 0
    let totalPlawaHours = 0
    let totalRegularHours = 0
    let totalTimesheets = timesheets.length
    let approvedTimesheets = 0
    let pendingTimesheets = 0
    let deniedTimesheets = 0
    let totalMessages = 0
    
    const monthlyData: any[] = []
    const weeklyData: any[] = []
    const dailyAverages: any = {}
    
    // Process each timesheet
    timesheets.forEach(timesheet => {
      if (timesheet.state === 'APPROVED') approvedTimesheets++
      else if (timesheet.state === 'PENDING_STAFF' || timesheet.state === 'PENDING_MANAGER' || timesheet.state === 'PENDING_HR') pendingTimesheets++
      
      totalMessages += timesheet.messages.length
      
      let timesheetHours = 0
      let timesheetPlawaHours = 0
      let timesheetRegularHours = 0
      
      timesheet.entries.forEach(entry => {
        let dailyHours = entry.plawaHours || 0
        
        // Calculate hours from in/out pairs
        if (entry.in1 && entry.out1) {
          dailyHours += (new Date(entry.out1).getTime() - new Date(entry.in1).getTime()) / (1000 * 60 * 60)
        }
        if (entry.in2 && entry.out2) {
          dailyHours += (new Date(entry.out2).getTime() - new Date(entry.in2).getTime()) / (1000 * 60 * 60)
        }
        if (entry.in3 && entry.out3) {
          dailyHours += (new Date(entry.out3).getTime() - new Date(entry.in3).getTime()) / (1000 * 60 * 60)
        }
        
        const regularHours = dailyHours - (entry.plawaHours || 0)
        
        timesheetHours += dailyHours
        timesheetPlawaHours += (entry.plawaHours || 0)
        timesheetRegularHours += regularHours
        
        // Track daily averages by day of week
        const dayOfWeek = new Date(entry.date).getDay()
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]
        
        if (!dailyAverages[dayName]) {
          dailyAverages[dayName] = { total: 0, count: 0, average: 0 }
        }
        dailyAverages[dayName].total += dailyHours
        dailyAverages[dayName].count += 1
      })
      
      totalHours += timesheetHours
      totalPlawaHours += timesheetPlawaHours
      totalRegularHours += timesheetRegularHours
      
      // Add to monthly data
      const monthKey = format(new Date(timesheet.periodStart), 'yyyy-MM')
      const existingMonth = monthlyData.find(m => m.month === monthKey)
      
      if (existingMonth) {
        existingMonth.hours += timesheetHours
        existingMonth.plawaHours += timesheetPlawaHours
        existingMonth.regularHours += timesheetRegularHours
        existingMonth.timesheets += 1
      } else {
        monthlyData.push({
          month: monthKey,
          monthName: format(new Date(timesheet.periodStart), 'MMM yyyy'),
          hours: timesheetHours,
          plawaHours: timesheetPlawaHours,
          regularHours: timesheetRegularHours,
          timesheets: 1
        })
      }
    })

    // Calculate daily averages
    Object.keys(dailyAverages).forEach(day => {
      dailyAverages[day].average = dailyAverages[day].total / dailyAverages[day].count
    })

    // Calculate additional metrics
    const averageHoursPerTimesheet = totalTimesheets > 0 ? totalHours / totalTimesheets : 0
    const averageHoursPerMonth = monthlyData.length > 0 ? totalHours / monthlyData.length : 0
    const plawaPercentage = totalHours > 0 ? (totalPlawaHours / totalHours) * 100 : 0
    const approvalRate = totalTimesheets > 0 ? (approvedTimesheets / totalTimesheets) * 100 : 0
    
    // Calculate estimated earnings
    const estimatedEarnings = totalRegularHours * (targetUser.payRate || 0)
    const estimatedPlawaEarnings = totalPlawaHours * (targetUser.payRate || 0)
    const totalEstimatedEarnings = estimatedEarnings + estimatedPlawaEarnings

    const metrics = {
      user: targetUser,
      summary: {
        totalHours: Math.round(totalHours * 100) / 100,
        totalPlawaHours: Math.round(totalPlawaHours * 100) / 100,
        totalRegularHours: Math.round(totalRegularHours * 100) / 100,
        totalTimesheets,
        approvedTimesheets,
        pendingTimesheets,
        deniedTimesheets,
        totalMessages,
        averageHoursPerTimesheet: Math.round(averageHoursPerTimesheet * 100) / 100,
        averageHoursPerMonth: Math.round(averageHoursPerMonth * 100) / 100,
        plawaPercentage: Math.round(plawaPercentage * 100) / 100,
        approvalRate: Math.round(approvalRate * 100) / 100,
        estimatedEarnings: Math.round(estimatedEarnings * 100) / 100,
        estimatedPlawaEarnings: Math.round(estimatedPlawaEarnings * 100) / 100,
        totalEstimatedEarnings: Math.round(totalEstimatedEarnings * 100) / 100
      },
      monthlyData: monthlyData.sort((a, b) => a.month.localeCompare(b.month)),
      dailyAverages,
      recentTimesheets: timesheets.slice(0, 10).map(ts => ({
        id: ts.id,
        periodStart: ts.periodStart,
        periodEnd: ts.periodEnd,
        state: ts.state,
        totalHours: ts.entries.reduce((sum, entry) => {
          let dailyHours = entry.plawaHours || 0
          if (entry.in1 && entry.out1) {
            dailyHours += (new Date(entry.out1).getTime() - new Date(entry.in1).getTime()) / (1000 * 60 * 60)
          }
          if (entry.in2 && entry.out2) {
            dailyHours += (new Date(entry.out2).getTime() - new Date(entry.in2).getTime()) / (1000 * 60 * 60)
          }
          if (entry.in3 && entry.out3) {
            dailyHours += (new Date(entry.out3).getTime() - new Date(entry.in3).getTime()) / (1000 * 60 * 60)
          }
          return sum + dailyHours
        }, 0),
        messagesCount: ts.messages.length
      }))
    }

    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Error fetching user metrics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 