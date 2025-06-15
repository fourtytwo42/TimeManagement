import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt-auth'
import { submitTimesheet } from '@/lib/timesheet'
import { createTimesheetNotification, createManagerApprovalNotification } from '@/lib/notifications'
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

    const body = await request.json()
    const { signature } = body

    if (!signature) {
      return NextResponse.json(
        { error: 'Digital signature is required' },
        { status: 400 }
      )
    }

    const updatedTimesheet = await submitTimesheet(
      params.id,
      user.id,
      signature
    )

    // Create notifications
    try {
      // Notify the staff member of successful submission
      await createTimesheetNotification(
        user.id,
        'submission',
        params.id
      )

      // Get timesheet details to notify manager
      const timesheet = await prisma.timesheet.findUnique({
        where: { id: params.id },
        include: {
          user: {
            select: { 
              name: true,
              manager: {
                select: { id: true }
              }
            }
          }
        }
      })
      
      // Notify manager if they exist
      if (timesheet?.user.manager?.id) {
        await createManagerApprovalNotification(
          timesheet.user.manager.id,
          timesheet.user.name,
          params.id
        )
      }
    } catch (notificationError) {
      console.error('Failed to create submission notifications:', notificationError)
      // Don't fail the submission if notification fails
    }

    return NextResponse.json({
      message: 'Timesheet submitted successfully',
      timesheet: updatedTimesheet
    })
  } catch (error) {
    console.error('Error submitting timesheet:', error)
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    
    return NextResponse.json(
      { error: 'Failed to submit timesheet' },
      { status: 500 }
    )
  }
} 