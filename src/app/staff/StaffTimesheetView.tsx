'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import TimesheetGrid from '@/components/TimesheetGrid'
import TimesheetComments from '@/components/TimesheetComments'
import SignatureModal from '@/components/SignatureModal'
import TimesheetTemplates from '@/components/TimesheetTemplates'
import { TimesheetWithEntries } from '@/lib/timesheet'
import { apiClient } from '@/lib/api-client'
import { format } from 'date-fns'
import { Clock, CheckCircle, AlertCircle, FileText, ArrowLeft, Plus, Calendar, X, File } from 'lucide-react'

// Define timesheet states to avoid Prisma client issues
const TS_STATE = {
  PENDING_STAFF: 'PENDING_STAFF',
  PENDING_MANAGER: 'PENDING_MANAGER',
  PENDING_HR: 'PENDING_HR',
  APPROVED: 'APPROVED'
} as const

type TsState = typeof TS_STATE[keyof typeof TS_STATE]
type TabType = 'due' | 'submitted' | 'approved'

interface TimesheetSummary {
  id: string
  periodStart: string
  periodEnd: string
  state: TsState
  totalHours: number
  updatedAt: string
  staffSig?: string | null
  managerSig?: string | null
  hrSig?: string | null
  managerNote?: string | null
}

interface PayPeriod {
  start: Date | string
  end: Date | string
  label: string
  isCurrent: boolean
  isPast: boolean
  isFuture: boolean
  hasTimesheet: boolean
}

