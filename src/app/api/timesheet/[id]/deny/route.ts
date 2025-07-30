import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt-auth'
import { denyTimesheet } from '@/lib/timesheet'
import { createTimesheetNotification, fulfillNotifications } from '@/lib/notifications'
import { prisma } from '@/lib/db'

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

    if (user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { note } = body

    const updatedTimesheet = await denyTimesheet(id, user.id, note)

    // Create notifications
    try {
      const timesheet = await prisma.timesheet.findUnique({
        where: { id },
        include: {
          user: {
            select: { id: true }
          }
        }
      })
      
      if (timesheet) {
        // Notify the timesheet owner of denial
        await createTimesheetNotification(
          timesheet.user.id,
          'denial',
          id
        )

        // Fulfill manager denial notifications
        await fulfillNotifications(user.id, id, 'timesheetdenied')
      }
    } catch (notificationError) {
      console.error('Failed to create denial notifications:', notificationError)
      // Don't fail the denial if notification fails
    }

    return NextResponse.json({
      message: 'Timesheet denied successfully',
      timesheet: updatedTimesheet
    })
  } catch (error) {
    console.error('Error denying timesheet:', error)
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    
    return NextResponse.json(
      { error: 'Failed to deny timesheet' },
      { status: 500 }
    )
  }
} 