import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt-auth'
import { prisma } from '@/lib/db'

// Local constants to replace Prisma enums
const ROLES = {
  HR: 'HR',
  ADMIN: 'ADMIN'
} as const
import { isEmailEnabled, sendEmail } from '@/lib/mailer'
import Papa from 'papaparse'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

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

    if (user.role !== 'HR' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      reportType, 
      format, 
      filters, 
      emailTo, 
      dateRange 
    } = body

    // Build query based on filters
    let whereClause: any = {}
    
    if (filters?.userId) {
      whereClause.userId = filters.userId
    }
    
    if (filters?.status) {
      whereClause.state = filters.status
    }
    
    if (dateRange?.start && dateRange?.end) {
      whereClause.periodStart = {
        gte: new Date(dateRange.start),
        lte: new Date(dateRange.end)
      }
    }

    // Fetch data based on report type
    let reportData: any[] = []
    let reportTitle = ''

    switch (reportType) {
      case 'timesheet_summary':
        reportTitle = 'Timesheet Summary Report'
        const timesheets = await prisma.timesheet.findMany({
          where: whereClause,
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

          return {
            'Employee Name': timesheet.user.name,
            'Employee Email': timesheet.user.email,
            'Period Start': format(new Date(timesheet.periodStart), 'yyyy-MM-dd'),
            'Period End': format(new Date(timesheet.periodEnd), 'yyyy-MM-dd'),
            'Status': timesheet.state,
            'Total Hours': Math.round(totalHours * 100) / 100,
            'Regular Hours': Math.round(regularHours * 100) / 100,
            'PLAWA Hours': Math.round(plawaHours * 100) / 100,
            'Pay Rate': timesheet.user.payRate,
            'Estimated Pay': Math.round(totalHours * (timesheet.user.payRate || 0) * 100) / 100,
            'Staff Signed': timesheet.staffSig ? 'Yes' : 'No',
            'Manager Signed': timesheet.managerSig ? 'Yes' : 'No',
            'HR Signed': timesheet.hrSig ? 'Yes' : 'No'
          }
        })
        break

      case 'user_analytics':
        reportTitle = 'User Analytics Report'
                 const users = await prisma.user.findMany({
           where: filters?.userId ? { id: filters.userId } : {},
           include: {
             timesheets: {
               include: {
                 entries: true
               },
               where: dateRange ? {
                 periodStart: {
                   gte: new Date(dateRange.start),
                   lte: new Date(dateRange.end)
                 }
               } : {}
             }
           }
         })

        reportData = users.map(user => {
          const totalHours = user.timesheets.reduce((userSum, timesheet) => {
            return userSum + timesheet.entries.reduce((tsSum, entry) => {
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
              return tsSum + dailyHours
            }, 0)
          }, 0)

          const approvedTimesheets = user.timesheets.filter(ts => ts.state === 'APPROVED').length
          const totalTimesheets = user.timesheets.length

          return {
            'Employee Name': user.name,
            'Employee Email': user.email,
            'Role': user.role,
                         'Status': 'ACTIVE', // Default status since field doesn't exist yet
            'Pay Rate': user.payRate,
            'Total Hours': Math.round(totalHours * 100) / 100,
            'Total Timesheets': totalTimesheets,
            'Approved Timesheets': approvedTimesheets,
            'Approval Rate': totalTimesheets > 0 ? Math.round((approvedTimesheets / totalTimesheets) * 100) : 0,
            'Estimated Earnings': Math.round(totalHours * (user.payRate || 0) * 100) / 100
          }
        })
        break

      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }

    // Generate report in requested format
    let reportContent: string | Buffer
    let contentType: string
    let filename: string

    if (format === 'csv') {
      reportContent = Papa.unparse(reportData)
      contentType = 'text/csv'
      filename = `${reportType}_${format(new Date(), 'yyyy-MM-dd')}.csv`
    } else if (format === 'json') {
      reportContent = JSON.stringify(reportData, null, 2)
      contentType = 'application/json'
      filename = `${reportType}_${format(new Date(), 'yyyy-MM-dd')}.json`
    } else {
      return NextResponse.json({ error: 'Unsupported format' }, { status: 400 })
    }

    // If email is requested and enabled
    if (emailTo && isEmailEnabled()) {
      try {
        await sendEmail({
          to: emailTo,
          subject: `Timesheet Report - ${reportTitle}`,
          html: `
            <div style='font-family: Arial, sans-serif;
max-width: 600px; margin: 0 auto;'>
              <div style='background-color: #f8f9fa; padding: 20px; border-radius: 8px;'>
                <h2 style='color: #333; margin-bottom: 20px;'>Timesheet Report</h2>
                
                <p>Hi ${user.name || 'User'},</p>
                
                <p>Your requested ${reportTitle} report is attached to this email.</p>
                
                <div style='background-color: white; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0;'>
                  <p><strong>Report Type:</strong> ${reportTitle}</p>
                  <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
                  <p><strong>Filename:</strong> ${filename}</p>
                </div>
                
                <p>Please find the report attached as a ${filename.split('.').pop()?.toUpperCase()} file.</p>
                
                <div style='margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;'>
                  <p>This is an automated notification from the Timesheet Management System.</p>
                </div>
              </div>
            </div>
          `,
          attachments: [{
            filename,
            content: Buffer.from(reportContent)
          }]
        }, 'report')
        
        return NextResponse.json({ 
          message: 'Report generated and emailed successfully',
          recordCount: reportData.length
        })
      } catch (emailError) {
        console.error('Failed to send report email:', emailError)
        return NextResponse.json({ 
          error: 'Report generated but failed to send email',
          recordCount: reportData.length
        }, { status: 207 })
      }
    }

    // Return report directly
    return new NextResponse(reportContent, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename='${filename}'`
      }
    })

  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 