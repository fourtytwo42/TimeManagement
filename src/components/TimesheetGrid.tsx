'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { format, isWeekend } from 'date-fns'
import { toast } from 'react-toastify'
import { calculateDailyHours, calculatePeriodTotal, formatTime, parseTimeString } from '@/lib/utils'
import { TimesheetWithEntries } from '@/lib/timesheet'
import { apiClient } from '@/lib/api-client'
import { CheckCircle, MessageSquare, ChevronDown, ChevronRight, User, UserCheck, Clock, X } from 'lucide-react'

interface TimesheetGridProps {
  timesheet: TimesheetWithEntries
  onEntryUpdate?: (entryId: string, data: any) => void
  readOnly?: boolean
}

interface TimeEntry {
  id: string
  date: Date
  in1?: Date | null
  out1?: Date | null
  in2?: Date | null
  out2?: Date | null
  in3?: Date | null
  out3?: Date | null
  plawaHours: number
  comments?: string | null
}

interface TimePickerState {
  isOpen: boolean
  entryId: string
  field: string
  currentValue: Date | null
  hour: string
  minute: string
  ampm: string
}

export default function TimesheetGrid({ timesheet, onEntryUpdate, readOnly = false }: TimesheetGridProps) {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [timePicker, setTimePicker] = useState<TimePickerState>({
    isOpen: false,
    entryId: '',
    field: '',
    currentValue: null,
    hour: '12',
    minute: '00',
    ampm: 'AM'
  })
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map())

  useEffect(() => {
    // Convert timesheet entries to proper Date objects
    const convertedEntries = timesheet.entries.map(entry => ({
      ...entry,
      date: new Date(entry.date),
      in1: entry.in1 ? new Date(entry.in1) : null,
      out1: entry.out1 ? new Date(entry.out1) : null,
      in2: entry.in2 ? new Date(entry.in2) : null,
      out2: entry.out2 ? new Date(entry.out2) : null,
      in3: entry.in3 ? new Date(entry.in3) : null,
      out3: entry.out3 ? new Date(entry.out3) : null,
    }))
    setEntries(convertedEntries)
  }, [timesheet.entries])

  const updateEntry = async (entryId: string, field: string, value: string | number | null) => {
    if (readOnly) return

    setIsUpdating(entryId)
    
    try {
      const entry = entries.find(e => e.id === entryId)
      if (!entry) return

      let updateData: any = {}
      
      if (field === 'plawaHours') {
        updateData.plawaHours = Number(value)
      } else if (field === 'comments') {
        updateData.comments = value as string
      } else {
        // Handle time fields - ONLY update the specific field
        if (value === '' || value === null) {
          updateData[field] = null
        } else {
          const timeDate = parseTimeString(value as string, entry.date)
          updateData[field] = timeDate.toISOString()
        }
      }

      const updatedEntry = await apiClient.patch(`/api/timesheet/${timesheet.id}/entry/${entryId}`, updateData)
      
      // Update local state with proper date conversion
      setEntries(prev => prev.map(e => {
        if (e.id === entryId) {
          const updatedFields: any = {}
          
          if (field === 'plawaHours') {
            updatedFields.plawaHours = Number(value)
          } else if (field === 'comments') {
            updatedFields.comments = value as string
          } else {
            // Only update the specific time field
            if (value === '' || value === null) {
              updatedFields[field] = null
            } else {
              updatedFields[field] = parseTimeString(value as string, e.date)
            }
          }
          
          return { ...e, ...updatedFields }
        }
        return e
      }))

      if (onEntryUpdate) {
        onEntryUpdate(entryId, updatedEntry)
      }

      toast.success('Entry updated')
    } catch (error) {
      console.error('Error updating entry:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update entry')
    } finally {
      setIsUpdating(null)
    }
  }

  const handlePlawaHoursChange = (entryId: string, value: string) => {
    // Update local state immediately for responsive UI
    setEntries(prev => prev.map(e => 
      e.id === entryId ? { ...e, plawaHours: parseFloat(value) || 0 } : e
    ))
    
    // Clear existing timer for this entry
    const existingTimer = debounceTimers.current.get(`${entryId}-plawa`)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }
    
    // Set new timer for debounced API call
    const newTimer = setTimeout(() => {
      updateEntry(entryId, 'plawaHours', value)
      debounceTimers.current.delete(`${entryId}-plawa`)
    }, 1000) // Wait 1 second after user stops typing
    
    debounceTimers.current.set(`${entryId}-plawa`, newTimer)
  }

  const handleCommentsChange = (entryId: string, value: string) => {
    // Update local state immediately for responsive UI
    setEntries(prev => prev.map(e => 
      e.id === entryId ? { ...e, comments: value } : e
    ))
    
    // Clear existing timer for this entry
    const existingTimer = debounceTimers.current.get(`${entryId}-comments`)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }
    
    // Set new timer for debounced API call
    const newTimer = setTimeout(() => {
      updateEntry(entryId, 'comments', value)
      debounceTimers.current.delete(`${entryId}-comments`)
    }, 1000) // Wait 1 second after user stops typing
    
    debounceTimers.current.set(`${entryId}-comments`, newTimer)
  }

  const openTimePicker = (entryId: string, field: string, currentValue: Date | null) => {
    if (readOnly) return
    
    let hour = '12'
    let minute = '00'
    let ampm = 'AM'
    
    if (currentValue) {
      const hours24 = currentValue.getHours()
      const minutes = currentValue.getMinutes()
      
      if (hours24 === 0) {
        hour = '12'
        ampm = 'AM'
      } else if (hours24 < 12) {
        hour = hours24.toString().padStart(2, '0')
        ampm = 'AM'
      } else if (hours24 === 12) {
        hour = '12'
        ampm = 'PM'
      } else {
        hour = (hours24 - 12).toString().padStart(2, '0')
        ampm = 'PM'
      }
      
      minute = minutes.toString().padStart(2, '0')
    }
    
    setTimePicker({
      isOpen: true,
      entryId,
      field,
      currentValue,
      hour,
      minute,
      ampm
    })
  }

  const closeTimePicker = () => {
    setTimePicker({
      isOpen: false,
      entryId: '',
      field: '',
      currentValue: null,
      hour: '12',
      minute: '00',
      ampm: 'AM'
    })
  }

  const confirmTimePicker = () => {
    const { entryId, field, hour, minute, ampm } = timePicker
    
    // Convert to 24-hour format
    let hours24 = parseInt(hour)
    if (ampm === 'AM' && hours24 === 12) {
      hours24 = 0
    } else if (ampm === 'PM' && hours24 !== 12) {
      hours24 += 12
    }
    
    // Get the entry to use its date as the base
    const entry = entries.find(e => e.id === entryId)
    if (!entry) return
    
    // Create a proper Date object using the entry's date as base
    const timeDate = new Date(entry.date)
    timeDate.setHours(hours24, parseInt(minute), 0, 0)
    
    // Format as HH:MM for the updateEntry function
    const timeString = `${hours24.toString().padStart(2, '0')}:${minute.padStart(2, '0')}`
    
    updateEntry(entryId, field, timeString)
    closeTimePicker()
  }

  const resetTimePicker = () => {
    updateEntry(timePicker.entryId, timePicker.field, null)
    closeTimePicker()
  }

  const toggleRowExpansion = (entryId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(entryId)) {
        newSet.delete(entryId)
      } else {
        newSet.add(entryId)
      }
      return newSet
    })
  }

  const getDailyTotal = (entry: TimeEntry) => {
    return calculateDailyHours(
      entry.in1,
      entry.out1,
      entry.in2,
      entry.out2,
      entry.in3,
      entry.out3,
      entry.plawaHours
    )
  }

  const getPeriodTotal = () => {
    return calculatePeriodTotal(entries)
  }

  const TimeButton = ({ 
    value, 
    onClick, 
    disabled, 
    placeholder = "Set Time" 
  }: { 
    value?: Date | null
    onClick: () => void
    disabled?: boolean
    placeholder?: string
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed hover:bg-gray-50 text-left"
    >
      {value ? formatTime(value) : (
        <span className="text-gray-400 text-xs">{placeholder}</span>
      )}
    </button>
  )

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Pay Period: {format(timesheet.periodStart, 'MMM d')} - {format(timesheet.periodEnd, 'MMM d, yyyy')}
            </h3>
            {/* Signature Indicators */}
            <div className="flex items-center space-x-4 mt-2">
              <div className={`flex items-center space-x-1 ${timesheet.staffSig ? 'text-green-600' : 'text-gray-400'}`}>
                {timesheet.staffSig ? <UserCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
                <div className="flex flex-col">
                  <span className="text-sm">Staff {timesheet.staffSig ? 'Signed' : 'Unsigned'}</span>
                </div>
              </div>
              <div className={`flex items-center space-x-1 ${timesheet.managerSig ? 'text-green-600' : 'text-gray-400'}`}>
                {timesheet.managerSig ? <UserCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
                <div className="flex flex-col">
                  <span className="text-sm">Manager {timesheet.managerSig ? 'Signed' : 'Unsigned'}</span>
                </div>
              </div>
              <div className={`flex items-center space-x-1 ${timesheet.hrSig ? 'text-green-600' : 'text-gray-400'}`}>
                {timesheet.hrSig ? <UserCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
                <div className="flex flex-col">
                  <span className="text-sm">HR {timesheet.hrSig ? 'Signed' : 'Unsigned'}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Total Hours</div>
            <div className="text-2xl font-bold text-primary-600">
              {getPeriodTotal().toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                In 1
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Out 1
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                In 2
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Out 2
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                In 3
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Out 3
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                PLAWA
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Daily Total
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Comments
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {entries.map((entry) => {
              const isWeekendDay = isWeekend(entry.date)
              const dailyTotal = getDailyTotal(entry)
              const isUpdatingThis = isUpdating === entry.id
              const isExpanded = expandedRows.has(entry.id)
              const hasComments = entry.comments && entry.comments.trim().length > 0

              return (
                <React.Fragment key={entry.id}>
                  <tr 
                    className={`${isWeekendDay ? 'bg-blue-50' : ''} ${isUpdatingThis ? 'opacity-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {format(entry.date, 'EEE, MMM d')}
                      </div>
                      {isWeekendDay && (
                        <div className="text-xs text-blue-600">Weekend</div>
                      )}
                    </td>
                    
                    <td className="px-3 py-4 text-center">
                      <TimeButton
                        value={entry.in1}
                        onClick={() => openTimePicker(entry.id, 'in1', entry.in1 || null)}
                        disabled={readOnly || isUpdatingThis}
                        placeholder="In 1"
                      />
                    </td>
                    
                    <td className="px-3 py-4 text-center">
                      <TimeButton
                        value={entry.out1}
                        onClick={() => openTimePicker(entry.id, 'out1', entry.out1 || null)}
                        disabled={readOnly || isUpdatingThis}
                        placeholder="Out 1"
                      />
                    </td>
                    
                    <td className="px-3 py-4 text-center">
                      <TimeButton
                        value={entry.in2}
                        onClick={() => openTimePicker(entry.id, 'in2', entry.in2 || null)}
                        disabled={readOnly || isUpdatingThis}
                        placeholder="In 2"
                      />
                    </td>
                    
                    <td className="px-3 py-4 text-center">
                      <TimeButton
                        value={entry.out2}
                        onClick={() => openTimePicker(entry.id, 'out2', entry.out2 || null)}
                        disabled={readOnly || isUpdatingThis}
                        placeholder="Out 2"
                      />
                    </td>
                    
                    <td className="px-3 py-4 text-center">
                      <TimeButton
                        value={entry.in3}
                        onClick={() => openTimePicker(entry.id, 'in3', entry.in3 || null)}
                        disabled={readOnly || isUpdatingThis}
                        placeholder="In 3"
                      />
                    </td>
                    
                    <td className="px-3 py-4 text-center">
                      <TimeButton
                        value={entry.out3}
                        onClick={() => openTimePicker(entry.id, 'out3', entry.out3 || null)}
                        disabled={readOnly || isUpdatingThis}
                        placeholder="Out 3"
                      />
                    </td>
                    
                    <td className="px-3 py-4 text-center">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.25"
                        value={entry.plawaHours}
                        onChange={(e) => handlePlawaHoursChange(entry.id, e.target.value)}
                        disabled={readOnly || isUpdatingThis}
                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </td>
                    
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {dailyTotal.toFixed(2)}
                      </div>
                    </td>

                    <td className="px-3 py-4 text-center">
                      <button
                        onClick={() => toggleRowExpansion(entry.id)}
                        className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                          hasComments 
                            ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                        title={hasComments ? 'Has comments' : 'Add comment'}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        {hasComments && (
                          <MessageSquare className="w-3 h-3 absolute" />
                        )}
                      </button>
                    </td>
                  </tr>
                  
                  {/* Expanded Comments Row */}
                  {isExpanded && (
                    <tr className={`${isWeekendDay ? 'bg-blue-25' : 'bg-gray-25'}`}>
                      <td colSpan={10} className="px-6 py-4">
                        <div className="max-w-2xl">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Comments for {format(entry.date, 'MMM d, yyyy')}
                          </label>
                          <textarea
                            value={entry.comments || ''}
                            onChange={(e) => handleCommentsChange(entry.id, e.target.value)}
                            disabled={readOnly || isUpdatingThis}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            placeholder="Add comments about this day's hours (e.g., short day due to appointment, overtime for project deadline, etc.)"
                          />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Time Picker Modal */}
      {timePicker.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
              onClick={closeTimePicker}
            />

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Set Time
                </h3>
                <button
                  onClick={closeTimePicker}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hour</label>
                    <select
                      value={timePicker.hour}
                      onChange={(e) => setTimePicker(prev => ({ ...prev, hour: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      {Array.from({ length: 12 }, (_, i) => {
                        const hour = (i + 1).toString().padStart(2, '0')
                        return (
                          <option key={hour} value={hour}>
                            {hour}
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Minute</label>
                    <select
                      value={timePicker.minute}
                      onChange={(e) => setTimePicker(prev => ({ ...prev, minute: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      {Array.from({ length: 60 }, (_, i) => {
                        const minute = i.toString().padStart(2, '0')
                        return (
                          <option key={minute} value={minute}>
                            {minute}
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">AM/PM</label>
                    <select
                      value={timePicker.ampm}
                      onChange={(e) => setTimePicker(prev => ({ ...prev, ampm: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>

                <div className="text-center py-2">
                  <div className="text-lg font-mono text-gray-700">
                    {timePicker.hour}:{timePicker.minute} {timePicker.ampm}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mt-6">
                <button
                  onClick={resetTimePicker}
                  className="px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Reset
                </button>
                <div className="flex space-x-3">
                  <button
                    onClick={closeTimePicker}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmTimePicker}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 