'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { format, isWeekend } from 'date-fns'
import { toast } from 'react-toastify'
import { calculateDailyHours, calculatePeriodTotal, formatTime, parseTimeString } from '@/lib/utils'
import { TimesheetWithEntries } from '@/lib/timesheet'
import { apiClient } from '@/lib/api-client'
import { CheckCircle, MessageSquare, ChevronDown, ChevronRight, User, UserCheck } from 'lucide-react'

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

export default function TimesheetGrid({ timesheet, onEntryUpdate, readOnly = false }: TimesheetGridProps) {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
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

  const updateEntry = async (entryId: string, field: string, value: string | number) => {
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
        // Handle time fields
        if (value === '') {
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
            if (value === '') {
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

  const handleCommentsChange = (entryId: string, value: string) => {
    // Update local state immediately for responsive UI
    setEntries(prev => prev.map(e => 
      e.id === entryId ? { ...e, comments: value } : e
    ))
    
    // Clear existing timer for this entry
    const existingTimer = debounceTimers.current.get(entryId)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }
    
    // Set new timer for debounced API call
    const newTimer = setTimeout(() => {
      updateEntry(entryId, 'comments', value)
      debounceTimers.current.delete(entryId)
    }, 1000) // Wait 1 second after user stops typing
    
    debounceTimers.current.set(entryId, newTimer)
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

  const TimeInput = ({ 
    value, 
    onChange, 
    disabled, 
    placeholder = "HH:MM" 
  }: { 
    value?: Date | null
    onChange: (value: string) => void
    disabled?: boolean
    placeholder?: string
  }) => (
    <input
      type="time"
      value={value ? formatTime(value) : ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      placeholder={placeholder}
    />
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
                <span className="text-sm">Staff {timesheet.staffSig ? 'Signed' : 'Unsigned'}</span>
              </div>
              <div className={`flex items-center space-x-1 ${timesheet.managerSig ? 'text-green-600' : 'text-gray-400'}`}>
                {timesheet.managerSig ? <UserCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
                <span className="text-sm">Manager {timesheet.managerSig ? 'Signed' : 'Unsigned'}</span>
              </div>
              <div className={`flex items-center space-x-1 ${timesheet.hrSig ? 'text-green-600' : 'text-gray-400'}`}>
                {timesheet.hrSig ? <UserCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
                <span className="text-sm">HR {timesheet.hrSig ? 'Signed' : 'Unsigned'}</span>
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
                <>
                  <tr 
                    key={entry.id} 
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
                      <TimeInput
                        value={entry.in1}
                        onChange={(value) => updateEntry(entry.id, 'in1', value)}
                        disabled={readOnly || isUpdatingThis}
                      />
                    </td>
                    
                    <td className="px-3 py-4 text-center">
                      <TimeInput
                        value={entry.out1}
                        onChange={(value) => updateEntry(entry.id, 'out1', value)}
                        disabled={readOnly || isUpdatingThis}
                      />
                    </td>
                    
                    <td className="px-3 py-4 text-center">
                      <TimeInput
                        value={entry.in2}
                        onChange={(value) => updateEntry(entry.id, 'in2', value)}
                        disabled={readOnly || isUpdatingThis}
                      />
                    </td>
                    
                    <td className="px-3 py-4 text-center">
                      <TimeInput
                        value={entry.out2}
                        onChange={(value) => updateEntry(entry.id, 'out2', value)}
                        disabled={readOnly || isUpdatingThis}
                      />
                    </td>
                    
                    <td className="px-3 py-4 text-center">
                      <TimeInput
                        value={entry.in3}
                        onChange={(value) => updateEntry(entry.id, 'in3', value)}
                        disabled={readOnly || isUpdatingThis}
                      />
                    </td>
                    
                    <td className="px-3 py-4 text-center">
                      <TimeInput
                        value={entry.out3}
                        onChange={(value) => updateEntry(entry.id, 'out3', value)}
                        disabled={readOnly || isUpdatingThis}
                      />
                    </td>
                    
                    <td className="px-3 py-4 text-center">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.25"
                        value={entry.plawaHours}
                        onChange={(e) => updateEntry(entry.id, 'plawaHours', e.target.value)}
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
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
} 