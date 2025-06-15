import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt-auth'
import { prisma } from '@/lib/db'
import { createTimesheetNotification } from '@/lib/notifications'

// Local constants to replace Prisma enums
const TS_STATE = {
  PENDING_HR: 'PENDING_HR',
  PENDING_STAFF: 'PENDING_STAFF'
} as const

export async function POST(
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

    const { note } = await request.json()

    if (!note || note.trim().length === 0) {
      return NextResponse.json({ error: 'Denial reason is required' }, { status: 400 })
    }

    const timesheet = await prisma.timesheet.findUnique({
      where: { id: params.id },
      include: { user: true }
    })

    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 })
    }

    if (timesheet.state !== TS_STATE.PENDING_HR) {
      return NextResponse.json(
        { error: 'Timesheet is not pending HR approval' },
        { status: 400 }
      )
    }

    const updatedTimesheet = await prisma.timesheet.update({
      where: { id: params.id },
      data: {
        state: TS_STATE.PENDING_STAFF,
        managerNote: note, // Store HR denial note in managerNote field
        updatedAt: new Date()
      }
    })

    // Create notification for the timesheet owner
    try {
      await createTimesheetNotification(
        timesheet.user.id,
        'denial',
        params.id,
        note.trim()
      )
    } catch (notificationError) {
      console.error('Failed to create HR denial notification:', notificationError)
      // Don't fail the denial if notification fails
    }

    return NextResponse.json({
      message: 'Timesheet denied and returned to staff',
      timesheet: updatedTimesheet
    })
  } catch (error) {
    console.error('Error denying timesheet:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 