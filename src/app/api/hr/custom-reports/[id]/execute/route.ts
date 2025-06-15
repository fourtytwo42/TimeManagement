import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt-auth'
import { prisma } from '@/lib/db'
import Papa from 'papaparse'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { format } from 'date-fns'

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

    const body = await request.json()
    const { format: outputFormat = 'csv', parameters = {} } = body

    // Get the custom report
    const customReport = await prisma.customReport.findUnique({
      where: { id: params.id },
      include: {
        creator: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    if (!customReport || !customReport.isActive) {
      return NextResponse.json({ error: 'Custom report not found' }, { status: 404 })
    }

    const config = JSON.parse(customReport.config)
    
    // Build the query based on the report configuration
    let whereClause: any = {}
    let includeClause: any = {
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
    }

    // Apply filters from config and parameters
    if (config.filters) {
      // Date range filter
      if (config.filters.dateRange && parameters.startDate && parameters.endDate) {
        whereClause.periodStart = {
          gte: new Date(parameters.startDate),
          lte: new Date(parameters.endDate)
        }
      }

      // Status filter
      if (config.filters.status && parameters.status) {
        whereClause.state = parameters.status
      }

      // User filter
      if (config.filters.users && parameters.userIds && parameters.userIds.length > 0) {
        whereClause.userId = {
          in: parameters.userIds
        }
      }

      // Role filter
      if (config.filters.roles && parameters.roles && parameters.roles.length > 0) {
        whereClause.user = {
          role: {
            in: parameters.roles
          }
        }
      }
    }

    // Fetch data based on report type
    let reportData: any[] = []
    let reportTitle = customReport.name

    if (config.reportType === 'timesheet_summary') {
      const timesheets = await prisma.timesheet.findMany({
        where: whereClause,
        include: includeClause,
        orderBy: {
          periodStart: 'desc'
        }
      })

      reportData = timesheets.map(timesheet => {
        const totalHours = timesheet.entries.reduce((sum, entry) => {
          let dailyHours = entry.plawaHours || 0
          if (entry.in1 && entry.out1) {
            dailyHours += (new Date(entry.out1).getTime() - new Date(entry.in1).getTime()) / (1000 * 60 * 60)
          }
          if (entry.in2 && entry.out2) {
            dailyHours += (new Date(entry.out2).getTime() - new Date(entry.in2).getTime()) / (1000 * 60 * 60)
          }
          if (entry.in3 && entry.out3) {
            dailyHours += (new Date(entry.out3).getTime() - new Date(entry.in3).getTime()) / (1000 * 60 * 60)
          }
          return sum + dailyHours
        }, 0)

        const plawaHours = timesheet.entries.reduce((sum, entry) => sum + (entry.plawaHours || 0), 0)
        const regularHours = totalHours - plawaHours

        const row: any = {}
        
        // Add selected columns based on config
        if (config.columns.includes('employeeName')) row['Employee Name'] = timesheet.user.name
        if (config.columns.includes('employeeEmail')) row['Employee Email'] = timesheet.user.email
        if (config.columns.includes('managerName')) row['Manager Name'] = timesheet.user.manager?.name || 'N/A'
        if (config.columns.includes('managerEmail')) row['Manager Email'] = timesheet.user.manager?.email || 'N/A'
        if (config.columns.includes('periodStart')) row['Period Start'] = format(new Date(timesheet.periodStart), 'yyyy-MM-dd')
        if (config.columns.includes('periodEnd')) row['Period End'] = format(new Date(timesheet.periodEnd), 'yyyy-MM-dd')
        if (config.columns.includes('status')) row['Status'] = timesheet.state
        if (config.columns.includes('totalHours')) row['Total Hours'] = Math.round(totalHours * 100) / 100
        if (config.columns.includes('regularHours')) row['Regular Hours'] = Math.round(regularHours * 100) / 100
        if (config.columns.includes('plawaHours')) row['PLAWA Hours'] = Math.round(plawaHours * 100) / 100
        if (config.columns.includes('payRate')) row['Pay Rate'] = `$${timesheet.user.payRate}`
        if (config.columns.includes('estimatedPay')) row['Estimated Pay'] = `$${Math.round(totalHours * (timesheet.user.payRate || 0) * 100) / 100}`
        if (config.columns.includes('staffSigned')) row['Staff Signed'] = timesheet.staffSig ? 'Yes' : 'No'
        if (config.columns.includes('managerSigned')) row['Manager Signed'] = timesheet.managerSig ? 'Yes' : 'No'
        if (config.columns.includes('hrSigned')) row['HR Signed'] = timesheet.hrSig ? 'Yes' : 'No'

        return row
      })
    } else if (config.reportType === 'user_summary') {
      // Group by user for user summary reports
      const timesheets = await prisma.timesheet.findMany({
        where: whereClause,
        include: includeClause,
        orderBy: {
          periodStart: 'desc'
        }
      })

      const userSummaries = new Map()
      
      timesheets.forEach((timesheet: any) => {
        const userId = timesheet.userId
        if (!userSummaries.has(userId)) {
          userSummaries.set(userId, {
            name: timesheet.user.name,
            email: timesheet.user.email,
            role: timesheet.user.role,
            payRate: timesheet.user.payRate,
            managerName: timesheet.user.manager?.name || 'N/A',
            managerEmail: timesheet.user.manager?.email || 'N/A',
            totalHours: 0,
            plawaHours: 0,
            regularHours: 0,
            totalPay: 0,
            timesheetCount: 0,
            approvedCount: 0
          })
        }

        const summary = userSummaries.get(userId)
        summary.timesheetCount++
        if (timesheet.state === 'APPROVED') summary.approvedCount++

        timesheet.entries.forEach((entry: any) => {
          let dailyHours = entry.plawaHours || 0
          
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

      reportData = Array.from(userSummaries.values()).map(summary => {
        const row: any = {}
        
        if (config.columns.includes('employeeName')) row['Employee Name'] = summary.name
        if (config.columns.includes('employeeEmail')) row['Employee Email'] = summary.email
        if (config.columns.includes('role')) row['Role'] = summary.role
        if (config.columns.includes('managerName')) row['Manager Name'] = summary.managerName
        if (config.columns.includes('managerEmail')) row['Manager Email'] = summary.managerEmail
        if (config.columns.includes('payRate')) row['Pay Rate'] = `$${summary.payRate}`
        if (config.columns.includes('totalHours')) row['Total Hours'] = Math.round(summary.totalHours * 100) / 100
        if (config.columns.includes('regularHours')) row['Regular Hours'] = Math.round(summary.regularHours * 100) / 100
        if (config.columns.includes('plawaHours')) row['PLAWA Hours'] = Math.round(summary.plawaHours * 100) / 100
        if (config.columns.includes('totalPay')) row['Total Pay'] = `$${Math.round(summary.totalPay * 100) / 100}`
        if (config.columns.includes('timesheetCount')) row['Timesheets'] = summary.timesheetCount
        if (config.columns.includes('approvedCount')) row['Approved'] = summary.approvedCount
        if (config.columns.includes('approvalRate')) row['Approval Rate'] = summary.timesheetCount > 0 ? `${Math.round((summary.approvedCount / summary.timesheetCount) * 100)}%` : '0%'

        return row
      })
    }

    // Generate output in requested format
    if (outputFormat === 'csv') {
      const csv = Papa.unparse(reportData)
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${customReport.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv"`
        }
      })
    } else if (outputFormat === 'pdf') {
      const doc = new jsPDF()
      
      // Add title
      doc.setFontSize(16)
      doc.text(reportTitle, 20, 20)
      
      // Add generation info
      doc.setFontSize(10)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 35)
      doc.text(`Total Records: ${reportData.length}`, 20, 45)
      if (parameters.startDate && parameters.endDate) {
        doc.text(`Period: ${new Date(parameters.startDate).toLocaleDateString()} - ${new Date(parameters.endDate).toLocaleDateString()}`, 20, 55)
      }
      
      // Prepare table data
      const headers = Object.keys(reportData[0] || {})
      const tableData = reportData.map(row => headers.map(header => row[header] || ''))
      
      // Add table
      doc.autoTable({
        head: [headers],
        body: tableData,
        startY: parameters.startDate && parameters.endDate ? 65 : 55,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }
      })
      
      const pdfBuffer = doc.output('arraybuffer')
      
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${customReport.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf"`
        }
      })
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error) {
    console.error('Error executing custom report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 