'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'react-toastify'
import { apiClient } from '@/lib/api-client'
import { useRouter } from 'next/navigation'
import EmailSettings from '@/components/EmailSettings'
import { 
  Users, 
  FileText, 
  Settings, 
  CheckCircle, 
  XCircle, 
  Download,
  Plus,
  Search,
  Filter,
  X,
  Edit,
  Trash2,
  UserX,
  BarChart3,
  Eye,
  Calendar,
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingUp,
  MessageSquare
} from 'lucide-react'
import { format } from 'date-fns'

interface User {
  id: string
  email: string
  name: string
  role: string
  status: string
  managerId?: string
  payRate: number
  createdAt: string
  manager?: {
    name: string
  }
}

interface PendingTimesheet {
  id: string
  user: {
    id: string
    name: string
    email: string
  }
  periodStart: string
  periodEnd: string
  state: string
  totalHours: number
  updatedAt: string
}

interface CustomReport {
  id: string
  name: string
  description?: string
  config: string
  createdAt: string
  creator: {
    name: string
    email: string
  }
}

type TabType = 'approvals' | 'users' | 'reports' | 'settings' | 'messages'

export default function HRDashboardView() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('approvals')
  const [pendingTimesheets, setPendingTimesheets] = useState<PendingTimesheet[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [customReports, setCustomReports] = useState<CustomReport[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showEditUserModal, setShowEditUserModal] = useState(false)

  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [addUserForm, setAddUserForm] = useState({
    email: '',
    name: '',
    role: 'STAFF',
    managerId: '',
    payRate: '',
    password: ''
  })
  const [editUserForm, setEditUserForm] = useState({
    id: '',
    email: '',
    name: '',
    role: 'STAFF',
    status: 'ACTIVE',
    managerId: '',
    payRate: '',
    payRateEffectiveDate: '',
    password: ''
  })

  const [addingUser, setAddingUser] = useState(false)
  const [updatingUser, setUpdatingUser] = useState(false)

  const [showPayPeriodModal, setShowPayPeriodModal] = useState(false)
  const [payPeriodData, setPayPeriodData] = useState({
    startDate: '',
    endDate: ''
  })
  const [showReportBuilderModal, setShowReportBuilderModal] = useState(false)
  const [reportBuilder, setReportBuilder] = useState({
    name: '',
    description: '',
    reportType: 'timesheet_summary',
    columns: [] as string[],
    filters: {
      dateRange: false,
      status: false,
      users: false,
      roles: false
    }
  })

  useEffect(() => {
    fetchData()
  }, [activeTab])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [pendingData, usersData, reportsData] = await Promise.all([
        apiClient.get('/api/hr/pending-approvals'),
        apiClient.get('/api/hr/users'),
        apiClient.get('/api/hr/custom-reports')
      ])
      
      setPendingTimesheets(pendingData)
      setUsers(usersData)
      setCustomReports(reportsData)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleTimesheetClick = (timesheetId: string) => {
    router.push(`/hr/timesheet/${timesheetId}`)
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddingUser(true)

    try {
      await apiClient.post('/api/hr/users', {
        ...addUserForm,
        payRate: parseFloat(addUserForm.payRate),
        managerId: addUserForm.managerId || null
      })

      toast.success('User created successfully')
      setShowAddUserModal(false)
      setAddUserForm({
        email: '',
        name: '',
        role: 'STAFF',
        managerId: '',
        payRate: '',
        password: ''
      })
      fetchData()
    } catch (error: any) {
      console.error('Error creating user:', error)
      toast.error(error.response?.data?.error || 'Failed to create user')
    } finally {
      setAddingUser(false)
    }
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setEditUserForm({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      managerId: user.managerId || '',
      payRate: user.payRate.toString(),
      payRateEffectiveDate: '',
      password: ''
    })
    setShowEditUserModal(true)
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdatingUser(true)

    try {
      const updateData: any = {
        id: editUserForm.id,
        email: editUserForm.email,
        name: editUserForm.name,
        role: editUserForm.role,
        status: editUserForm.status,
        managerId: editUserForm.managerId || null,
        payRate: parseFloat(editUserForm.payRate)
      }

      if (editUserForm.payRateEffectiveDate) {
        updateData.payRateEffectiveDate = editUserForm.payRateEffectiveDate
      }

      if (editUserForm.password) {
        updateData.password = editUserForm.password
      }

      await apiClient.put('/api/hr/users', updateData)

      toast.success('User updated successfully')
      setShowEditUserModal(false)
      setSelectedUser(null)
      fetchData()
    } catch (error: any) {
      console.error('Error updating user:', error)
      toast.error(error.response?.data?.error || 'Failed to update user')
    } finally {
      setUpdatingUser(false)
    }
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return
    }

    try {
      await apiClient.delete(`/api/hr/users?id=${userId}`)
      toast.success('User deleted successfully')
      fetchData()
    } catch (error: any) {
      console.error('Error deleting user:', error)
      toast.error(error.response?.data?.error || 'Failed to delete user')
    }
  }

  const handleSuspendUser = async (userId: string, userName: string, currentStatus: string) => {
    const newStatus = currentStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED'
    const action = newStatus === 'SUSPENDED' ? 'suspend' : 'reactivate'
    
    if (!confirm(`Are you sure you want to ${action} ${userName}?`)) {
      return
    }

    try {
      await apiClient.put('/api/hr/users', {
        id: userId,
        status: newStatus
      })
      toast.success(`User ${action}d successfully`)
      fetchData()
    } catch (error: any) {
      console.error(`Error ${action}ing user:`, error)
      toast.error(error.response?.data?.error || `Failed to ${action} user`)
    }
  }

  const exportReports = async (format: 'csv' | 'pdf') => {
    try {
      const response = await fetch(`/api/hr/export?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `timesheet-report.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success(`Report exported as ${format.toUpperCase()}`)
      } else {
        toast.error('Failed to export report')
      }
    } catch (error) {
      console.error('Error exporting report:', error)
      toast.error('Failed to export report')
    }
  }

  const exportPayPeriodReport = async (format: 'csv' | 'pdf') => {
    if (!payPeriodData.startDate || !payPeriodData.endDate) {
      toast.error('Please select both start and end dates')
      return
    }

    try {
      const response = await fetch(`/api/hr/export?format=${format}&type=payperiod&periodStart=${payPeriodData.startDate}&periodEnd=${payPeriodData.endDate}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `payperiod-summary-${payPeriodData.startDate}-${payPeriodData.endDate}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success(`Pay period report exported as ${format.toUpperCase()}`)
        setShowPayPeriodModal(false)
      } else {
        toast.error('Failed to export pay period report')
      }
    } catch (error) {
      console.error('Error exporting pay period report:', error)
      toast.error('Failed to export pay period report')
    }
  }

  const createCustomReport = async () => {
    if (!reportBuilder.name || reportBuilder.columns.length === 0) {
      toast.error('Please provide a name and select at least one column')
      return
    }

    try {
      await apiClient.post('/api/hr/custom-reports', {
        name: reportBuilder.name,
        description: reportBuilder.description,
        config: {
          reportType: reportBuilder.reportType,
          columns: reportBuilder.columns,
          filters: reportBuilder.filters
        }
      })
      
      toast.success('Custom report created successfully')
      setShowReportBuilderModal(false)
      setReportBuilder({
        name: '',
        description: '',
        reportType: 'timesheet_summary',
        columns: [],
        filters: {
          dateRange: false,
          status: false,
          users: false,
          roles: false
        }
      })
      fetchData()
    } catch (error) {
      console.error('Error creating custom report:', error)
      toast.error('Failed to create custom report')
    }
  }

  const executeCustomReport = async (reportId: string, format: 'csv' | 'pdf') => {
    try {
      const response = await fetch(`/api/hr/custom-reports/${reportId}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          format,
          parameters: {}
        })
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `custom-report-${format}-${Date.now()}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success(`Custom report exported as ${format.toUpperCase()}`)
      } else {
        toast.error('Failed to execute custom report')
      }
    } catch (error) {
      console.error('Error executing custom report:', error)
      toast.error('Failed to execute custom report')
    }
  }

  const deleteCustomReport = async (reportId: string, reportName: string) => {
    if (!confirm(`Are you sure you want to delete the report "${reportName}"?`)) {
      return
    }

    try {
      await apiClient.delete(`/api/hr/custom-reports?id=${reportId}`)
      toast.success('Custom report deleted successfully')
      fetchData()
    } catch (error) {
      console.error('Error deleting custom report:', error)
      toast.error('Failed to delete custom report')
    }
  }

  const availableColumns = {
    timesheet_summary: [
      { id: 'employeeName', label: 'Employee Name' },
      { id: 'employeeEmail', label: 'Employee Email' },
      { id: 'managerName', label: 'Manager Name' },
      { id: 'managerEmail', label: 'Manager Email' },
      { id: 'periodStart', label: 'Period Start' },
      { id: 'periodEnd', label: 'Period End' },
      { id: 'status', label: 'Status' },
      { id: 'totalHours', label: 'Total Hours' },
      { id: 'regularHours', label: 'Regular Hours' },
      { id: 'plawaHours', label: 'PLAWA Hours' },
      { id: 'payRate', label: 'Pay Rate' },
      { id: 'estimatedPay', label: 'Estimated Pay' },
      { id: 'staffSigned', label: 'Staff Signed' },
      { id: 'managerSigned', label: 'Manager Signed' },
      { id: 'hrSigned', label: 'HR Signed' }
    ],
    user_summary: [
      { id: 'employeeName', label: 'Employee Name' },
      { id: 'employeeEmail', label: 'Employee Email' },
      { id: 'role', label: 'Role' },
      { id: 'managerName', label: 'Manager Name' },
      { id: 'managerEmail', label: 'Manager Email' },
      { id: 'payRate', label: 'Pay Rate' },
      { id: 'totalHours', label: 'Total Hours' },
      { id: 'regularHours', label: 'Regular Hours' },
      { id: 'plawaHours', label: 'PLAWA Hours' },
      { id: 'totalPay', label: 'Total Pay' },
      { id: 'timesheetCount', label: 'Timesheet Count' },
      { id: 'approvedCount', label: 'Approved Count' },
      { id: 'approvalRate', label: 'Approval Rate' }
    ]
  }

  const tabs = [
    { id: 'approvals', label: 'Pending Approvals', icon: CheckCircle },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const managers = users.filter(u => u.role === 'MANAGER')

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>
      case 'SUSPENDED':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Suspended</span>
      case 'INACTIVE':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Inactive</span>
      default:
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">HR Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage users, timesheets, and reports</p>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-2" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Export All Timesheets */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center mb-4">
                    <Download className="w-8 h-8 text-blue-600 mr-3" />
                    <div>
                      <h3 className="font-medium text-gray-900">Export All Timesheets</h3>
                      <p className="text-sm text-gray-500">Download all timesheet data</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => exportReports('csv')}
                      className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"
                    >
                      Export CSV
                    </button>
                    <button
                      onClick={() => exportReports('pdf')}
                      className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700"
                    >
                      Export PDF
                    </button>
                  </div>
                </div>

                {/* Pay Period Report */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center mb-4">
                    <Calendar className="w-8 h-8 text-purple-600 mr-3" />
                    <div>
                      <h3 className="font-medium text-gray-900">Pay Period Report</h3>
                      <p className="text-sm text-gray-500">Summary by pay period</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPayPeriodModal(true)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-700"
                  >
                    <Filter className="w-4 h-4 mr-1 inline" />
                    Generate Report
                  </button>
                </div>

                {/* Custom Report Builder */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center mb-4">
                    <BarChart3 className="w-8 h-8 text-orange-600 mr-3" />
                    <div>
                      <h3 className="font-medium text-gray-900">Custom Reports</h3>
                      <p className="text-sm text-gray-500">Build custom reports</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowReportBuilderModal(true)}
                    className="bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-700"
                  >
                    <Plus className="w-4 h-4 mr-1 inline" />
                    Create Report
                  </button>
                </div>
              </div>

              {/* Custom Reports List */}
              {customReports.length > 0 && (
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Saved Custom Reports</h3>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {customReports.map((report) => (
                      <div key={report.id} className="px-6 py-4 flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900">{report.name}</h4>
                          {report.description && (
                            <p className="text-sm text-gray-500">{report.description}</p>
                          )}
                          <p className="text-xs text-gray-400">
                            Created by {report.creator.name} on {format(new Date(report.createdAt), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => executeCustomReport(report.id, 'csv')}
                            className="text-green-600 hover:text-green-800"
                            title="Export as CSV"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => executeCustomReport(report.id, 'pdf')}
                            className="text-red-600 hover:text-red-800"
                            title="Export as PDF"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteCustomReport(report.id, report.name)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete Report"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pay Period Report Modal */}
          {showPayPeriodModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowPayPeriodModal(false)} />

                <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                  <div className="mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Generate Pay Period Report</h3>
                    <p className="text-sm text-gray-500 mt-2">
                      Select a date range to generate a summary report of all users' hours and pay for that period.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={payPeriodData.startDate}
                        onChange={(e) => setPayPeriodData(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={payPeriodData.endDate}
                        onChange={(e) => setPayPeriodData(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-6">
                    <button
                      onClick={() => setShowPayPeriodModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => exportPayPeriodReport('csv')}
                        className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                      >
                        Export CSV
                      </button>
                      <button
                        onClick={() => exportPayPeriodReport('pdf')}
                        className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
                      >
                        Export PDF
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Custom Report Builder Modal */}
          {showReportBuilderModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowReportBuilderModal(false)} />

                <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
                  <div className="mb-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Custom Report Builder</h3>
                    <p className="text-sm text-gray-500 mt-2">
                      Create a custom report by selecting the data you want to include.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Report Details */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Report Name</label>
                        <input
                          type="text"
                          value={reportBuilder.name}
                          onChange={(e) => setReportBuilder(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Enter report name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                        <textarea
                          value={reportBuilder.description}
                          onChange={(e) => setReportBuilder(prev => ({ ...prev, description: e.target.value }))}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Describe what this report shows"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                        <select
                          value={reportBuilder.reportType}
                          onChange={(e) => setReportBuilder(prev => ({ ...prev, reportType: e.target.value, columns: [] }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="timesheet_summary">Timesheet Summary</option>
                          <option value="user_summary">User Summary</option>
                        </select>
                      </div>
                    </div>

                    {/* Column Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select Columns</label>
                      <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md p-3 space-y-2">
                        {availableColumns[reportBuilder.reportType as keyof typeof availableColumns].map((column) => (
                          <label key={column.id} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={reportBuilder.columns.includes(column.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setReportBuilder(prev => ({
                                    ...prev,
                                    columns: [...prev.columns, column.id]
                                  }))
                                } else {
                                  setReportBuilder(prev => ({
                                    ...prev,
                                    columns: prev.columns.filter(c => c !== column.id)
                                  }))
                                }
                              }}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-700">{column.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Filter Options */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Available Filters</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={reportBuilder.filters.dateRange}
                          onChange={(e) => setReportBuilder(prev => ({
                            ...prev,
                            filters: { ...prev.filters, dateRange: e.target.checked }
                          }))}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Date Range</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={reportBuilder.filters.status}
                          onChange={(e) => setReportBuilder(prev => ({
                            ...prev,
                            filters: { ...prev.filters, status: e.target.checked }
                          }))}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Status</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={reportBuilder.filters.users}
                          onChange={(e) => setReportBuilder(prev => ({
                            ...prev,
                            filters: { ...prev.filters, users: e.target.checked }
                          }))}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Specific Users</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={reportBuilder.filters.roles}
                          onChange={(e) => setReportBuilder(prev => ({
                            ...prev,
                            filters: { ...prev.filters, roles: e.target.checked }
                          }))}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Roles</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-8">
                    <button
                      onClick={() => setShowReportBuilderModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={createCustomReport}
                      disabled={!reportBuilder.name || reportBuilder.columns.length === 0}
                      className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Create Report
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'approvals' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Pending HR Approvals</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingTimesheets.map((timesheet) => (
                      <tr key={timesheet.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{timesheet.user.name}</div>
                            <div className="text-sm text-gray-500">{timesheet.user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(timesheet.periodStart), 'MMM d')} - {format(new Date(timesheet.periodEnd), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {timesheet.totalHours.toFixed(2)} hours
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                            Pending HR
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleTimesheetClick(timesheet.id)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {pendingTimesheets.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No pending approvals</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* Header with search and add button */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <div className="flex-1 max-w-lg">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search users by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add User
                </button>
              </div>

              {/* Users table */}
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pay Rate</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.manager?.name || 'No Manager'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${user.payRate}/hr
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(user.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => router.push(`/hr/users/${user.id}/metrics`)}
                                className="text-blue-600 hover:text-blue-900"
                                title="View Metrics"
                              >
                                <BarChart3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEditUser(user)}
                                className="text-primary-600 hover:text-primary-900"
                                title="Edit User"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleSuspendUser(user.id, user.name, user.status)}
                                className={`${user.status === 'SUSPENDED' ? 'text-green-600 hover:text-green-900' : 'text-yellow-600 hover:text-yellow-900'}`}
                                title={user.status === 'SUSPENDED' ? 'Reactivate User' : 'Suspend User'}
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id, user.name)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete User"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">
                        {searchTerm ? 'No users found matching your search' : 'No users found'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white shadow rounded-lg p-6">
              <EmailSettings />
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowAddUserModal(false)} />

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Add New User</h3>
              </div>

              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    required
                    value={addUserForm.name}
                    onChange={(e) => setAddUserForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    required
                    value={addUserForm.email}
                    onChange={(e) => setAddUserForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <select
                    value={addUserForm.role}
                    onChange={(e) => setAddUserForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="STAFF">Staff</option>
                    <option value="MANAGER">Manager</option>
                    <option value="HR">HR</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Manager</label>
                  <select
                    value={addUserForm.managerId}
                    onChange={(e) => setAddUserForm(prev => ({ ...prev, managerId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">No Manager</option>
                    {managers.map(manager => (
                      <option key={manager.id} value={manager.id}>{manager.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pay Rate ($/hour)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={addUserForm.payRate}
                    onChange={(e) => setAddUserForm(prev => ({ ...prev, payRate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    required
                    value={addUserForm.password}
                    onChange={(e) => setAddUserForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddUserModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingUser}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                  >
                    {addingUser ? 'Adding...' : 'Add User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowEditUserModal(false)} />

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Edit User</h3>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    required
                    value={editUserForm.name}
                    onChange={(e) => setEditUserForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    required
                    value={editUserForm.email}
                    onChange={(e) => setEditUserForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <select
                    value={editUserForm.role}
                    onChange={(e) => setEditUserForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="STAFF">Staff</option>
                    <option value="MANAGER">Manager</option>
                    <option value="HR">HR</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={editUserForm.status}
                    onChange={(e) => setEditUserForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Manager</label>
                  <select
                    value={editUserForm.managerId}
                    onChange={(e) => setEditUserForm(prev => ({ ...prev, managerId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">No Manager</option>
                    {managers.filter(m => m.id !== editUserForm.id).map(manager => (
                      <option key={manager.id} value={manager.id}>{manager.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pay Rate ($/hour)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editUserForm.payRate}
                    onChange={(e) => setEditUserForm(prev => ({ ...prev, payRate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pay Rate Effective Date</label>
                  <input
                    type="date"
                    value={editUserForm.payRateEffectiveDate}
                    onChange={(e) => setEditUserForm(prev => ({ ...prev, payRateEffectiveDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave blank to use current date. This determines when the new pay rate becomes effective.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Password (leave blank to keep current)</label>
                  <input
                    type="password"
                    value={editUserForm.password}
                    onChange={(e) => setEditUserForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowEditUserModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingUser}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                  >
                    {updatingUser ? 'Updating...' : 'Update User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
