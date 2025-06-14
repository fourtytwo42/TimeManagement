'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'react-toastify'
import { apiClient } from '@/lib/api-client'
import { TimesheetWithEntries } from '@/lib/timesheet'
import TimesheetGrid from '@/components/TimesheetGrid'
import TimesheetComments from '@/components/TimesheetComments'
import SignatureModal from '@/components/SignatureModal'
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Download, 
  Mail, 
  Printer,
  FileText,
  Clock,
  User,
  UserCheck,
  Calendar
} from 'lucide-react'
import { format } from 'date-fns'

export default function HRTimesheetDetailPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const timesheetId = params?.id as string

  const [timesheet, setTimesheet] = useState<TimesheetWithEntries | null>(null)
  const [loading, setLoading] = useState(true)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [showDenialModal, setShowDenialModal] = useState(false)
  const [denialNote, setDenialNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user || (user.role !== 'HR' && user.role !== 'ADMIN')) {
      router.push('/hr')
      return
    }
    fetchTimesheet()
  }, [user, timesheetId, router])

  const fetchTimesheet = async () => {
    try {
      const data = await apiClient.get(`/api/timesheet/${timesheetId}`)
      setTimesheet(data)
    } catch (error) {
      console.error('Error fetching timesheet:', error)
      toast.error('Failed to load timesheet')
      router.push('/hr')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (signature: string) => {
    setSubmitting(true)
    try {
      await apiClient.post(`/api/timesheet/${timesheetId}/hr-approve`, { signature })
      toast.success('Timesheet approved successfully')
      setShowApprovalModal(false)
      fetchTimesheet()
    } catch (error) {
      console.error('Error approving timesheet:', error)
      toast.error('Failed to approve timesheet')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeny = async () => {
    if (!denialNote.trim()) {
      toast.error('Please provide a reason for denial')
      return
    }

    setSubmitting(true)
    try {
      await apiClient.post(`/api/timesheet/${timesheetId}/hr-deny`, { note: denialNote })
      toast.success('Timesheet denied and returned to staff')
      setShowDenialModal(false)
      setDenialNote('')
      fetchTimesheet()
    } catch (error) {
      console.error('Error denying timesheet:', error)
      toast.error('Failed to deny timesheet')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleEmailReport = () => {
    toast.info('Email functionality coming soon')
  }

  const handleSavePDF = () => {
    toast.info('PDF export functionality coming soon')
  }

  const calculateTotalHours = () => {
    if (!timesheet) return 0
    return timesheet.entries.reduce((total, entry) => {
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
      return total + dailyHours
    }, 0)
  }

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'PENDING_STAFF': return 'text-yellow-600 bg-yellow-100'
      case 'PENDING_MANAGER': return 'text-blue-600 bg-blue-100'
      case 'PENDING_HR': return 'text-purple-600 bg-purple-100'
      case 'APPROVED': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusText = (state: string) => {
    switch (state) {
      case 'PENDING_STAFF': return 'Pending Staff'
      case 'PENDING_MANAGER': return 'Pending Manager'
      case 'PENDING_HR': return 'Pending HR'
      case 'APPROVED': return 'Approved'
      default: return state
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!timesheet) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Timesheet not found</h2>
          <button
            onClick={() => router.push('/hr')}
            className="mt-4 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            Back to HR Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => router.push('/hr')}
                  className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Timesheet Review</h1>
                  <p className="text-gray-600 mt-1">
                    {timesheet.user.name} • {format(timesheet.periodStart, 'MMM d')} - {format(timesheet.periodEnd, 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handlePrint}
                  className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </button>
                <button
                  onClick={handleEmailReport}
                  className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </button>
                <button
                  onClick={handleSavePDF}
                  className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Save PDF
                </button>
              </div>
            </div>
          </div>

          {/* Status and Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <FileText className="w-8 h-8 text-primary-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <p className={`text-sm font-semibold px-2 py-1 rounded-full ${getStatusColor(timesheet.state)}`}>
                    {getStatusText(timesheet.state)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Hours</p>
                  <p className="text-2xl font-bold text-gray-900">{calculateTotalHours().toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <User className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Employee</p>
                  <p className="text-lg font-semibold text-gray-900">{timesheet.user.name}</p>
                  <p className="text-sm text-gray-500">{timesheet.user.email}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Calendar className="w-8 h-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Submitted</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {format(timesheet.updatedAt, 'MMM d, yyyy')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {format(timesheet.updatedAt, 'h:mm a')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Signature Status */}
          <div className="bg-white rounded-lg shadow mb-6 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Signature Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-3">
                {timesheet.staffSig ? <UserCheck className="w-6 h-6 text-green-600" /> : <User className="w-6 h-6 text-gray-400" />}
                <div>
                  <p className={`font-medium ${timesheet.staffSig ? 'text-green-600' : 'text-gray-400'}`}>
                    Staff {timesheet.staffSig ? 'Signed' : 'Unsigned'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {timesheet.managerSig ? <UserCheck className="w-6 h-6 text-green-600" /> : <User className="w-6 h-6 text-gray-400" />}
                <div>
                  <p className={`font-medium ${timesheet.managerSig ? 'text-green-600' : 'text-gray-400'}`}>
                    Manager {timesheet.managerSig ? 'Signed' : 'Unsigned'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {timesheet.hrSig ? <UserCheck className="w-6 h-6 text-green-600" /> : <User className="w-6 h-6 text-gray-400" />}
                <div>
                  <p className={`font-medium ${timesheet.hrSig ? 'text-green-600' : 'text-gray-400'}`}>
                    HR {timesheet.hrSig ? 'Signed' : 'Unsigned'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Timesheet Grid */}
          <div className="mb-6">
            <TimesheetGrid timesheet={timesheet} readOnly={true} />
          </div>

          {/* Comments Section */}
          <div className="mb-6">
            <TimesheetComments 
              timesheetId={timesheet.id} 
              readOnly={false}
              timesheet={timesheet}
            />
          </div>

          {/* Action Buttons for HR */}
          {timesheet.state === 'PENDING_HR' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">HR Actions</h3>
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowApprovalModal(true)}
                  className="bg-green-600 text-white px-6 py-3 rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <CheckCircle className="w-4 h-4 mr-2 inline" />
                  Approve Timesheet
                </button>
                <button
                  onClick={() => setShowDenialModal(true)}
                  className="bg-red-600 text-white px-6 py-3 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <XCircle className="w-4 h-4 mr-2 inline" />
                  Deny Timesheet
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Approval Modal */}
      <SignatureModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        onSave={handleApprove}
        title="HR Approval Signature"
        description="Please sign below to approve this timesheet."
      />

      {/* Denial Modal */}
      {showDenialModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowDenialModal(false)} />

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Deny Timesheet</h3>
                <p className="text-sm text-gray-500 mt-2">
                  Please provide a reason for denying this timesheet. It will be returned to the staff member for corrections.
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Denial
                </label>
                <textarea
                  value={denialNote}
                  onChange={(e) => setDenialNote(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter the reason for denial..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDenialModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeny}
                  disabled={submitting || !denialNote.trim()}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {submitting ? 'Denying...' : 'Deny Timesheet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 