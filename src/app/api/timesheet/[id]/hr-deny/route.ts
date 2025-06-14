import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt-auth'
import { prisma } from '@/lib/db'
import { Role, TsState } from '@prisma/client'

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

    if (user.role !== Role.HR && user.role !== Role.ADMIN) {
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

    if (timesheet.state !== TsState.PENDING_HR) {
      return NextResponse.json(
        { error: 'Timesheet is not pending HR approval' },
        { status: 400 }
      )
    }

    const updatedTimesheet = await prisma.timesheet.update({
      where: { id: params.id },
      data: {
        state: TsState.PENDING_STAFF,
        managerNote: note, // Store HR denial note in managerNote field
        updatedAt: new Date()
      }
    })

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