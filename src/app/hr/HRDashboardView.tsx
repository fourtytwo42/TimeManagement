'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'react-toastify'
import { apiClient } from '@/lib/api-client'
import { Role } from '@prisma/client'
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
  MessageSquare,
  Mail,
  BarChart3,
  Eye
} from 'lucide-react'

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

type TabType = 'approvals' | 'users' | 'reports' | 'settings' | 'messages'

export default function HRDashboardView() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('approvals')
  const [pendingApprovals, setPendingApprovals] = useState<PendingTimesheet[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showEditUserModal, setShowEditUserModal] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
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
    password: ''
  })
  const [messageForm, setMessageForm] = useState({
    subject: '',
    content: ''
  })
  const [addingUser, setAddingUser] = useState(false)
  const [updatingUser, setUpdatingUser] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)

  useEffect(() => {
    fetchData()
  }, [activeTab])

  const fetchData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'approvals') {
        const data = await apiClient.get('/api/hr/pending-approvals')
        setPendingApprovals(data)
      } else if (activeTab === 'users') {
        const data = await apiClient.get('/api/hr/users')
        setUsers(data)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (timesheetId: string) => {
    try {
      await apiClient.post(`/api/timesheet/${timesheetId}/hr-approve`, { 
        signature: 'HR_DIGITAL_SIGNATURE' 
      })
      toast.success('Timesheet approved successfully')
      fetchData()
    } catch (error) {
      console.error('Error approving timesheet:', error)
      toast.error('Failed to approve timesheet')
    }
  }

  const handleDeny = async (timesheetId: string, note: string) => {
    try {
      await apiClient.post(`/api/timesheet/${timesheetId}/hr-deny`, { note })
      toast.success('Timesheet denied and returned to staff')
      fetchData()
    } catch (error) {
      console.error('Error denying timesheet:', error)
      toast.error('Failed to deny timesheet')
    }
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

  const handleSendMessage = (user: User) => {
    setSelectedUser(user)
    setMessageForm({
      subject: '',
      content: ''
    })
    setShowMessageModal(true)
  }

  const handleSubmitMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    setSendingMessage(true)

    try {
      await apiClient.post('/api/messages', {
        receiverId: selectedUser.id,
        subject: messageForm.subject,
        content: messageForm.content
      })

      toast.success('Message sent successfully')
      setShowMessageModal(false)
      setSelectedUser(null)
      setMessageForm({
        subject: '',
        content: ''
      })
    } catch (error: any) {
      console.error('Error sending message:', error)
      toast.error(error.response?.data?.error || 'Failed to send message')
    } finally {
      setSendingMessage(false)
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

  const tabs = [
    { id: 'approvals', label: 'Pending Approvals', icon: CheckCircle },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'messages', label: 'Messages', icon: Mail },
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">HR Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Welcome, {user?.name}! Manage approvals, users, and system settings.
            </p>
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
          {activeTab === 'approvals' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Pending HR Approvals</h2>
                <p className="text-sm text-gray-500">Review and approve timesheets that have been approved by managers</p>
              </div>
              <div className="p-6">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="text-gray-500 mt-2">Loading pending approvals...</p>
                  </div>
                ) : pendingApprovals.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No pending approvals</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingApprovals.map((timesheet) => (
                      <div key={timesheet.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">{timesheet.user.name}</h3>
                            <p className="text-sm text-gray-500">{timesheet.user.email}</p>
                            <p className="text-sm text-gray-600">
                              Period: {new Date(timesheet.periodStart).toLocaleDateString()} - {new Date(timesheet.periodEnd).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-600">Total Hours: {timesheet.totalHours}</p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleApprove(timesheet.id)}
                              className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                              <CheckCircle className="w-4 h-4 mr-1 inline" />
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                const note = prompt('Enter reason for denial:')
                                if (note) handleDeny(timesheet.id, note)
                              }}
                              className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                              <XCircle className="w-4 h-4 mr-1 inline" />
                              Deny
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">User Management</h2>
                    <p className="text-sm text-gray-500">Create and manage user accounts</p>
                  </div>
                  <button 
                    onClick={() => setShowAddUserModal(true)}
                    className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <Plus className="w-4 h-4 mr-1 inline" />
                    Add User
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="text-gray-500 mt-2">Loading users...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pay Rate</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredUsers.map((user) => (
                          <tr key={user.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                                user.role === 'HR' ? 'bg-blue-100 text-blue-800' :
                                user.role === 'MANAGER' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(user.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.manager?.name || 'None'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${user.payRate}/hr
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button 
                                  onClick={() => window.open(`/hr/users/${user.id}`, '_blank')}
                                  className="text-purple-600 hover:text-purple-900"
                                  title="View Metrics"
                                >
                                  <BarChart3 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleEditUser(user)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Edit User"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleSendMessage(user)}
                                  className="text-green-600 hover:text-green-900"
                                  title="Send Message"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleSuspendUser(user.id, user.name, user.status)}
                                  className="text-orange-600 hover:text-orange-900"
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
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Reports & Export</h2>
                <p className="text-sm text-gray-500">Generate and export timesheet reports</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">Export All Timesheets</h3>
                    <p className="text-sm text-gray-500 mb-4">Download all timesheet data for payroll processing</p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => exportReports('csv')}
                        className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <Download className="w-4 h-4 mr-1 inline" />
                        Export CSV
                      </button>
                      <button
                        onClick={() => exportReports('pdf')}
                        className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <Download className="w-4 h-4 mr-1 inline" />
                        Export PDF
                      </button>
                    </div>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">Custom Reports</h3>
                    <p className="text-sm text-gray-500 mb-4">Filter and export specific timesheet data</p>
                    <button className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
                      <Filter className="w-4 h-4 mr-1 inline" />
                      Create Custom Report
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Messages</h2>
                <p className="text-sm text-gray-500">View and manage internal messages</p>
              </div>
              <div className="p-6">
                <div className="text-center py-8">
                  <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Message center coming soon...</p>
                  <p className="text-sm text-gray-400 mt-2">You can send messages to users from the User Management tab</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">System Settings</h2>
                <p className="text-sm text-gray-500">Configure notifications, backups, and system preferences</p>
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Email Notifications</h3>
                    <div className="space-y-4">
                      <label className="flex items-center">
                        <input type="checkbox" className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                        <span className="ml-2 text-sm text-gray-700">Enable email notifications globally</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                        <span className="ml-2 text-sm text-gray-700">Send notifications on timesheet submission</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                        <span className="ml-2 text-sm text-gray-700">Send notifications on approval/denial</span>
                      </label>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Backup Settings</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Backup Frequency</label>
                        <select className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500">
                          <option>Daily at 2:00 AM</option>
                          <option>Weekly on Sunday</option>
                          <option>Monthly on 1st</option>
                        </select>
                      </div>
                      <button className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
                        Trigger Manual Backup
                      </button>
                    </div>
                  </div>
                </div>
              </div>
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Add New User</h3>
                <button
                  onClick={() => setShowAddUserModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    value={addUserForm.email}
                    onChange={(e) => setAddUserForm({ ...addUserForm, email: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    required
                    value={addUserForm.name}
                    onChange={(e) => setAddUserForm({ ...addUserForm, name: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    value={addUserForm.role}
                    onChange={(e) => setAddUserForm({ ...addUserForm, role: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="STAFF">Staff</option>
                    <option value="MANAGER">Manager</option>
                    <option value="HR">HR</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                {addUserForm.role === 'STAFF' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Manager</label>
                    <select
                      value={addUserForm.managerId}
                      onChange={(e) => setAddUserForm({ ...addUserForm, managerId: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Select Manager (Optional)</option>
                      {managers.map((manager) => (
                        <option key={manager.id} value={manager.id}>
                          {manager.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Pay Rate ($/hour)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={addUserForm.payRate}
                    onChange={(e) => setAddUserForm({ ...addUserForm, payRate: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={addUserForm.password}
                    onChange={(e) => setAddUserForm({ ...addUserForm, password: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddUserModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingUser}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {addingUser ? 'Creating...' : 'Create User'}
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Edit User</h3>
                <button
                  onClick={() => setShowEditUserModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    value={editUserForm.email}
                    onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editUserForm.name}
                    onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    value={editUserForm.role}
                    onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="STAFF">Staff</option>
                    <option value="MANAGER">Manager</option>
                    <option value="HR">HR</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={editUserForm.status}
                    onChange={(e) => setEditUserForm({ ...editUserForm, status: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>

                {editUserForm.role === 'STAFF' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Manager</label>
                    <select
                      value={editUserForm.managerId}
                      onChange={(e) => setEditUserForm({ ...editUserForm, managerId: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Select Manager (Optional)</option>
                      {managers.map((manager) => (
                        <option key={manager.id} value={manager.id}>
                          {manager.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Pay Rate ($/hour)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editUserForm.payRate}
                    onChange={(e) => setEditUserForm({ ...editUserForm, payRate: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">New Password (leave blank to keep current)</label>
                  <input
                    type="password"
                    minLength={6}
                    value={editUserForm.password}
                    onChange={(e) => setEditUserForm({ ...editUserForm, password: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditUserModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingUser}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {updatingUser ? 'Updating...' : 'Update User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Send Message Modal */}
      {showMessageModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowMessageModal(false)} />

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Send Message to {selectedUser.name}</h3>
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmitMessage} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Subject</label>
                  <input
                    type="text"
                    required
                    value={messageForm.subject}
                    onChange={(e) => setMessageForm({ ...messageForm, subject: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter message subject"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Message</label>
                  <textarea
                    required
                    rows={4}
                    value={messageForm.content}
                    onChange={(e) => setMessageForm({ ...messageForm, content: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter your message"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowMessageModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingMessage}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {sendingMessage ? 'Sending...' : 'Send Message'}
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