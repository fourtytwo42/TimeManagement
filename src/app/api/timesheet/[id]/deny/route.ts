import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt-auth'
import { denyTimesheet } from '@/lib/timesheet'

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
      return NextResponse.json(
        { error: 'Denial reason is required' },
        { status: 400 }
      )
    }

    const updatedTimesheet = await denyTimesheet(
      params.id,
      user.id,
      note.trim()
    )

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