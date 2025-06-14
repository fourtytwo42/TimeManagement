import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt-auth'
import { updateTimesheetEntry } from '@/lib/timesheet'
import { validateTimeEntry, validatePlawaHours } from '@/lib/utils'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; entryId: string } }
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
    const { in1, out1, in2, out2, in3, out3, plawaHours, comments } = body

    // Convert string dates to Date objects
    const dateFields = {
      in1: in1 ? new Date(in1) : null,
      out1: out1 ? new Date(out1) : null,
      in2: in2 ? new Date(in2) : null,
      out2: out2 ? new Date(out2) : null,
      in3: in3 ? new Date(in3) : null,
      out3: out3 ? new Date(out3) : null,
    }

    // Validate time entries
    const timeValidation = validateTimeEntry(
      dateFields.in1,
      dateFields.out1,
      dateFields.in2,
      dateFields.out2,
      dateFields.in3,
      dateFields.out3
    )

    if (!timeValidation.isValid) {
      return NextResponse.json(
        { error: 'Invalid time entries', details: timeValidation.errors },
        { status: 400 }
      )
    }

    // Validate PLAWA hours
    if (plawaHours !== undefined) {
      const plawaValidation = validatePlawaHours(plawaHours)
      if (!plawaValidation.isValid) {
        return NextResponse.json(
          { error: plawaValidation.error },
          { status: 400 }
        )
      }
    }

    const updatedEntry = await updateTimesheetEntry(
      params.id,
      params.entryId,
      {
        ...dateFields,
        plawaHours: plawaHours !== undefined ? plawaHours : undefined,
        comments: comments !== undefined ? comments : undefined,
      },
      user.id
    )

    return NextResponse.json(updatedEntry)
  } catch (error) {
    console.error('Error updating timesheet entry:', error)
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    
    return NextResponse.json(
      { error: 'Failed to update entry' },
      { status: 500 }
    )
  }
} 