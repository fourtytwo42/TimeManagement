import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt-auth'
import { approveTimesheet } from '@/lib/timesheet'
import { createTimesheetNotification, createHRApprovalNotification, fulfillNotifications } from '@/lib/notifications'
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
    const { signature } = body

    if (!signature) {
      return NextResponse.json(
        { error: 'Digital signature is required' },
        { status: 400 }
      )
    }

    const updatedTimesheet = await approveTimesheet(
      id,
      user.id,
      signature
    )

    // Create notifications
    try {
      const timesheet = await prisma.timesheet.findUnique({
        where: { id },
        include: {
          user: {
            select: { id: true, name: true }
          }
        }
      })
      
      if (timesheet) {
        // Notify the timesheet owner of approval
        await createTimesheetNotification(
          timesheet.user.id,
          'approval',
          id
        )

        // Notify all HR users that a timesheet needs their approval
        const hrUsers = await prisma.user.findMany({
          where: { role: 'HR' },
          select: { id: true }
        })

        for (const hrUser of hrUsers) {
          await createHRApprovalNotification(
            hrUser.id,
            timesheet.user.name,
            id
          )
        }

        // Fulfill manager approval notifications
        await fulfillNotifications(user.id, id, 'timesheet_approved')
      }
    } catch (notificationError) {
      console.error('Failed to create approval notifications:', notificationError)
      // Don't fail the approval if notification fails
    }

    return NextResponse.json({
      message: 'Timesheet approved successfully',
      timesheet: updatedTimesheet
    })
  } catch (error) {
    console.error('Error approving timesheet:', error)
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    
    return NextResponse.json(
      { error: 'Failed to approve timesheet' },
      { status: 500 }
    )
  }
} 