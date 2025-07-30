import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt-auth'
import { prisma } from '@/lib/db'
import { isWeekend } from 'date-fns'

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

    const body = await request.json()
    const { templateId } = body

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      )
    }

    // Verify timesheet belongs to user and is editable
    const timesheet = await prisma.timesheet.findFirst({
      where: {
        id,
        userId: user.id
      },
      include: {
        entries: true
      }
    })

    if (!timesheet) {
      return NextResponse.json(
        { error: 'Timesheet not found' },
        { status: 404 }
      )
    }

    // Check if timesheet is in an editable state
    if (timesheet.state !== 'PENDING_STAFF') {
      return NextResponse.json(
        { error: 'Timesheet is not in an editable state' },
        { status: 400 }
      )
    }

    // Fetch template with patterns
    const template = await prisma.timesheetTemplate.findFirst({
      where: {
        id: templateId,
        userId: user.id
      },
      include: {
        patterns: true
      }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Apply template patterns to timesheet entries
    const updatedEntries = []
    
    for (const entry of timesheet.entries) {
      const date = new Date(entry.date)
      const dayOfWeek = date.getDay() // 0 = Sunday, 6 = Saturday
      
      let dayType: string
      if (dayOfWeek === 0) {
        dayType = 'SUNDAY'
      } else if (dayOfWeek === 6) {
        dayType = 'SATURDAY'
      } else {
        dayType = 'WEEKDAY'
      }

      // Find matching pattern for this day type
      const pattern = template.patterns.find((p: any) => p.dayType === dayType)
      
      if (pattern) {
        // Apply pattern to entry (preserve existing PLAWA hours)
        const updateData: any = {
          in1: pattern.in1 ? parseTimeToDate(pattern.in1, date) : null,
          out1: pattern.out1 ? parseTimeToDate(pattern.out1, date) : null,
          in2: pattern.in2 ? parseTimeToDate(pattern.in2, date) : null,
          out2: pattern.out2 ? parseTimeToDate(pattern.out2, date) : null,
          in3: pattern.in3 ? parseTimeToDate(pattern.in3, date) : null,
          out3: pattern.out3 ? parseTimeToDate(pattern.out3, date) : null,
          comments: pattern.comments || null
          // Note: We don't update plawaHours - templates ignore PLAWA
        }

        // Update the entry
        const updatedEntry = await prisma.timesheetEntry.update({
          where: { id: entry.id },
          data: updateData
        })

        updatedEntries.push(updatedEntry)
      }
    }

    // Fetch the updated timesheet
    const updatedTimesheet = await prisma.timesheet.findUnique({
      where: { id },
      include: {
        entries: {
          orderBy: { date: 'asc' }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
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

    return NextResponse.json({
      message: `Template '${template.name}' applied successfully`,
      timesheet: updatedTimesheet,
      entriesUpdated: updatedEntries.length
    })
  } catch (error) {
    console.error('Error applying template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to parse time string (HH:MM) to Date object for specific date
function parseTimeToDate(timeString: string, baseDate: Date): Date {
  const [hours, minutes] = timeString.split(':').map(Number)
  const date = new Date(baseDate)
  date.setHours(hours, minutes, 0, 0)
  return date
} 