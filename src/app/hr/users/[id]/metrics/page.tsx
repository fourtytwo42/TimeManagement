'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-toastify'
import { format } from 'date-fns'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { ArrowLeft, Clock, DollarSign, TrendingUp, Calendar, MessageSquare, FileText, CheckCircle, AlertCircle, BarChart3, PieChart, Download, Mail, Printer } from 'lucide-react'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (_options: any) => jsPDF
  }
}

interface UserMetrics {
  user: {
    id: string
    name: string
    email: string
    role: string
    payRate: number
    createdAt: string
    manager?: {
      name: string
    }
  }
  summary: {
    totalHours: number
    totalPlawaHours: number
    totalRegularHours: number
    totalTimesheets: number
    approvedTimesheets: number
    pendingTimesheets: number
    deniedTimesheets: number
    totalMessages: number
    averageHoursPerTimesheet: number
    averageHoursPerMonth: number
    plawaPercentage: number
    approvalRate: number
    estimatedEarnings: number
    estimatedPlawaEarnings: number
    totalEstimatedEarnings: number
  }
  yearlyStats: {
    year: number
    totalHours: number
    plawaHours: number
    regularHours: number
    plawaPercentage: number
  }
  monthlyData: Array<{
    month: string
    monthName: string
    hours: number
    plawaHours: number
    regularHours: number
    timesheets: number
  }>
  dailyAverages: Record<string, {
    total: number
    count: number
    average: number
  }>
  recentTimesheets: Array<{
    id: string
    periodStart: string
    periodEnd: string
    state: string
    staffSig?: string | null
    staffSigAt?: string | null
    managerSig?: string | null
    managerSigAt?: string | null
    hrSig?: string | null
    hrSigAt?: string | null
    totalHours: number
    messagesCount: number
  }>
}

