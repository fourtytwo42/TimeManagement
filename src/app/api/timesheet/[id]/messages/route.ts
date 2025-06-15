import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt-auth'
import { prisma } from '@/lib/db'
import { createTimesheetMessageNotification, fulfillNotifications } from '@/lib/notifications'

// Local constants to replace Prisma enums
const ROLES = {
  HR: 'HR',
  ADMIN: 'ADMIN',
  STAFF: 'STAFF'
} as const

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

    // Verify user has access to this timesheet
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            managerId: true
          }
        }
      }
    })

    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 })
    }

    // Check access permissions
    const hasAccess = 
      timesheet.userId === user.id || // Owner
      timesheet.user.managerId === user.id || // Manager
      user.role === 'HR' || // HR
      user.role === 'ADMIN' // Admin

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch messages
    const messages = await prisma.timesheetMessage.findMany({
      where: {
        timesheetId: params.id
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
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

    const body = await request.json()
    const { content } = body

    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    // Verify user has access to this timesheet
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            managerId: true,
            manager: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 })
    }

    // Check access permissions
    const hasAccess = 
      timesheet.userId === user.id || // Owner
      timesheet.user.managerId === user.id || // Manager
      user.role === 'HR' || // HR
      user.role === 'ADMIN' // Admin

    if (!hasAccess) {
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

    // Send notifications to relevant users
    const recipients = new Set<string>()
    
    // Always notify the timesheet owner (if not the sender)
    if (timesheet.userId !== user.id) {
      recipients.add(timesheet.userId)
    }
    
    // Notify the manager (if not the sender and exists)
    if (timesheet.user.managerId && timesheet.user.managerId !== user.id) {
      recipients.add(timesheet.user.managerId)
    }
    
    // If sender is HR, notify both staff and manager
    if (user.role === 'HR' || user.role === 'ADMIN') {
      recipients.add(timesheet.userId)
      if (timesheet.user.managerId) {
        recipients.add(timesheet.user.managerId)
      }
    }

    // Send notifications
    for (const recipientId of Array.from(recipients)) {
      await createTimesheetMessageNotification(
        recipientId,
        user.name,
        params.id,
        content.trim()
      )
    }

    // Fulfill message notifications for the sender
    await fulfillNotifications(user.id, params.id, 'message_sent')

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error('Error creating timesheet message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 