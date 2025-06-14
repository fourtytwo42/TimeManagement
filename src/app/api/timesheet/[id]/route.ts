import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt-auth'
import { getTimesheetById } from '@/lib/timesheet'

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

    const timesheet = await getTimesheetById(params.id, user.id, user.role)

    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 })
    }

    return NextResponse.json(timesheet)
  } catch (error) {
    console.error('Error fetching timesheet:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 