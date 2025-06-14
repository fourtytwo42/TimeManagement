import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt-auth'
import { prisma } from '@/lib/db'
import { Role } from '@prisma/client'
import { sendTimesheetNotification, isEmailEnabled } from '@/lib/mailer'

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

    // Check if user has access to this timesheet
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            managerId: true
          }
        }
      }
    })

    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 })
    }

    // Check permissions
    const canAccess = 
      timesheet.userId === user.id || // Owner
      timesheet.user.managerId === user.id || // Manager
      user.role === Role.HR || 
      user.role === Role.ADMIN

    if (!canAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get messages for this timesheet
    const messages = await prisma.timesheetMessage.findMany({
      where: { timesheetId: params.id },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error('Error fetching timesheet messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    const { content } = await request.json()

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    // Check if user has access to this timesheet
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            managerId: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 })
    }

    // Check permissions
    const canAccess = 
      timesheet.userId === user.id || // Owner
      timesheet.user.managerId === user.id || // Manager
      user.role === Role.HR || 
      user.role === Role.ADMIN

    if (!canAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Create the message
    const message = await prisma.timesheetMessage.create({
      data: {
        timesheetId: params.id,
        senderId: user.id,
        content: content.trim()
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    })

    // Send email notifications if enabled
    if (isEmailEnabled()) {
      try {
        // Notify timesheet owner if message is from manager/HR
        if (timesheet.userId !== user.id) {
          await sendTimesheetNotification({
            userId: timesheet.userId,
            timesheetId: params.id,
            type: 'submission',
            message: `New message from ${user.name} on your timesheet for ${new Date(timesheet.periodStart).toLocaleDateString()} - ${new Date(timesheet.periodEnd).toLocaleDateString()}`
          })
        }

        // Notify manager if message is from staff
        if (timesheet.user.managerId && timesheet.user.managerId !== user.id && user.role === Role.STAFF) {
          await sendTimesheetNotification({
            userId: timesheet.user.managerId,
            timesheetId: params.id,
            type: 'submission',
            message: `New message from ${user.name} on timesheet for ${timesheet.user.name}`
          })
        }
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error('Error creating timesheet message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 