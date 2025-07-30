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
import { ArrowLeft, CheckCircle, XCircle, Download, Mail, Printer, FileText, Clock, User, UserCheck, Calendar } from 'lucide-react'
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
    fetchEmailConfig()
  }, [user, timesheetId, router])

  const fetchTimesheet = async () => {
    try {
      const data = await apiClient.get(`/api/timesheet/${timesheetId}`)
      setTimesheet(data)
    } catch (error: any) {
      console.error('Error fetching timesheet:', error)
      
      // Only redirect on 404 or authorization errors
      if (error.response?.status === 404) {
        toast.error('Timesheet not found')
        router.push('/hr')
      } else if (error.response?.status === 403) {
        toast.error('Access denied')
        router.push('/hr')
      } else {
        // For other errors, show error but don't redirect
        toast.error('Failed to load timesheet. Please try again.')
        console.error('Timesheet fetch error details:', {
          status: error.response?.status,
          data: error.response?.data,
          timesheetId
        })
      }
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
    if (!timesheet) return
    
    // Calculate PLAWA hours
    const totalPlawaHours = timesheet.entries.reduce((total, entry) => total + (entry.plawaHours || 0), 0)
    
    // Store original title
    const originalTitle = document.title
    
    // Set custom title for print/PDF
    const periodStart = format(timesheet.periodStart, 'MMM d')
    const periodEnd = format(timesheet.periodEnd, 'MMM d, yyyy')
    document.title = `${timesheet.user.name} - ${periodStart} - ${periodEnd} - Hours ${calculateTotalHours().toFixed(2)} - PLAWA ${totalPlawaHours.toFixed(2)}`
    
    // Print
    window.print()
    
    // Restore original title after a short delay
    setTimeout(() => {
      document.title = originalTitle
    }, 1000)
  }

  const [emailConfig, setEmailConfig] = useState<any>(null)
  const [emailLoading, setEmailLoading] = useState(false)

  const handleEmailReport = () => {
    if (!emailConfig?.emailConfig?.isEnabled) {
      toast.error('Email is not configured')
      return
    }
    toast.info('Email functionality coming soon')
  }

  const fetchEmailConfig = async () => {
    try {
      setEmailLoading(true)
      const response = await apiClient.get('/api/settings/email')
      setEmailConfig(response)
    } catch (error) {
      console.error('Error fetching email config:', error)
      setEmailConfig(null)
    } finally {
      setEmailLoading(false)
    }
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
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600'></div>
      </div>
    )
  }

  if (!timesheet) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <h2 className='text-2xl font-bold text-gray-900'>Timesheet not found</h2>
          <button
            onClick={() => router.push('/hr')}
            className='mt-4 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700'
          >
            Back to HR Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50 print:min-h-0'>
      <div className='max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 print:py-0 print:px-0' id='timesheet-content'>
        <div className='px-4 py-6 sm:px-0'>
          {/* Header */}
          <div className='mb-6'>
            {/* Screen layout */}
            <div className='flex items-center justify-between print:hidden'>
              <div className='flex items-center'>
                <button
                  onClick={() => router.push('/hr')}
                  className='mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 no-print'
                >
                  <ArrowLeft className='w-5 h-5' />
                </button>
                <div>
                  <h1 className='text-3xl font-bold text-gray-900'>{timesheet.user.name}</h1>
                  <p className='text-gray-600 mt-1'>
                    {timesheet.user.name} • {format(timesheet.periodStart, 'MMM d')} - {format(timesheet.periodEnd, 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            
            {/* Action Buttons */}
            <div className='flex space-x-3'>
              <button
                onClick={handlePrint}
                className='flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50'
              >
                <Printer className='w-4 h-4 mr-2' />
                Print
              </button>
              <button
                onClick={handleEmailReport}
                disabled={emailLoading || !emailConfig?.emailConfig?.isEnabled}
                title={!emailConfig?.emailConfig?.isEnabled ? 'Email is not configured' : 'Send timesheet via email'}
                className={`flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium ${
                  emailLoading || !emailConfig?.emailConfig?.isEnabled
                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                    : 'text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                <Mail className='w-4 h-4 mr-2' />
                Email
              </button>
            </div>
            </div>
            
            {/* Print layout - Centered user name */}
            <div className='hidden print:block print:text-center print:w-full'>
              <h1 className='print:text-2xl print:font-bold print:text-black print:mb-4'>{timesheet.user.name}</h1>
            </div>
            
            {/* Print layout - Pay period and summary cards */}
                    <div className='hidden print:block print:mt-4'>
          <div className='print:text-center print:mb-3'>
            <p className='print:text-sm print:font-medium print:text-black'>
              Pay Period: {format(timesheet.periodStart, 'MMM d')} - {format(timesheet.periodEnd, 'MMM d, yyyy')}
            </p>
          </div>
          <div className='print:flex print:justify-center print:space-x-6 print:mb-4'>
            <div className='print:bg-gray-100 print:border print:border-gray-300 print:rounded-lg print:px-4 print:py-2 print:text-center'>
              <div className='print:text-xs print:font-bold print:text-black'>Total Hours</div>
              <div className='print:text-lg print:font-bold print:text-black'>{calculateTotalHours().toFixed(2)}</div>
            </div>
            <div className='print:bg-gray-100 print:border print:border-gray-300 print:rounded-lg print:px-4 print:py-2 print:text-center'>
              <div className='print:text-xs print:font-bold print:text-black'>PLAWA Hours</div>
              <div className='print:text-lg print:font-bold print:text-black'>{timesheet.entries.reduce((total, entry) => total + (entry.plawaHours || 0), 0).toFixed(2)}</div>
            </div>
          </div>
        </div>
          </div>

          {/* Action Buttons for HR */}
          {timesheet.state === 'PENDING_HR' && (
            <div className='flex items-center space-x-3 pt-4 border-t border-gray-200 print:hide-actions mb-6'>
              <button
                onClick={() => setShowDenialModal(true)}
                disabled={submitting}
                className='inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50'
              >
                <XCircle className='w-4 h-4 mr-2' />
                Deny
              </button>
              <button
                onClick={() => setShowApprovalModal(true)}
                disabled={submitting}
                className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50'
              >
                <CheckCircle className='w-4 h-4 mr-2' />
                Sign & Approve
              </button>
            </div>
          )}



          {/* Signature Status */}
          <div className='bg-white rounded-lg shadow mb-6 p-6 signatures-section print:shadow-none print:border print:border-gray-400'>
            <h3 className='text-lg font-medium text-gray-900 mb-4 print:text-base print:font-bold print:text-black'>Digital Signatures</h3>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6 print:flex print:flex-row print:gap-2 print:items-stretch print:h-32'>
              <div className='border rounded-lg p-4 signature-box print:border-gray-400 print:flex-1 print:min-w-0 print:relative print:p-2'>
                <div className='flex items-center space-x-3 mb-2 print:absolute print:top-1 print:left-2 print:z-10'>
                  {timesheet.staffSig ? <UserCheck className='w-6 h-6 text-green-600 print:hidden' /> : <User className='w-6 h-6 text-gray-400 print:hidden' />}
                  <div>
                    <p className={`font-medium ${timesheet.staffSig ? 'text-green-600' : 'text-gray-400'} print:text-black print:text-xs print:font-bold`}>
                      Staff Signature
                    </p>
                  </div>
                </div>
                {timesheet.staffSig ? (
                  <div className='mt-2 print:mt-0 print:h-full print:relative'>
                    <div className='bg-gray-50 p-2 rounded border print:bg-white print:border-gray-300 print:absolute print:top-6 print:left-2 print:right-2 print:bottom-4 print:flex print:items-center print:justify-center'>
                      <img 
                        src={timesheet.staffSig} 
                        alt='Staff Signature' 
                        className='max-h-16 w-auto print:max-h-16 print:w-auto'
                        style={{ filter: 'contrast(1.2)' }}
                      />
                    </div>
                    <div className='print:absolute print:bottom-1 print:left-2 print:right-2 print:bg-transparent print:text-center'>
                      <p className='text-xs text-gray-600 print:text-black print:text-xs print:m-0 print:font-bold print:leading-tight'>
                        By: {timesheet.user.name}
                      </p>
                      {timesheet.staffSigAt && (
                        <p className='text-xs text-gray-500 print:text-black print:text-xs print:m-0 print:font-bold print:leading-tight'>
                          {format(new Date(timesheet.staffSigAt), 'MMM d, yyyy h:mm a')}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className='print:h-full print:flex print:items-center print:justify-center print:mt-6'>
                    <p className='text-sm text-gray-400 mt-2 print:text-black print:text-center'>Not signed</p>
                  </div>
                )}
              </div>

              <div className='border rounded-lg p-4 signature-box print:border-gray-400 print:flex-1 print:min-w-0 print:relative print:p-2'>
                <div className='flex items-center space-x-3 mb-2 print:absolute print:top-1 print:left-2 print:z-10'>
                  {timesheet.managerSig ? <UserCheck className='w-6 h-6 text-green-600 print:hidden' /> : <User className='w-6 h-6 text-gray-400 print:hidden' />}
                  <div>
                    <p className={`font-medium ${timesheet.managerSig ? 'text-green-600' : 'text-gray-400'} print:text-black print:text-xs print:font-bold`}>
                      Manager Signature
                    </p>
                  </div>
                </div>
                {timesheet.managerSig ? (
                  <div className='mt-2 print:mt-0 print:h-full print:relative'>
                    <div className='bg-gray-50 p-2 rounded border print:bg-white print:border-gray-300 print:absolute print:top-6 print:left-2 print:right-2 print:bottom-4 print:flex print:items-center print:justify-center'>
                      <img 
                        src={timesheet.managerSig} 
                        alt='Manager Signature' 
                        className='max-h-16 w-auto print:max-h-16 print:w-auto'
                        style={{ filter: 'contrast(1.2)' }}
                      />
                    </div>
                    <div className='print:absolute print:bottom-1 print:left-2 print:right-2 print:bg-transparent print:text-center'>
                      <p className='text-xs text-gray-600 print:text-black print:text-xs print:m-0 print:font-bold print:leading-tight'>
                        By: Manager
                      </p>
                      {timesheet.managerSigAt && (
                        <p className='text-xs text-gray-500 print:text-black print:text-xs print:m-0 print:font-bold print:leading-tight'>
                          {format(new Date(timesheet.managerSigAt), 'MMM d, yyyy h:mm a')}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className='print:h-full print:flex print:items-center print:justify-center print:mt-6'>
                    <p className='text-sm text-gray-400 mt-2 print:text-black print:text-center'>Not signed</p>
                  </div>
                )}
              </div>

              <div className='border rounded-lg p-4 signature-box print:border-gray-400 print:flex-1 print:min-w-0 print:relative print:p-2'>
                <div className='flex items-center space-x-3 mb-2 print:absolute print:top-1 print:left-2 print:z-10'>
                  {timesheet.hrSig ? <UserCheck className='w-6 h-6 text-green-600 print:hidden' /> : <User className='w-6 h-6 text-gray-400 print:hidden' />}
                  <div>
                    <p className={`font-medium ${timesheet.hrSig ? 'text-green-600' : 'text-gray-400'} print:text-black print:text-xs print:font-bold`}>
                      HR Signature
                    </p>
                  </div>
                </div>
                {timesheet.hrSig ? (
                  <div className='mt-2 print:mt-0 print:h-full print:relative'>
                    <div className='bg-gray-50 p-2 rounded border print:bg-white print:border-gray-300 print:absolute print:top-6 print:left-2 print:right-2 print:bottom-4 print:flex print:items-center print:justify-center'>
                      <img 
                        src={timesheet.hrSig} 
                        alt='HR Signature' 
                        className='max-h-16 w-auto print:max-h-16 print:w-auto'
                        style={{ filter: 'contrast(1.2)' }}
                      />
                    </div>
                    <div className='print:absolute print:bottom-1 print:left-2 print:right-2 print:bg-transparent print:text-center'>
                      <p className='text-xs text-gray-600 print:text-black print:text-xs print:m-0 print:font-bold print:leading-tight'>
                        By: {user?.name}
                      </p>
                      {timesheet.hrSigAt && (
                        <p className='text-xs text-gray-500 print:text-black print:text-xs print:m-0 print:font-bold print:leading-tight'>
                          {format(new Date(timesheet.hrSigAt), 'MMM d, yyyy h:mm a')}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className='print:h-full print:flex print:items-center print:justify-center print:mt-6'>
                    <p className='text-sm text-gray-400 mt-2 print:text-black print:text-center'>Not signed</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Timesheet Grid */}
          <div className='mb-6'>
            <TimesheetGrid timesheet={timesheet} readOnly={true} />
          </div>

          {/* Comments Section */}
          <div className='mb-6 print:hidden'>
            <TimesheetComments 
              timesheetId={timesheet.id} 
            />
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      <SignatureModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        onSave={handleApprove}
        title='HR Approval Signature'
      />

      {/* Denial Modal */}
      {showDenialModal && (
        <div className='fixed inset-0 z-50 overflow-y-auto'>
          <div className='flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0'>
            <div className='fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity' onClick={() => setShowDenialModal(false)} />

            <div className='inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6'>
              <div className='mb-4'>
                <h3 className='text-lg leading-6 font-medium text-gray-900'>Deny Timesheet</h3>
                <p className='text-sm text-gray-500 mt-2'>
                  Please provide a reason for denying this timesheet. It will be returned to the staff member for corrections.
                </p>
              </div>

              <div className='mb-4'>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Reason for Denial
                </label>
                <textarea
                  value={denialNote}
                  onChange={(e) => setDenialNote(e.target.value)}
                  rows={4}
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500'
                  placeholder='Enter the reason for denial...'
                />
              </div>

              <div className='flex justify-end space-x-3'>
                <button
                  onClick={() => setShowDenialModal(false)}
                  className='px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50'
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeny}
                  disabled={submitting || !denialNote.trim()}
                  className='px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50'
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