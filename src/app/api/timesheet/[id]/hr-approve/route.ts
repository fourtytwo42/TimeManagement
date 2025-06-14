import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt-auth'
import { prisma } from '@/lib/db'

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
        state: TS_STATE.APPROVED,
        hrSig: signature,
        updatedAt: new Date()
      }
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