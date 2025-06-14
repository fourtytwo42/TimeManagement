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

    // Only convert and include fields that are actually provided
    const updateData: any = {}
    
    // Handle time fields - only include if they're provided in the request
    if (in1 !== undefined) {
      updateData.in1 = in1 ? new Date(in1) : null
    }
    if (out1 !== undefined) {
      updateData.out1 = out1 ? new Date(out1) : null
    }
    if (in2 !== undefined) {
      updateData.in2 = in2 ? new Date(in2) : null
    }
    if (out2 !== undefined) {
      updateData.out2 = out2 ? new Date(out2) : null
    }
    if (in3 !== undefined) {
      updateData.in3 = in3 ? new Date(in3) : null
    }
    if (out3 !== undefined) {
      updateData.out3 = out3 ? new Date(out3) : null
    }
    
    // Handle other fields
    if (plawaHours !== undefined) {
      const plawaValidation = validatePlawaHours(plawaHours)
      if (!plawaValidation.isValid) {
        return NextResponse.json(
          { error: plawaValidation.error },
          { status: 400 }
        )
      }
      updateData.plawaHours = plawaHours
    }
    
    if (comments !== undefined) {
      updateData.comments = comments
    }

    // Validate time entries only for the fields being updated
    const timeValidation = validateTimeEntry(
      updateData.in1,
      updateData.out1,
      updateData.in2,
      updateData.out2,
      updateData.in3,
      updateData.out3
    )

    if (!timeValidation.isValid) {
      return NextResponse.json(
        { error: 'Invalid time entries', details: timeValidation.errors },
        { status: 400 }
      )
    }

    const updatedEntry = await updateTimesheetEntry(
      params.id,
      params.entryId,
      updateData,
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