import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt-auth'
import { prisma } from '@/lib/db'
import { Role } from '@prisma/client'
import Papa from 'papaparse'

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

    if (user.role !== Role.HR && user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'

    // Fetch all timesheets with user and entry data
    const timesheets = await prisma.timesheet.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true,
            payRate: true
          }
        },
        entries: true
      },
      orderBy: {
        periodStart: 'desc'
      }
    })

    // Transform data for export
    const exportData: any[] = []
    
    timesheets.forEach((timesheet: any) => {
      timesheet.entries.forEach((entry: any) => {
        let dailyHours = entry.plawaHours || 0

        // Calculate hours from in/out pairs
        if (entry.in1 && entry.out1) {
          dailyHours += (new Date(entry.out1).getTime() - new Date(entry.in1).getTime()) / (1000 * 60 * 60)
        }
        if (entry.in2 && entry.out2) {
          dailyHours += (new Date(entry.out2).getTime() - new Date(entry.in2).getTime()) / (1000 * 60 * 60)
        }
        if (entry.in3 && entry.out3) {
          dailyHours += (new Date(entry.out3).getTime() - new Date(entry.in3).getTime()) / (1000 * 60 * 60)
        }

        exportData.push({
          'Employee Name': timesheet.user.name,
          'Employee Email': timesheet.user.email,
          'Role': timesheet.user.role,
          'Pay Rate': timesheet.user.payRate,
          'Date': new Date(entry.date).toLocaleDateString(),
          'Period Start': new Date(timesheet.periodStart).toLocaleDateString(),
          'Period End': new Date(timesheet.periodEnd).toLocaleDateString(),
          'In 1': entry.in1 ? new Date(entry.in1).toLocaleTimeString() : '',
          'Out 1': entry.out1 ? new Date(entry.out1).toLocaleTimeString() : '',
          'In 2': entry.in2 ? new Date(entry.in2).toLocaleTimeString() : '',
          'Out 2': entry.out2 ? new Date(entry.out2).toLocaleTimeString() : '',
          'In 3': entry.in3 ? new Date(entry.in3).toLocaleTimeString() : '',
          'Out 3': entry.out3 ? new Date(entry.out3).toLocaleTimeString() : '',
          'PLAWA Hours': entry.plawaHours || 0,
          'Daily Total Hours': Math.round(dailyHours * 100) / 100,
          'Status': timesheet.state,
          'Staff Signature': timesheet.staffSig ? 'Yes' : 'No',
          'Manager Signature': timesheet.managerSig ? 'Yes' : 'No',
          'HR Signature': timesheet.hrSig ? 'Yes' : 'No'
        })
      })
    })

    if (format === 'csv') {
      const csv = Papa.unparse(exportData)
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="timesheet-report.csv"'
        }
      })
    } else if (format === 'pdf') {
      // For now, return a simple text response for PDF
      // In a full implementation, you would use pdf-lib to generate a proper PDF
      const pdfContent = `Timesheet Report\n\nTotal Records: ${exportData.length}\n\nThis is a placeholder for PDF generation.`
      
      return new NextResponse(pdfContent, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="timesheet-report.pdf"'
        }
      })
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error) {
    console.error('Error exporting data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 