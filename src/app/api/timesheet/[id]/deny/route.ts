import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt-auth'
import { denyTimesheet } from '@/lib/timesheet'
import { createTimesheetNotification, fulfillNotifications } from '@/lib/notifications'
import { prisma } from '@/lib/db'

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

    if (user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { note } = body

    if (!note || note.trim() === '') {
      return NextResponse.json({ error: 'Denial note is required' }, { status: 400 })
    }

    const updatedTimesheet = await denyTimesheet(params.id, user.id, note)
    
    if (!updatedTimesheet) {
      return NextResponse.json({ error: 'Failed to deny timesheet' }, { status: 400 })
    }

    // Get timesheet details for notifications
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (timesheet) {
      // Notify staff member of denial
      await createTimesheetNotification(
        timesheet.userId,
        'denial',
        params.id,
        `Your timesheet was returned with the following note: ${note}`
      )

      // Fulfill manager approval notifications
      await fulfillNotifications(user.id, params.id, 'timesheet_denied')
    }

    return NextResponse.json({ message: 'Timesheet denied successfully' })
  } catch (error) {
    console.error('Error denying timesheet:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 