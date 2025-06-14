import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt-auth'
import { createTimesheetForPeriod } from '@/lib/timesheet'

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { periodStart, periodEnd } = body

    if (!periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'Period start and end dates are required' },
        { status: 400 }
      )
    }

    // Convert string dates to Date objects
    const startDate = new Date(periodStart)
    const endDate = new Date(periodEnd)

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'Period start must be before period end' },
        { status: 400 }
      )
    }

    const timesheet = await createTimesheetForPeriod(user.id, startDate, endDate)
    
    return NextResponse.json(timesheet, { status: 201 })
  } catch (error) {
    console.error('Error creating timesheet:', error)
    
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    
    return NextResponse.json(
      { error: 'Failed to create timesheet' },
      { status: 500 }
    )
  }
} 