'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { TsState } from '@prisma/client'
import TimesheetGrid from '@/components/TimesheetGrid'
import TimesheetComments from '@/components/TimesheetComments'
import SignatureModal from '@/components/SignatureModal'
import { TimesheetWithEntries } from '@/lib/timesheet'
import ChatWindow from '@/components/ChatWindow'
import { apiClient } from '@/lib/api-client'

export default function StaffTimesheetView() {
  const [timesheet, setTimesheet] = useState<TimesheetWithEntries | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showSignatureModal, setShowSignatureModal] = useState(false)

  useEffect(() => {
    fetchCurrentTimesheet()
  }, [])

  const fetchCurrentTimesheet = async () => {
    try {
      const data = await apiClient.get('/api/timesheet/current')
      setTimesheet(data)
    } catch (error) {
      console.error('Error fetching timesheet:', error)
      toast.error('Failed to load timesheet')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = () => {
    if (!timesheet) return
    setShowSignatureModal(true)
  }

  const handleSignatureSubmit = async (signature: string) => {
    if (!timesheet) return

    setSubmitting(true)
    try {
      const result = await apiClient.post(`/api/timesheet/${timesheet.id}/submit`, { signature })
      toast.success('Timesheet submitted successfully!')
      
      // Refresh the timesheet to show updated state
      await fetchCurrentTimesheet()
    } catch (error) {
      console.error('Error submitting timesheet:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to submit timesheet')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (state: TsState) => {
    const badges = {
      [TsState.PENDING_STAFF]: 'bg-yellow-100 text-yellow-800',
      [TsState.PENDING_MANAGER]: 'bg-blue-100 text-blue-800',
      [TsState.PENDING_HR]: 'bg-purple-100 text-purple-800',
      [TsState.APPROVED]: 'bg-green-100 text-green-800',
    }

    const labels = {
      [TsState.PENDING_STAFF]: 'Draft',
      [TsState.PENDING_MANAGER]: 'Pending Manager Approval',
      [TsState.PENDING_HR]: 'Pending HR Approval',
      [TsState.APPROVED]: 'Approved',
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badges[state]}`}>
        {labels[state]}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!timesheet) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Timesheet Found
          </h3>
          <p className="text-gray-600">
            Unable to load your current timesheet. Please try refreshing the page.
          </p>
          <button
            onClick={fetchCurrentTimesheet}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const canEdit = timesheet.state === TsState.PENDING_STAFF
  const canSubmit = timesheet.state === TsState.PENDING_STAFF

  return (
    <div className="space-y-6">
      {/* Status and Actions */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Current Timesheet
            </h2>
            <div className="flex items-center space-x-4">
              <div>Status: {getStatusBadge(timesheet.state)}</div>
              {timesheet.staffSig && (
                <div className="text-sm text-gray-500">
                  Submitted: {new Date(timesheet.updatedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
          
          {canSubmit && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Sign & Submit'}
            </button>
          )}
        </div>
        
        {!canEdit && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              This timesheet has been submitted and can no longer be edited. 
              {timesheet.state === TsState.PENDING_MANAGER && ' It is currently awaiting manager approval.'}
              {timesheet.state === TsState.PENDING_HR && ' It is currently awaiting HR approval.'}
              {timesheet.state === TsState.APPROVED && ' It has been approved.'}
            </p>
          </div>
        )}
      </div>

      {/* Timesheet Grid */}
      <TimesheetGrid 
        timesheet={timesheet}
        readOnly={!canEdit}
        onEntryUpdate={() => {
          // Optionally refresh timesheet data
        }}
      />

      {/* Timesheet Comments Section */}
      <TimesheetComments 
        timesheetId={timesheet.id}
        readOnly={false}
      />

      {/* Signature Modal */}
      <SignatureModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSave={handleSignatureSubmit}
        title="Submit Timesheet"
        description="Please provide your digital signature to submit this timesheet for approval."
      />
    </div>
  )
} 