import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt-auth'
import { prisma } from '@/lib/db'
import { calculateDailyHours } from '@/lib/utils'

export async function GET(request: NextRequest) {
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

    // Fetch all timesheets for the user - only select columns that exist
    const timesheets = await prisma.timesheet.findMany({
      where: {
        userId: user.id
      },
      select: {
        id: true,
        periodStart: true,
        periodEnd: true,
        state: true,
        staffSig: true,
        managerSig: true,
        hrSig: true,
        managerNote: true,
        createdAt: true,
        updatedAt: true,
        entries: true
      },
      orderBy: {
        periodStart: 'desc'
      }
    })

    // If no timesheets exist, return empty array
    if (!timesheets || timesheets.length === 0) {
      return NextResponse.json([])
    }

    // Calculate total hours for each timesheet
    const timesheetsWithTotals = timesheets.map(timesheet => {
      const totalHours = timesheet.entries.reduce((total, entry) => {
        return total + calculateDailyHours(
          entry.in1,
          entry.out1,
          entry.in2,
          entry.out2,
          entry.in3,
          entry.out3,
          entry.plawaHours
        )
      }, 0)

      return {
        id: timesheet.id,
        periodStart: timesheet.periodStart,
        periodEnd: timesheet.periodEnd,
        state: timesheet.state,
        totalHours: Math.round(totalHours * 100) / 100,
        updatedAt: timesheet.updatedAt,
        staffSig: timesheet.staffSig,
        managerSig: timesheet.managerSig,
        hrSig: timesheet.hrSig,
        managerNote: timesheet.managerNote
      }
    })

    return NextResponse.json(timesheetsWithTotals)
  } catch (error) {
    console.error('Error fetching user timesheets:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 