export default function StaffTimesheetView() {
  const [timesheets, setTimesheets] = useState<TimesheetSummary[]>([])
  const [selectedTimesheet, setSelectedTimesheet] = useState<TimesheetWithEntries | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('due')
  const [loading, setLoading] = useState(true)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [availablePeriods, setAvailablePeriods] = useState<PayPeriod[]>([])
  const [creatingTimesheet, setCreatingTimesheet] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')

  useEffect(() => {
    fetchTimesheets()
  }, [])

  const fetchTimesheets = async () => {
    setLoading(true)
    try {
      const data = await apiClient.get('/api/timesheet/user')
      setTimesheets(data)
    } catch (error) {
      console.error('Error fetching timesheets:', error)
      toast.error('Failed to load timesheets')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailablePeriods = async () => {
    try {
      const data = await apiClient.get('/api/timesheet/periods')
      setAvailablePeriods(data)
    } catch (error) {
      console.error('Error fetching available periods:', error)
      toast.error('Failed to load available pay periods')
    }
  }

  const fetchTimesheetDetails = async (timesheetId: string) => {
    try {
      const data = await apiClient.get(`/api/timesheet/${timesheetId}`)
      setSelectedTimesheet(data)
    } catch (error) {
      console.error('Error fetching timesheet details:', error)
      toast.error('Failed to load timesheet details')
    }
  }

  const handleSubmit = () => {
    setShowSignatureModal(true)
  }

  const handleSignatureSubmit = async (signature: string) => {
    if (!selectedTimesheet) return

    try {
      await apiClient.post(`/api/timesheet/${selectedTimesheet.id}/submit`, {
        signature
      })

      toast.success('Timesheet submitted successfully!')
      setShowSignatureModal(false)
      setSelectedTimesheet(null)
      fetchTimesheets()
    } catch (error: any) {
      console.error('Error submitting timesheet:', error)
      toast.error(error.response?.data?.error || 'Failed to submit timesheet')
    }
  }

  const handleCreateTimesheet = async (period: PayPeriod) => {
    setCreatingTimesheet(true)
    try {
      // Ensure dates are properly converted to Date objects if they're strings
      const startDate = period.start instanceof Date ? period.start : new Date(period.start)
      const endDate = period.end instanceof Date ? period.end : new Date(period.end)
      
      const newTimesheet = await apiClient.post('/api/timesheet', {
        periodStart: startDate.toISOString(),
        periodEnd: endDate.toISOString()
      })

      toast.success('New timesheet created successfully!')
      setShowCreateModal(false)
      fetchTimesheets()
      
      // Automatically open the new timesheet
      setSelectedTimesheet(newTimesheet)
    } catch (error: any) {
      console.error('Error creating timesheet:', error)
      toast.error(error.response?.data?.error || 'Failed to create timesheet')
    } finally {
      setCreatingTimesheet(false)
    }
  }

  const handleShowCreateModal = () => {
    setShowCreateModal(true)
    fetchAvailablePeriods()
  }

  const handleCreateTemplateFromTimesheet = (timesheetId: string) => {
    setShowCreateTemplateModal(true)
    setTemplateName('')
    setTemplateDescription('')
  }

  const handleSaveTemplate = async () => {
    if (!selectedTimesheet || !templateName.trim()) {
      toast.error('Template name is required')
      return
    }

    try {
      await apiClient.post('/api/timesheet/templates', {
        name: templateName.trim(),
        description: templateDescription.trim() || null,
        timesheetId: selectedTimesheet.id,
        isDefault: false
      })

      toast.success('Template created successfully!')
      setShowCreateTemplateModal(false)
      setTemplateName('')
      setTemplateDescription('')
    } catch (error: any) {
      console.error('Error creating template:', error)
      toast.error(error.response?.data?.error || 'Failed to create template')
    }
  }

  const handleTemplateApplied = () => {
    if (selectedTimesheet) {
      fetchTimesheetDetails(selectedTimesheet.id)
    }
  }

  const getStatusBadge = (state: TsState, hasManagerNote?: boolean) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    
    if (state === TS_STATE.PENDING_STAFF) {
      if (hasManagerNote) {
        return (
          <span className={`${baseClasses} bg-red-100 text-red-800 border border-red-200`}>
            <AlertCircle className="w-3 h-3 mr-1" />
            Returned - Action Required
          </span>
        )
      }
      return (
        <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>
          <Clock className="w-3 h-3 mr-1" />
          Draft
        </span>
      )
    }
    
    switch (state) {
      case TS_STATE.PENDING_MANAGER:
        return (
          <span className={`${baseClasses} bg-blue-100 text-blue-800`}>
            <Clock className="w-3 h-3 mr-1" />
            Pending Manager
          </span>
        )
      case TS_STATE.PENDING_HR:
        return (
          <span className={`${baseClasses} bg-purple-100 text-purple-800`}>
            <Clock className="w-3 h-3 mr-1" />
            Pending HR
          </span>
        )
      case TS_STATE.APPROVED:
        return (
          <span className={`${baseClasses} bg-green-100 text-green-800`}>
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </span>
        )
      default:
        return (
          <span className={`${baseClasses} bg-gray-100 text-gray-800`}>
            {state}
          </span>
        )
    }
  }

  const getFilteredTimesheets = () => {
    switch (activeTab) {
      case 'due':
        return timesheets.filter(ts => ts.state === TS_STATE.PENDING_STAFF)
      case 'submitted':
        return timesheets.filter(ts => 
          ts.state === TS_STATE.PENDING_MANAGER || ts.state === TS_STATE.PENDING_HR
        )
      case 'approved':
        return timesheets.filter(ts => ts.state === TS_STATE.APPROVED)
      default:
        return []
    }
  }

  const getTabIcon = (tab: TabType) => {
    switch (tab) {
      case 'due':
        return Clock
      case 'submitted':
        return FileText
      case 'approved':
        return CheckCircle
      default:
        return Clock
    }
  }

  const getTabCount = (tab: TabType) => {
    switch (tab) {
      case 'due':
        return timesheets.filter(ts => ts.state === TS_STATE.PENDING_STAFF).length
      case 'submitted':
        return timesheets.filter(ts => 
          ts.state === TS_STATE.PENDING_MANAGER || ts.state === TS_STATE.PENDING_HR
        ).length
      case 'approved':
        return timesheets.filter(ts => ts.state === TS_STATE.APPROVED).length
      default:
        return 0
    }
  }

  if (selectedTimesheet) {
    const isReadOnly = selectedTimesheet.state !== TS_STATE.PENDING_STAFF
    const canSubmit = selectedTimesheet.state === TS_STATE.PENDING_STAFF && !selectedTimesheet.staffSig

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSelectedTimesheet(null)}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Timesheets
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Timesheet: {format(new Date(selectedTimesheet.periodStart), 'MMM dd')} - {format(new Date(selectedTimesheet.periodEnd), 'MMM dd, yyyy')}
              </h1>
              <div className="flex items-center space-x-4 mt-2">
                {getStatusBadge(selectedTimesheet.state as TsState, !!selectedTimesheet.managerNote)}
                <span className="text-sm text-gray-500">
                  Last updated: {format(new Date(selectedTimesheet.updatedAt), 'MMM dd, yyyy h:mm a')}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <File className="w-4 h-4 mr-2" />
              Templates
            </button>
            {canSubmit && (
              <button
                onClick={handleSubmit}
                className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
              >
                Submit Timesheet
              </button>
            )}
          </div>
        </div>

        {/* Manager Feedback Alert */}
        {selectedTimesheet.managerNote && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800 mb-1">Manager Feedback</h3>
                <p className="text-sm text-red-700">{selectedTimesheet.managerNote}</p>
              </div>
            </div>
          </div>
        )}

        {/* Templates Section */}
        {showTemplates && (
          <TimesheetTemplates
            timesheetId={selectedTimesheet.id}
            onTemplateApplied={handleTemplateApplied}
            onCreateFromTimesheet={handleCreateTemplateFromTimesheet}
            className="mb-6"
          />
        )}

        {/* Timesheet Grid */}
        <TimesheetGrid 
          timesheet={selectedTimesheet} 
          readOnly={isReadOnly}
          onEntryUpdate={(entryId, data) => {
            // Refresh timesheet data after update
            fetchTimesheetDetails(selectedTimesheet.id)
          }}
        />

        {/* Comments Section */}
        <TimesheetComments 
          timesheetId={selectedTimesheet.id} 
          readOnly={isReadOnly}
          timesheet={selectedTimesheet}
        />

        {/* Signature Modal */}
        <SignatureModal
          isOpen={showSignatureModal}
          onClose={() => setShowSignatureModal(false)}
          onSave={handleSignatureSubmit}
          title="Submit Timesheet"
          description="Please sign below to submit your timesheet for approval."
        />

        {/* Create Template Modal */}
        {showCreateTemplateModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div 
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
                onClick={() => setShowCreateTemplateModal(false)}
              />

              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                    <File className="w-5 h-5 mr-2" />
                    Save as Template
                  </h3>
                  <button
                    onClick={() => setShowCreateTemplateModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Create a template from this timesheet's time patterns. Templates ignore PLAWA hours and focus on time entries and day types (weekdays vs weekends).
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="e.g., Standard Work Week"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Optional description of this template"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowCreateTemplateModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveTemplate}
                    disabled={!templateName.trim()}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Timesheets</h1>
          <p className="text-gray-600 mt-2">Manage your timesheet submissions and track approval status</p>
        </div>
        <button
          onClick={handleShowCreateModal}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Timesheet
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {(['due', 'submitted', 'approved'] as TabType[]).map((tab) => {
            const Icon = getTabIcon(tab)
            const count = getTabCount(tab)
            const isActive = activeTab === tab
            
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {count > 0 && (
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    isActive 
                      ? 'bg-primary-100 text-primary-600' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading timesheets...</p>
          </div>
        ) : (
          <div className="p-6">
            {getFilteredTimesheets().length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No timesheets found for this category</p>
                {activeTab === 'due' && (
                  <button
                    onClick={handleShowCreateModal}
                    className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Create your first timesheet
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {getFilteredTimesheets().map((timesheet) => (
                  <div
                    key={timesheet.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:bg-primary-50 cursor-pointer transition-all duration-200"
                    onClick={() => fetchTimesheetDetails(timesheet.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-medium text-gray-900">
                            {format(new Date(timesheet.periodStart), 'MMM dd')} - {format(new Date(timesheet.periodEnd), 'MMM dd, yyyy')}
                          </h3>
                          {getStatusBadge(timesheet.state, !!timesheet.managerNote)}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>Total Hours: {timesheet.totalHours}</span>
                          <span>Updated: {format(new Date(timesheet.updatedAt), 'MMM dd, h:mm a')}</span>
                        </div>
                        {timesheet.managerNote && (
                          <div className="mt-2 text-sm text-red-600 flex items-center">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            Manager feedback available
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        {timesheet.staffSig && <span className="text-green-600">✓ Staff</span>}
                        {timesheet.managerSig && <span className="text-green-600">✓ Manager</span>}
                        {timesheet.hrSig && <span className="text-green-600">✓ HR</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Timesheet Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCreateModal(false)} />

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Create New Timesheet</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Select a pay period to create a new timesheet. You can only create timesheets for periods that don't already have one.
                </p>
              </div>

              <div className="max-h-96 overflow-y-auto">
                <div className="space-y-2">
                  {availablePeriods.map((period, index) => {
                    const isDisabled = period.hasTimesheet
                    const isPast = period.isPast && !period.isCurrent
                    
                    return (
                      <div
                        key={index}
                        className={`border rounded-lg p-4 transition-all ${
                          isDisabled 
                            ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
                            : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50 cursor-pointer'
                        }`}
                        onClick={() => !isDisabled && handleCreateTimesheet(period)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Calendar className={`w-5 h-5 ${isDisabled ? 'text-gray-400' : 'text-gray-600'}`} />
                            <div>
                              <div className={`font-medium ${isDisabled ? 'text-gray-400' : 'text-gray-900'}`}>
                                {period.label}
                              </div>
                              <div className="flex items-center space-x-2 mt-1">
                                {period.isCurrent && (
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Current Period
                                  </span>
                                )}
                                {isPast && (
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                    Past Period
                                  </span>
                                )}
                                {period.isFuture && (
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Future Period
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div>
                            {isDisabled ? (
                              <span className="text-sm text-gray-400">Already exists</span>
                            ) : (
                              <span className="text-sm text-primary-600">Click to create</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {creatingTimesheet && (
                <div className="mt-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Creating timesheet...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 