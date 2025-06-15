import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt-auth'
import { prisma } from '@/lib/db'
import { createTimesheetNotification } from '@/lib/notifications'
import { sendFinalApprovedTimesheetNotification, isEmailEnabled } from '@/lib/mailer'
import { format } from 'date-fns'

// Local constants to replace Prisma enums
const TS_STATE = {
  PENDING_HR: 'PENDING_HR',
  APPROVED: 'APPROVED'
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

    const { signature } = await request.json()

    if (!signature) {
      return NextResponse.json({ error: 'Signature is required' }, { status: 400 })
    }

    const timesheet = await prisma.timesheet.findUnique({
      where: { id: params.id },
      include: { 
        user: true,
        entries: true
      }
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

    // Calculate timesheet totals for email
    const totalHours = timesheet.entries.reduce((total, entry) => {
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
      return total + dailyHours
    }, 0)

    const plawaHours = timesheet.entries.reduce((total, entry) => total + (entry.plawaHours || 0), 0)
    const regularHours = totalHours - plawaHours

    // Update timesheet with HR signature and timestamp
    await prisma.$executeRaw`
      UPDATE Timesheet 
      SET state = ${TS_STATE.APPROVED}, 
          hrSig = ${signature}, 
          hrSigAt = ${new Date().toISOString()},
          updatedAt = ${new Date().toISOString()}
      WHERE id = ${params.id}
    `

    // Create notification for the timesheet owner
    try {
      await createTimesheetNotification(
        timesheet.user.id,
        'final_approval',
        params.id
      )
    } catch (notificationError) {
      console.error('Failed to create final approval notification:', notificationError)
      // Don't fail the approval if notification fails
    }

    // Send email notification if enabled
    try {
      if (isEmailEnabled()) {
        const timesheetPeriod = `${format(new Date(timesheet.periodStart), 'MMM dd, yyyy')} - ${format(new Date(timesheet.periodEnd), 'MMM dd, yyyy')}`
        
        await sendFinalApprovedTimesheetNotification(
          timesheet.user.email,
          timesheet.user.name,
          timesheetPeriod,
          Math.round(totalHours * 100) / 100,
          Math.round(plawaHours * 100) / 100,
          Math.round(regularHours * 100) / 100,
          user.name
        )
        
        console.log(`Final approval email sent to ${timesheet.user.email} for timesheet ${params.id}`)
      }
    } catch (emailError) {
      console.error('Failed to send final approval email:', emailError)
      // Don't fail the approval if email fails
    }

    // Fetch the updated timesheet
    const updatedTimesheet = await prisma.timesheet.findUnique({
      where: { id: params.id }
    })

    return NextResponse.json({
      message: 'Timesheet approved successfully',
      timesheet: updatedTimesheet
    })
  } catch (error) {
    console.error('Error approving timesheet:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 