import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt-auth'
import { prisma } from '@/lib/db'

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

    // Get settings from database or return defaults
    const settings = await prisma.systemSettings.findFirst()
    
    if (!settings) {
      // Return default settings if none exist
      return NextResponse.json({
        companyName: 'TimeManagement Inc.',
        companyEmail: 'hr@timemanagement.com',
        payPeriodStart: 'Monday',
        payPeriodLength: '14',
        workingHoursPerDay: '8',
        workingDaysPerWeek: '5',
        overtimeThreshold: '40',
        plawaThreshold: '40',
        emailNotifications: {
          timesheetSubmitted: true,
          timesheetApproved: true,
          timesheetRejected: true,
          payPeriodReminder: true,
          overdueApprovals: true
        },
        defaultPayRate: '25.00',
        requireManagerApproval: true,
        requireHRApproval: true,
        allowWeekendWork: true,
        allowOvertime: true,
        timezone: 'America/Chicago'
      })
    }

    return NextResponse.json(JSON.parse(settings.config))
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json()

    // Validate required fields
    const requiredFields = [
      'companyName', 'companyEmail', 'payPeriodStart', 'payPeriodLength',
      'workingHoursPerDay', 'workingDaysPerWeek', 'overtimeThreshold',
      'plawaThreshold', 'defaultPayRate', 'timezone'
    ]

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.companyEmail)) {
      return NextResponse.json(
        { error: 'Invalid company email format' },
        { status: 400 }
      )
    }

    // Validate numeric fields
    const numericFields = [
      'payPeriodLength', 'workingHoursPerDay', 'workingDaysPerWeek',
      'overtimeThreshold', 'plawaThreshold', 'defaultPayRate'
    ]

    for (const field of numericFields) {
      if (isNaN(parseFloat(body[field])) || parseFloat(body[field]) < 0) {
        return NextResponse.json(
          { error: `${field} must be a positive number` },
          { status: 400 }
        )
      }
    }

    // Update or create settings
    const settings = await prisma.systemSettings.upsert({
      where: { id: 1 },
      update: {
        config: JSON.stringify(body),
        updatedAt: new Date()
      },
      create: {
        id: 1,
        config: JSON.stringify(body),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ message: 'Settings updated successfully' })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 