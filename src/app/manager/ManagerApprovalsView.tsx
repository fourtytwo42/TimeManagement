'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { format } from 'date-fns'
import TimesheetGrid from '@/components/TimesheetGrid'
import TimesheetComments from '@/components/TimesheetComments'
import SignatureModal from '@/components/SignatureModal'
import { TimesheetWithEntries } from '@/lib/timesheet'
import { calculatePeriodTotal } from '@/lib/utils'
import ChatWindow from '@/components/ChatWindow'
import { apiClient } from '@/lib/api-client'

export default function ManagerApprovalsView() {
  const [pendingTimesheets, setPendingTimesheets] = useState<TimesheetWithEntries[]>([])
  const [selectedTimesheet, setSelectedTimesheet] = useState<TimesheetWithEntries | null>(null)
  const [loading, setLoading] = useState(true)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [showDenialModal, setShowDenialModal] = useState(false)
  const [denialNote, setDenialNote] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchPendingApprovals()
  }, [])

  const fetchPendingApprovals = async () => {
    try {
      const data = await apiClient.get('/api/manager/pending-approvals')
      setPendingTimesheets(data)
    } catch (error) {
      console.error('Error fetching pending approvals:', error)
      toast.error('Failed to load pending approvals')
    } finally {
      setLoading(false)
    }
  }

  const handleTimesheetClick = async (timesheet: TimesheetWithEntries) => {
    try {
      // Fetch the full timesheet data with all entries
      const fullTimesheet = await apiClient.get(`/api/timesheet/${timesheet.id}`)
      setSelectedTimesheet(fullTimesheet)
    } catch (error) {
      console.error('Error fetching timesheet details:', error)
      toast.error('Failed to load timesheet details')
    }
  }

  const handleApprove = () => {
    if (!selectedTimesheet) return
    setShowApprovalModal(true)
  }

  const handleDeny = () => {
    if (!selectedTimesheet) return
    setDenialNote('')
    setShowDenialModal(true)
  }

  const handleApprovalSubmit = async (signature: string) => {
    if (!selectedTimesheet) return

    setProcessing(true)
    try {
      await apiClient.post(`/api/timesheet/${selectedTimesheet.id}/approve`, { signature })
      toast.success('Timesheet approved successfully!')
      await fetchPendingApprovals()
      setSelectedTimesheet(null)
      setShowApprovalModal(false)
    } catch (error) {
      console.error('Error approving timesheet:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to approve timesheet')
    } finally {
      setProcessing(false)
    }
  }

  const handleDenialSubmit = async () => {
    if (!selectedTimesheet || !denialNote.trim()) return

    setProcessing(true)
    try {
      await apiClient.post(`/api/timesheet/${selectedTimesheet.id}/deny`, { 
        note: denialNote.trim() 
      })
      toast.success('Timesheet denied and returned to staff')
      await fetchPendingApprovals()
      setSelectedTimesheet(null)
      setShowDenialModal(false)
    } catch (error) {
      console.error('Error denying timesheet:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to deny timesheet')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600'></div>
      </div>
    )
  }

  if (pendingTimesheets.length === 0) {
    return (
      <div className='bg-white shadow rounded-lg p-6'>
        <div className='text-center'>
          <h3 className='text-lg font-medium text-gray-900 mb-2'>
            No Pending Approvals
          </h3>
          <p className='text-gray-600'>
            All timesheets from your direct reports have been reviewed.
          </p>
          <button
            onClick={fetchPendingApprovals}
            className='mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
          >
            Refresh
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Pending Approvals List */}
      {!selectedTimesheet && (
        <div className='bg-white shadow rounded-lg overflow-hidden'>
          <div className='px-6 py-4 border-b border-gray-200'>
            <h2 className='text-xl font-semibold text-gray-900'>
              Pending Approvals ({pendingTimesheets.length})
            </h2>
          </div>
          
          <div className='divide-y divide-gray-200'>
            {pendingTimesheets.map((timesheet) => {
              const totalHours = calculatePeriodTotal(timesheet.entries)
              
              return (
                <div 
                  key={timesheet.id} 
                  className='p-6 hover:bg-gray-50 cursor-pointer transition-colors'
                  onClick={() => handleTimesheetClick(timesheet)}
                >
                  <div className='flex items-center justify-between'>
                    <div className='flex-1'>
                      <div className='flex items-center space-x-4'>
                        <div>
                          <h3 className='text-lg font-medium text-gray-900'>
                            {timesheet.user.name}
                          </h3>
                          <p className='text-sm text-gray-500'>
                            {timesheet.user.email}
                          </p>
                        </div>
                        <div className='text-sm text-gray-600'>
                          <div>
                            Pay Period: {format(timesheet.periodStart, 'MMM d')} - {format(timesheet.periodEnd, 'MMM d, yyyy')}
                          </div>
                          <div>
                            Total Hours: <span className='font-medium'>{totalHours.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      <div className='mt-2 text-xs text-gray-500'>
                        Submitted: {format(new Date(timesheet.updatedAt), 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>
                    
                    <div className='text-gray-400'>
                      <span className='text-sm'>Click to review →</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Timesheet Detail View */}
      {selectedTimesheet && (
        <div className='space-y-4'>
          {/* Review Header with Actions */}
          <div className='bg-white shadow rounded-lg p-6'>
            <div className='flex items-center justify-between mb-4'>
              <div>
                <h3 className='text-lg font-medium text-gray-900'>
                  Review Timesheet - {selectedTimesheet.user.name}
                </h3>
                <p className='text-sm text-gray-500 mt-1'>
                  Pay Period: {format(selectedTimesheet.periodStart, 'MMM d')} - {format(selectedTimesheet.periodEnd, 'MMM d, yyyy')}
                </p>
              </div>
              <button
                onClick={() => setSelectedTimesheet(null)}
                className='text-gray-400 hover:text-gray-600 text-xl font-bold'
              >
                ✕
              </button>
            </div>
            
            {/* Action Buttons */}
            <div className='flex items-center space-x-3 pt-4 border-t border-gray-200'>
              <button
                onClick={handleDeny}
                disabled={processing}
                className='inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50'
              >
                Deny
              </button>
              <button
                onClick={handleApprove}
                disabled={processing}
                className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50'
              >
                Sign & Approve
              </button>
            </div>
          </div>
          
          <TimesheetGrid 
            timesheet={selectedTimesheet}
            readOnly={true}
          />

          <TimesheetComments 
            timesheetId={selectedTimesheet.id}
          />
        </div>
      )}

      {/* Approval Signature Modal */}
      <SignatureModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        onSave={handleApprovalSubmit}
        title='Approve Timesheet'
      />

      {/* Denial Modal */}
      {showDenialModal && (
        <div className='fixed inset-0 z-50 overflow-y-auto'>
          <div className='flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0'>
            <div 
              className='fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity'
              onClick={() => setShowDenialModal(false)}
            />

            <div className='inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6'>
              <div>
                <h3 className='text-lg leading-6 font-medium text-gray-900 mb-4'>
                  Deny Timesheet
                </h3>
                <p className='text-sm text-gray-500 mb-4'>
                  Please provide a reason for denying {selectedTimesheet?.user.name}'s timesheet. 
                  This will be sent back to the employee for corrections.
                </p>
                
                <textarea
                  value={denialNote}
                  onChange={(e) => setDenialNote(e.target.value)}
                  rows={4}
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                  placeholder='Enter reason for denial...'
                />
              </div>

              <div className='mt-5 sm:mt-4 sm:flex sm:flex-row-reverse'>
                <button
                  type='button'
                  onClick={handleDenialSubmit}
                  disabled={!denialNote.trim() || processing}
                  className='w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {processing ? 'Denying...' : 'Deny Timesheet'}
                </button>
                <button
                  type='button'
                  onClick={() => setShowDenialModal(false)}
                  className='mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm'
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 