export default function UserMetricsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<UserMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('12') // months

  // Separate useEffect for auth check - only runs once when user is loaded
  useEffect(() => {
    console.log('Auth check useEffect triggered. User:', user?.email, 'Role:', user?.role)
    if (user && user.role !== 'HR' && user.role !== 'ADMIN') {
      console.log('User does not have HR/ADMIN role, redirecting:', user.role)
      router.push('/hr')
    }
  }, [user?.role, router])

  // Separate useEffect for data fetching - runs when params or timeRange changes
  useEffect(() => {
    console.log('Data fetch useEffect triggered. User role:', user?.role, 'Params ID:', params?.id, 'TimeRange:', timeRange)
    if (user && (user.role === 'HR' || user.role === 'ADMIN') && params?.id) {
      fetchMetrics()
    } else if (user && params && !params.id) {
      console.error('No user ID provided in params:', params)
      toast.error('No user ID provided')
    }
  }, [timeRange, params?.id, user?.role])

  const fetchMetrics = async () => {
    if (!params?.id) {
      console.error('No user ID available for fetching metrics')
      return
    }
    
    console.log('Fetching metrics for user ID:', params.id, 'with timeRange:', timeRange)
    setLoading(true)
    try {
      const data = await apiClient.get(`/api/hr/users/${params.id}/metrics?months=${timeRange}`)
      console.log('Metrics data received:', data)
      setMetrics(data)
    } catch (error) {
      console.error('Error fetching metrics:', error)
      toast.error('Failed to load user metrics')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handlePDFExport = () => {
    if (!metrics) return

    const { user: targetUser, summary, yearlyStats, recentTimesheets } = metrics
    
    // Create new PDF document
    const doc = new jsPDF()
    
    // Add title
    doc.setFontSize(20)
    doc.text('Employee Metrics Report', 20, 20)
    
    // Add employee info
    doc.setFontSize(12)
    doc.text(`Employee: ${targetUser.name}`, 20, 35)
    doc.text(`Email: ${targetUser.email}`, 20, 45)
    doc.text(`Role: ${targetUser.role}`, 20, 55)
    doc.text(`Pay Rate: $${targetUser.payRate}/hour`, 20, 65)
    doc.text(`Report Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, 20, 75)
    
    // Add yearly PLAWA stats
    doc.setFontSize(14)
    doc.text(`${yearlyStats.year} Year-to-Date PLAWA Usage`, 20, 95)
    doc.setFontSize(10)
    doc.text(`YTD Total Hours: ${yearlyStats.totalHours}`, 20, 105)
    doc.text(`YTD PLAWA Hours: ${yearlyStats.plawaHours}`, 20, 115)
    doc.text(`YTD Regular Hours: ${yearlyStats.regularHours}`, 20, 125)
    doc.text(`YTD PLAWA Percentage: ${yearlyStats.plawaPercentage}%`, 20, 135)
    
    // Add summary section
    doc.setFontSize(14)
    doc.text('Period Summary', 20, 155)
    doc.setFontSize(10)
    doc.text(`Total Hours: ${summary.totalHours}`, 20, 165)
    doc.text(`Regular Hours: ${summary.totalRegularHours}`, 20, 175)
    doc.text(`PLAWA Hours: ${summary.totalPlawaHours}`, 20, 185)
    doc.text(`Total Timesheets: ${summary.totalTimesheets}`, 20, 195)
    doc.text(`Approval Rate: ${summary.approvalRate}%`, 20, 205)
    doc.text(`Estimated Earnings: $${summary.totalEstimatedEarnings}`, 20, 215)
    
    // Add timesheet table
    const tableData = recentTimesheets.map(ts => [
      `${format(new Date(ts.periodStart), 'MMM d')} - ${format(new Date(ts.periodEnd), 'MMM d, yyyy')}`,
      ts.state.replace('PENDING_', '').replace('_', ' '),
      ts.totalHours.toFixed(1),
      ts.staffSigAt ? format(new Date(ts.staffSigAt), 'MMM d, h:mm a') : 'Not signed',
      ts.managerSigAt ? format(new Date(ts.managerSigAt), 'MMM d, h:mm a') : 'Not signed',
      ts.hrSigAt ? format(new Date(ts.hrSigAt), 'MMM d, h:mm a') : 'Not signed',
      ts.messagesCount.toString()
    ])
    
    // Add table using autoTable plugin
    doc.autoTable({
      head: [['Period', 'Status', 'Hours', 'Staff Signed', 'Manager Signed', 'HR Signed', 'Messages']],
      body: tableData,
      startY: 230,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 20 },
        2: { cellWidth: 15 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 },
        6: { cellWidth: 15 }
      }
    })
    
    // Save the PDF
    doc.save(`${targetUser.name.replace(/\s+/g, '_')}_metrics_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
    toast.success('PDF exported successfully!')
  }

  const handleEmailReport = () => {
    toast.info('Email report functionality coming soon!')
  }

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800'
      case 'PENDING_HR':
        return 'bg-purple-100 text-purple-800'
      case 'PENDING_MANAGER':
        return 'bg-blue-100 text-blue-800'
      case 'PENDING_STAFF':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600'></div>
      </div>
    )
  }

  // Don't render anything until user is loaded to prevent premature redirects
  if (!user) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600'></div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <h2 className='text-2xl font-bold text-gray-900 mb-4'>User Not Found</h2>
          <button
            onClick={() => router.push('/hr')}
            className='text-primary-600 hover:text-primary-800'
          >
            Return to HR Dashboard
          </button>
        </div>
      </div>
    )
  }

  const { user: targetUser, summary, yearlyStats, monthlyData, dailyAverages, recentTimesheets } = metrics

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-7xl mx-auto py-6 sm:px-6 lg:px-8' id='metrics-content'>
        {/* Header */}
        <div className='mb-8'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-4 no-print'>
              <button
                onClick={() => router.push('/hr')}
                className='flex items-center text-gray-600 hover:text-gray-900'
              >
                <ArrowLeft className='w-5 h-5 mr-2' />
                Back to HR Dashboard
              </button>
            </div>
            <div className='flex items-center space-x-2 no-print'>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className='border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
              >
                <option value='3'>Last 3 months</option>
                <option value='6'>Last 6 months</option>
                <option value='12'>Last 12 months</option>
                <option value='24'>Last 24 months</option>
              </select>
              <button
                onClick={handlePrint}
                className='flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50'
              >
                <Printer className='w-4 h-4 mr-2' />
                Print
              </button>
              <button
                onClick={handlePDFExport}
                className='flex items-center px-3 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700'
              >
                <Download className='w-4 h-4 mr-2' />
                Export PDF
              </button>
              <button
                onClick={handleEmailReport}
                className='flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50'
              >
                <Mail className='w-4 h-4 mr-2' />
                Email Report
              </button>
            </div>
          </div>
          
          <div className='mt-4'>
            <h1 className='text-3xl font-bold text-gray-900'>{targetUser.name}</h1>
            <div className='flex items-center space-x-4 mt-2 text-sm text-gray-600'>
              <span>{targetUser.email}</span>
              <span>•</span>
              <span className='capitalize'>{targetUser.role.toLowerCase()}</span>
              {targetUser.manager && (
                <>
                  <span>•</span>
                  <span>Manager: {targetUser.manager.name}</span>
                </>
              )}
              <span>•</span>
              <span>${targetUser.payRate}/hour</span>
            </div>
          </div>
        </div>

        {/* Yearly PLAWA Stats */}
        <div className='bg-gradient-to-r from-blue-50 to-green-50 rounded-lg shadow p-6 mb-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='text-lg font-medium text-gray-900 mb-2'>{yearlyStats.year} Year-to-Date PLAWA Usage</h3>
              <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                <div>
                  <p className='text-sm text-gray-600'>Total Hours</p>
                  <p className='text-2xl font-bold text-blue-600'>{yearlyStats.totalHours}</p>
                </div>
                <div>
                  <p className='text-sm text-gray-600'>PLAWA Hours Used</p>
                  <p className='text-2xl font-bold text-green-600'>{yearlyStats.plawaHours}</p>
                </div>
                <div>
                  <p className='text-sm text-gray-600'>Regular Hours</p>
                  <p className='text-2xl font-bold text-gray-700'>{yearlyStats.regularHours}</p>
                </div>
                <div>
                  <p className='text-sm text-gray-600'>PLAWA Percentage</p>
                  <p className='text-2xl font-bold text-purple-600'>{yearlyStats.plawaPercentage}%</p>
                </div>
              </div>
            </div>
            <div className='hidden md:block'>
              <div className='w-24 h-24 relative'>
                <svg className='w-24 h-24 transform -rotate-90' viewBox='0 0 100 100'>
                  <circle
                    cx='50'
                    cy='50'
                    r='40'
                    stroke='#e5e7eb'
                    strokeWidth='8'
                    fill='none'
                  />
                  <circle
                    cx='50'
                    cy='50'
                    r='40'
                    stroke='#10b981'
                    strokeWidth='8'
                    fill='none'
                    strokeDasharray={`${(yearlyStats.plawaPercentage / 100) * 251.2} 251.2`}
                    strokeLinecap='round'
                  />
                </svg>
                <div className='absolute inset-0 flex items-center justify-center'>
                  <span className='text-sm font-bold text-gray-700'>{yearlyStats.plawaPercentage}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
          <div className='bg-white rounded-lg shadow p-6'>
            <div className='flex items-center'>
              <div className='flex-shrink-0'>
                <Clock className='h-8 w-8 text-blue-600' />
              </div>
              <div className='ml-4'>
                <p className='text-sm font-medium text-gray-500'>Total Hours</p>
                <p className='text-2xl font-semibold text-gray-900'>{summary.totalHours}</p>
                <p className='text-xs text-gray-500'>
                  {summary.totalRegularHours} regular + {summary.totalPlawaHours} PLAWA
                </p>
              </div>
            </div>
          </div>

          <div className='bg-white rounded-lg shadow p-6'>
            <div className='flex items-center'>
              <div className='flex-shrink-0'>
                <DollarSign className='h-8 w-8 text-green-600' />
              </div>
              <div className='ml-4'>
                <p className='text-sm font-medium text-gray-500'>Est. Earnings</p>
                <p className='text-2xl font-semibold text-gray-900'>${summary.totalEstimatedEarnings}</p>
                <p className='text-xs text-gray-500'>
                  Based on ${targetUser.payRate}/hour
                </p>
              </div>
            </div>
          </div>

          <div className='bg-white rounded-lg shadow p-6'>
            <div className='flex items-center'>
              <div className='flex-shrink-0'>
                <FileText className='h-8 w-8 text-purple-600' />
              </div>
              <div className='ml-4'>
                <p className='text-sm font-medium text-gray-500'>Timesheets</p>
                <p className='text-2xl font-semibold text-gray-900'>{summary.totalTimesheets}</p>
                <p className='text-xs text-gray-500'>
                  {summary.approvalRate}% approval rate
                </p>
              </div>
            </div>
          </div>

          <div className='bg-white rounded-lg shadow p-6'>
            <div className='flex items-center'>
              <div className='flex-shrink-0'>
                <TrendingUp className='h-8 w-8 text-orange-600' />
              </div>
              <div className='ml-4'>
                <p className='text-sm font-medium text-gray-500'>Avg Hours/Month</p>
                <p className='text-2xl font-semibold text-gray-900'>{summary.averageHoursPerMonth}</p>
                <p className='text-xs text-gray-500'>
                  {summary.plawaPercentage}% PLAWA
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8'>
          {/* Monthly Hours Chart */}
          <div className='bg-white rounded-lg shadow p-6'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-medium text-gray-900'>Monthly Hours Breakdown</h3>
              <BarChart3 className='w-5 h-5 text-gray-400' />
            </div>
            <div className='space-y-4'>
              {monthlyData.slice(-6).map((month) => (
                <div key={month.month} className='flex items-center justify-between'>
                  <div className='flex-1'>
                    <div className='flex justify-between text-sm'>
                      <span className='font-medium'>{month.monthName}</span>
                      <span>{month.hours.toFixed(1)} hrs</span>
                    </div>
                    <div className='mt-1 flex space-x-1'>
                      <div 
                        className='h-2 bg-blue-500 rounded'
                        style={{ width: `${(month.regularHours / month.hours) * 100}%` }}
                      />
                      <div 
                        className='h-2 bg-green-500 rounded'
                        style={{ width: `${(month.plawaHours / month.hours) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className='mt-4 flex items-center space-x-4 text-xs'>
              <div className='flex items-center'>
                <div className='w-3 h-3 bg-blue-500 rounded mr-1'></div>
                <span>Regular Hours</span>
              </div>
              <div className='flex items-center'>
                <div className='w-3 h-3 bg-green-500 rounded mr-1'></div>
                <span>PLAWA Hours</span>
              </div>
            </div>
          </div>

          {/* Daily Averages */}
          <div className='bg-white rounded-lg shadow p-6'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-medium text-gray-900'>Daily Averages</h3>
              <PieChart className='w-5 h-5 text-gray-400' />
            </div>
            <div className='space-y-3'>
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                const dayData = dailyAverages[day]
                const maxHours = Math.max(...Object.values(dailyAverages).map((d: any) => d.average))
                
                return (
                  <div key={day} className='flex items-center justify-between'>
                    <span className='text-sm font-medium w-20'>{day.slice(0, 3)}</span>
                    <div className='flex-1 mx-3'>
                      <div className='h-2 bg-gray-200 rounded'>
                        <div 
                          className='h-2 bg-primary-500 rounded'
                          style={{ width: dayData ? `${(dayData.average / maxHours) * 100}%` : '0%' }}
                        />
                      </div>
                    </div>
                    <span className='text-sm text-gray-600 w-12 text-right'>
                      {dayData ? dayData.average.toFixed(1) : '0.0'}h
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Recent Timesheets */}
        <div className='bg-white rounded-lg shadow overflow-hidden'>
          <div className='px-6 py-4 border-b border-gray-200'>
            <h3 className='text-lg font-medium text-gray-900'>Recent Timesheets</h3>
          </div>
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Period
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Status
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Hours
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Signatures
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Messages
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {recentTimesheets.map((timesheet) => (
                  <tr key={timesheet.id}>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                      {format(new Date(timesheet.periodStart), 'MMM d')} - {format(new Date(timesheet.periodEnd), 'MMM d, yyyy')}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(timesheet.state)}`}>
                        {timesheet.state.replace('PENDING_', '').replace('_', ' ')}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                      {timesheet.totalHours.toFixed(1)}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-xs text-gray-600'>
                      <div className='space-y-1'>
                        <div className='flex items-center'>
                          <span className={`w-2 h-2 rounded-full mr-2 ${timesheet.staffSig ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                          <span className='font-medium'>Staff:</span>
                          <span className='ml-1'>
                            {timesheet.staffSigAt ? format(new Date(timesheet.staffSigAt), 'MMM d, h:mm a') : 'Not signed'}
                          </span>
                        </div>
                        <div className='flex items-center'>
                          <span className={`w-2 h-2 rounded-full mr-2 ${timesheet.managerSig ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                          <span className='font-medium'>Manager:</span>
                          <span className='ml-1'>
                            {timesheet.managerSigAt ? format(new Date(timesheet.managerSigAt), 'MMM d, h:mm a') : 'Not signed'}
                          </span>
                        </div>
                        <div className='flex items-center'>
                          <span className={`w-2 h-2 rounded-full mr-2 ${timesheet.hrSig ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                          <span className='font-medium'>HR:</span>
                          <span className='ml-1'>
                            {timesheet.hrSigAt ? format(new Date(timesheet.hrSigAt), 'MMM d, h:mm a') : 'Not signed'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                      <div className='flex items-center'>
                        <MessageSquare className='w-4 h-4 mr-1 text-gray-400' />
                        {timesheet.messagesCount}
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm font-medium'>
                      <button
                        onClick={() => router.push(`/hr/timesheet/${timesheet.id}`)}
                        className='text-primary-600 hover:text-primary-900'
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Additional Stats */}
        <div className='mt-8 grid grid-cols-1 md:grid-cols-3 gap-6'>
          <div className='bg-white rounded-lg shadow p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-500'>Approval Rate</p>
                <p className='text-3xl font-bold text-green-600'>{summary.approvalRate}%</p>
              </div>
              <CheckCircle className='h-8 w-8 text-green-600' />
            </div>
            <div className='mt-4'>
              <div className='text-xs text-gray-500'>
                {summary.approvedTimesheets} of {summary.totalTimesheets} approved
              </div>
            </div>
          </div>

          <div className='bg-white rounded-lg shadow p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-500'>Avg Hours/Timesheet</p>
                <p className='text-3xl font-bold text-blue-600'>{summary.averageHoursPerTimesheet}</p>
              </div>
              <Calendar className='h-8 w-8 text-blue-600' />
            </div>
            <div className='mt-4'>
              <div className='text-xs text-gray-500'>
                Across {summary.totalTimesheets} timesheets
              </div>
            </div>
          </div>

          <div className='bg-white rounded-lg shadow p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-500'>Total Messages</p>
                <p className='text-3xl font-bold text-purple-600'>{summary.totalMessages}</p>
              </div>
              <MessageSquare className='h-8 w-8 text-purple-600' />
            </div>
            <div className='mt-4'>
              <div className='text-xs text-gray-500'>
                Communication activity
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 