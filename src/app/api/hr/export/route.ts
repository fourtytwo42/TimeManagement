import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt-auth'
import { prisma } from '@/lib/db'
import Papa from 'papaparse'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

// Local constants to replace Prisma enums
const ROLES = {
  HR: 'HR',
  ADMIN: 'ADMIN'
} as const

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

    if (user.role !== 'HR' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'
    const reportType = searchParams.get('type') || 'all'
    const periodStart = searchParams.get('periodStart')
    const periodEnd = searchParams.get('periodEnd')

    let whereClause: any = {}
    
    // Add date filtering if period is specified
    if (periodStart && periodEnd) {
      whereClause.periodStart = {
        gte: new Date(periodStart),
        lte: new Date(periodEnd)
      }
    }

    if (reportType === 'payperiod') {
      // Pay period summary report
      const timesheets = await prisma.timesheet.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              name: true,
              email: true,
              role: true,
              payRate: true,
              manager: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          },
          entries: true
        },
        orderBy: {
          periodStart: 'desc'
        }
      })

      // Group by user and calculate totals
      const userSummaries = new Map()
      
      timesheets.forEach((timesheet: any) => {
        const userId = timesheet.userId
        if (!userSummaries.has(userId)) {
          userSummaries.set(userId, {
            name: timesheet.user.name,
            email: timesheet.user.email,
            payRate: timesheet.user.payRate,
            managerName: timesheet.user.manager?.name || 'N/A',
            managerEmail: timesheet.user.manager?.email || 'N/A',
            totalHours: 0,
            plawaHours: 0,
            regularHours: 0,
            totalPay: 0,
            timesheetCount: 0
          })
        }

        const summary = userSummaries.get(userId)
        summary.timesheetCount++

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

          const regularHours = dailyHours - (entry.plawaHours || 0)
          
          summary.totalHours += dailyHours
          summary.plawaHours += (entry.plawaHours || 0)
          summary.regularHours += regularHours
        })

        summary.totalPay = summary.totalHours * (summary.payRate || 0)
      })

      const exportData = Array.from(userSummaries.values()).map(summary => ({
        'Employee Name': summary.name,
        'Employee Email': summary.email,
        'Manager Name': summary.managerName,
        'Manager Email': summary.managerEmail,
        'Pay Rate': `$${summary.payRate}`,
        'Total Hours': Math.round(summary.totalHours * 100) / 100,
        'Regular Hours': Math.round(summary.regularHours * 100) / 100,
        'PLAWA Hours': Math.round(summary.plawaHours * 100) / 100,
        'Total Pay': `$${Math.round(summary.totalPay * 100) / 100}`,
        'Timesheets': summary.timesheetCount
      }))

      if (format === 'csv') {
        const csv = Papa.unparse(exportData)
        
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment;
filename="payperiod-summary-${periodStart || 'all'}-${periodEnd || 'all'}.csv"`
          }
        })
      } else if (format === 'pdf') {
        const doc = new jsPDF()
        
        // Add title
        doc.setFontSize(16)
        doc.text('Pay Period Summary Report', 20, 20)
        
        // Add period info
        doc.setFontSize(10)
        if (periodStart && periodEnd) {
          doc.text(`Period: ${new Date(periodStart).toLocaleDateString()} - ${new Date(periodEnd).toLocaleDateString()}`, 20, 35)
        } else {
          doc.text('Period: All Time', 20, 35)
        }
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 45)
        
        // Prepare table data
        const tableData = exportData.map(row => [
          row['Employee Name'],
          row['Manager Name'],
          row['Total Hours'],
          row['PLAWA Hours'],
          row['Pay Rate'],
          row['Total Pay']
        ])
        
        // Add table
        doc.autoTable({
          head: [['Employee', 'Manager', 'Total Hours', 'PLAWA Hours', 'Pay Rate', 'Total Pay']],
          body: tableData,
          startY: 55,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [59, 130, 246] },
          columnStyles: {
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right' }
          }
        })
        
        const pdfBuffer = doc.output('arraybuffer')
        
        return new NextResponse(pdfBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="payperiod-summary-${periodStart || 'all'}-${periodEnd || 'all'}.pdf"`
          }
        })
      }
    } else {
      // Original all timesheets export
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
        const doc = new jsPDF()
        
        // Add title
        doc.setFontSize(16)
        doc.text('Timesheet Report', 20, 20)
        
        // Add generation info
        doc.setFontSize(10)
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 35)
        doc.text(`Total Records: ${exportData.length}`, 20, 45)
        
        // Prepare table data (simplified for PDF)
        const tableData = exportData.map(row => [
          row['Employee Name'],
          row['Date'],
          row['Daily Total Hours'],
          row['PLAWA Hours'],
          row['Status']
        ])
        
        // Add table
        doc.autoTable({
          head: [['Employee', 'Date', 'Total Hours', 'PLAWA Hours', 'Status']],
          body: tableData,
          startY: 55,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [59, 130, 246] },
          columnStyles: {
            2: { halign: 'right' },
            3: { halign: 'right' }
          }
        })
        
        const pdfBuffer = doc.output('arraybuffer')
        
        return new NextResponse(pdfBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="timesheet-report.pdf"'
          }
        })
      }
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