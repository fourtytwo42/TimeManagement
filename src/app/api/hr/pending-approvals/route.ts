import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt-auth'
import { prisma } from '@/lib/db'

// Local constants to replace Prisma enums
const ROLES = {
  HR: 'HR',
  ADMIN: 'ADMIN'
} as const

const TS_STATE = {
  PENDING_HR: 'PENDING_HR'
} as const

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

    if (user.role !== 'HR' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const pendingTimesheets = await prisma.timesheet.findMany({
      where: {
        state: TS_STATE.PENDING_HR
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        entries: true
      },
      orderBy: {
        updatedAt: 'asc'
      }
    })

    // Calculate total hours for each timesheet
    const timesheetsWithTotals = pendingTimesheets.map((timesheet: any) => {
      const totalHours = timesheet.entries.reduce((total: number, entry: any) => {
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

        return total + dailyHours
      }, 0)

      return {
        id: timesheet.id,
        user: timesheet.user,
        periodStart: timesheet.periodStart,
        periodEnd: timesheet.periodEnd,
        state: timesheet.state,
        totalHours: Math.round(totalHours * 100) / 100,
        updatedAt: timesheet.updatedAt
      }
    })

    return NextResponse.json(timesheetsWithTotals)
  } catch (error) {
    console.error('Error fetching pending HR approvals:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 