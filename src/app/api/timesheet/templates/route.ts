import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt-auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
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

    // Fetch user's templates with patterns
    const templates = await prisma.timesheetTemplate.findMany({
      where: {
        userId: user.id
      },
      include: {
        patterns: {
          orderBy: {
            dayType: 'asc'
          }
        }
      },
      orderBy: [
        { isDefault: 'desc' },
        { updatedAt: 'desc' }
      ]
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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
    const { name, description, patterns, isDefault, timesheetId } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      )
    }

    // Check if template name already exists for this user
    const existingTemplate = await prisma.timesheetTemplate.findUnique({
      where: {
        userId_name: {
          userId: user.id,
          name: name.trim()
        }
      }
    })

    if (existingTemplate) {
      return NextResponse.json(
        { error: 'Template name already exists' },
        { status: 409 }
      )
    }

    let templatePatterns = patterns

    // If creating from existing timesheet, extract patterns
    if (timesheetId && !patterns) {
      const timesheet = await prisma.timesheet.findFirst({
        where: {
          id: timesheetId,
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

      // Extract patterns from timesheet entries
      templatePatterns = extractPatternsFromTimesheet(timesheet.entries)
    }

    if (!templatePatterns || templatePatterns.length === 0) {
      return NextResponse.json(
        { error: 'Template patterns are required' },
        { status: 400 }
      )
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await prisma.timesheetTemplate.updateMany({
        where: {
          userId: user.id,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      })
    }

    // Create template with patterns
    const template = await prisma.timesheetTemplate.create({
      data: {
        userId: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        isDefault: isDefault || false,
        patterns: {
          create: templatePatterns.map((pattern: any) => ({
            dayType: pattern.dayType,
            in1: pattern.in1,
            out1: pattern.out1,
            in2: pattern.in2,
            out2: pattern.out2,
            in3: pattern.in3,
            out3: pattern.out3,
            comments: pattern.comments
          }))
        }
      },
      include: {
        patterns: true
      }
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
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
    const { id, name, description, patterns, isDefault } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      )
    }

    // Verify template belongs to user
    const existingTemplate = await prisma.timesheetTemplate.findFirst({
      where: {
        id,
        userId: user.id
      }
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Check if new name conflicts with existing templates
    if (name && name.trim() !== existingTemplate.name) {
      const nameConflict = await prisma.timesheetTemplate.findUnique({
        where: {
          userId_name: {
            userId: user.id,
            name: name.trim()
          }
        }
      })

      if (nameConflict) {
        return NextResponse.json(
          { error: 'Template name already exists' },
          { status: 409 }
        )
      }
    }

    // If this is set as default, unset other defaults
    if (isDefault && !existingTemplate.isDefault) {
      await prisma.timesheetTemplate.updateMany({
        where: {
          userId: user.id,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      })
    }

    // Update template
    const updateData: any = {
      updatedAt: new Date()
    }

    if (name) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (isDefault !== undefined) updateData.isDefault = isDefault

    const updatedTemplate = await prisma.timesheetTemplate.update({
      where: { id },
      data: updateData,
      include: {
        patterns: true
      }
    })

    // Update patterns if provided
    if (patterns) {
      // Delete existing patterns
      await prisma.timesheetTemplatePattern.deleteMany({
        where: { templateId: id }
      })

      // Create new patterns
      await prisma.timesheetTemplatePattern.createMany({
        data: patterns.map((pattern: any) => ({
          templateId: id,
          dayType: pattern.dayType,
          in1: pattern.in1,
          out1: pattern.out1,
          in2: pattern.in2,
          out2: pattern.out2,
          in3: pattern.in3,
          out3: pattern.out3,
          comments: pattern.comments
        }))
      })

      // Fetch updated template with new patterns
      const finalTemplate = await prisma.timesheetTemplate.findUnique({
        where: { id },
        include: {
          patterns: {
            orderBy: {
              dayType: 'asc'
            }
          }
        }
      })

      return NextResponse.json(finalTemplate)
    }

    return NextResponse.json(updatedTemplate)
  } catch (error) {
    console.error('Error updating template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      )
    }

    // Verify template belongs to user
    const template = await prisma.timesheetTemplate.findFirst({
      where: {
        id,
        userId: user.id
      }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Delete template (patterns will be cascade deleted)
    await prisma.timesheetTemplate.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Template deleted successfully' })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to extract patterns from timesheet entries
function extractPatternsFromTimesheet(entries: any[]): any[] {
  const patterns: { [key: string]: any } = {}

  entries.forEach(entry => {
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

    // Only include entries that have time data (ignore PLAWA-only entries)
    const hasTimeData = entry.in1 || entry.out1 || entry.in2 || entry.out2 || entry.in3 || entry.out3

    if (hasTimeData) {
      // If we already have a pattern for this day type, merge/override
      if (!patterns[dayType]) {
        patterns[dayType] = {
          dayType,
          in1: null,
          out1: null,
          in2: null,
          out2: null,
          in3: null,
          out3: null,
          comments: null
        }
      }

      // Extract time strings (HH:MM format)
      if (entry.in1) patterns[dayType].in1 = formatTimeForTemplate(new Date(entry.in1))
      if (entry.out1) patterns[dayType].out1 = formatTimeForTemplate(new Date(entry.out1))
      if (entry.in2) patterns[dayType].in2 = formatTimeForTemplate(new Date(entry.in2))
      if (entry.out2) patterns[dayType].out2 = formatTimeForTemplate(new Date(entry.out2))
      if (entry.in3) patterns[dayType].in3 = formatTimeForTemplate(new Date(entry.in3))
      if (entry.out3) patterns[dayType].out3 = formatTimeForTemplate(new Date(entry.out3))
      if (entry.comments) patterns[dayType].comments = entry.comments
    }
  })

  return Object.values(patterns)
}

// Helper function to format time as HH:MM
function formatTimeForTemplate(date: Date): string {
  return date.toTimeString().slice(0, 5) // HH:MM format
} 