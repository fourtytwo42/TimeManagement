import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt-auth'
import { prisma } from '@/lib/db'
import { createTimesheetNotification, fulfillNotifications } from '@/lib/notifications'
import { sendFinalApprovedTimesheetNotification, isEmailEnabled } from '@/lib/mailer'
import { format } from 'date-fns'

// Local constants to replace Prisma enums
const TS_STATE = {
  PENDING_HR: 'PENDING_HR',
  APPROVED: 'APPROVED'
} as const

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
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
    const { signature } = body

    if (!signature) {
      return NextResponse.json(
        { error: 'Digital signature is required' },
        { status: 400 }
      )
    }

    // Get the timesheet with user details
    const timesheet = await prisma.timesheet.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            payRate: true
          }
        },
        entries: true
      }
    })

    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 })
    }

    if (timesheet.state !== 'PENDING_HR') {
      return NextResponse.json(
        { error: 'Timesheet is not pending HR approval' },
        { status: 400 }
      )
    }

    // Calculate total hours
    const totalHours = timesheet.entries.reduce((sum, entry) => {
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
    }, 0)

    const plawaHours = timesheet.entries.reduce((sum, entry) => sum + (entry.plawaHours || 0), 0)
    const regularHours = totalHours - plawaHours

    // Update timesheet to approved state
    const updatedTimesheet = await prisma.timesheet.update({
      where: { id },
      data: {
        state: 'APPROVED',
        hrSig: signature,
        hrSigAt: new Date()
      }
    })

    // Send final approval notification email
    try {
      await sendFinalApprovedTimesheetNotification(
        timesheet.user.email,
        timesheet.user.name,
        `${new Date(timesheet.periodStart).toLocaleDateString()} - ${new Date(timesheet.periodEnd).toLocaleDateString()}`,
        totalHours,
        plawaHours,
        regularHours,
        user.name
      )
      console.log(`Final approval email sent to ${timesheet.user.email} for timesheet ${id}`)
    } catch (emailError) {
      console.error('Failed to send final approval email:', emailError)
      // Don't fail the approval if email fails
    }

    // Create notification for the timesheet owner
    try {
      await createTimesheetNotification(
        timesheet.user.id,
        'final_approval',
        id
      )
    } catch (notificationError) {
      console.error('Failed to create final approval notification:', notificationError)
    }

    // Fulfill HR approval notifications
    await fulfillNotifications(user.id, id, 'timesheet_approved')

    return NextResponse.json({
      message: 'Timesheet approved by HR successfully',
      timesheet: updatedTimesheet
    })
  } catch (error) {
    console.error('Error approving timesheet by HR:', error)
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    
    return NextResponse.json(
      { error: 'Failed to approve timesheet' },
      { status: 500 }
    )
  }
} 