'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { apiClient } from '@/lib/api-client'
import { 
  Save, 
  Plus, 
  Edit3, 
  Trash2, 
  Clock, 
  Calendar, 
  Star, 
  StarOff, 
  Play, 
  X,
  Copy,
  FileText
} from 'lucide-react'

interface TemplatePattern {
  id?: string
  dayType: 'WEEKDAY' | 'SATURDAY' | 'SUNDAY'
  in1?: string | null
  out1?: string | null
  in2?: string | null
  out2?: string | null
  in3?: string | null
  out3?: string | null
  comments?: string | null
}

interface Template {
  id: string
  name: string
  description?: string | null
  isDefault: boolean
  patterns: TemplatePattern[]
  createdAt: string
  updatedAt: string
}

interface TimesheetTemplatesProps {
  timesheetId?: string
  onTemplateApplied?: () => void
  onCreateFromTimesheet?: (timesheetId: string) => void
  className?: string
}

export default function TimesheetTemplates({ 
  timesheetId, 
  onTemplateApplied, 
  onCreateFromTimesheet,
  className = '' 
}: TimesheetTemplatesProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [isApplying, setIsApplying] = useState<string | null>(null)

  // Form state for create/edit modal
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isDefault: false,
    patterns: [] as TemplatePattern[]
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setIsLoading(true)
      const data = await apiClient.get('/api/timesheet/templates')
      setTemplates(data)
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast.error('Failed to load templates')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateTemplate = async () => {
    try {
      if (!formData.name.trim()) {
        toast.error('Template name is required')
        return
      }

      const templateData: any = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        isDefault: formData.isDefault,
        patterns: formData.patterns.filter(p => hasTimeData(p))
      }

      // If creating from current timesheet
      if (timesheetId && formData.patterns.length === 0) {
        templateData.timesheetId = timesheetId
      }

      const newTemplate = await apiClient.post('/api/timesheet/templates', templateData)
      setTemplates(prev => [newTemplate, ...prev.filter(t => !newTemplate.isDefault || !t.isDefault)])
      
      toast.success('Template created successfully')
      resetForm()
      setShowCreateModal(false)
    } catch (error: any) {
      console.error('Error creating template:', error)
      toast.error(error.response?.data?.error || 'Failed to create template')
    }
  }

  const handleUpdateTemplate = async () => {
    try {
      if (!editingTemplate || !formData.name.trim()) {
        toast.error('Template name is required')
        return
      }

      const updateData = {
        id: editingTemplate.id,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        isDefault: formData.isDefault,
        patterns: formData.patterns.filter(p => hasTimeData(p))
      }

      const updatedTemplate = await apiClient.put('/api/timesheet/templates', updateData)
      setTemplates(prev => prev.map(t => 
        t.id === updatedTemplate.id ? updatedTemplate : 
        (updatedTemplate.isDefault && t.isDefault && t.id !== updatedTemplate.id) ? { ...t, isDefault: false } : t
      ))
      
      toast.success('Template updated successfully')
      resetForm()
      setShowEditModal(false)
      setEditingTemplate(null)
    } catch (error: any) {
      console.error('Error updating template:', error)
      toast.error(error.response?.data?.error || 'Failed to update template')
    }
  }

  const handleDeleteTemplate = async (template: Template) => {
    if (!confirm(`Are you sure you want to delete the template "${template.name}"?`)) {
      return
    }

    try {
      await apiClient.delete(`/api/timesheet/templates?id=${template.id}`)
      setTemplates(prev => prev.filter(t => t.id !== template.id))
      toast.success('Template deleted successfully')
    } catch (error: any) {
      console.error('Error deleting template:', error)
      toast.error(error.response?.data?.error || 'Failed to delete template')
    }
  }

  const handleApplyTemplate = async (template: Template) => {
    if (!timesheetId) {
      toast.error('No timesheet selected')
      return
    }

    try {
      setIsApplying(template.id)
      await apiClient.post(`/api/timesheet/${timesheetId}/apply-template`, {
        templateId: template.id
      })
      
      toast.success(`Template "${template.name}" applied successfully`)
      if (onTemplateApplied) {
        onTemplateApplied()
      }
    } catch (error: any) {
      console.error('Error applying template:', error)
      toast.error(error.response?.data?.error || 'Failed to apply template')
    } finally {
      setIsApplying(null)
    }
  }

  const handleSetDefault = async (template: Template) => {
    try {
      await apiClient.put('/api/timesheet/templates', {
        id: template.id,
        isDefault: !template.isDefault
      })
      
      setTemplates(prev => prev.map(t => ({
        ...t,
        isDefault: t.id === template.id ? !template.isDefault : (template.isDefault ? false : t.isDefault)
      })))
      
      toast.success(template.isDefault ? 'Default template removed' : 'Template set as default')
    } catch (error: any) {
      console.error('Error updating default template:', error)
      toast.error('Failed to update default template')
    }
  }

  const openCreateModal = () => {
    resetForm()
    setShowCreateModal(true)
  }

  const openEditModal = (template: Template) => {
    setFormData({
      name: template.name,
      description: template.description || '',
      isDefault: template.isDefault,
      patterns: [...template.patterns]
    })
    setEditingTemplate(template)
    setShowEditModal(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      isDefault: false,
      patterns: []
    })
  }

  const addPattern = (dayType: 'WEEKDAY' | 'SATURDAY' | 'SUNDAY') => {
    const newPattern: TemplatePattern = {
      dayType,
      in1: null,
      out1: null,
      in2: null,
      out2: null,
      in3: null,
      out3: null,
      comments: null
    }
    setFormData(prev => ({
      ...prev,
      patterns: [...prev.patterns.filter(p => p.dayType !== dayType), newPattern]
    }))
  }

  const updatePattern = (dayType: string, field: string, value: string | null) => {
    setFormData(prev => ({
      ...prev,
      patterns: prev.patterns.map(p => 
        p.dayType === dayType ? { ...p, [field]: value || null } : p
      )
    }))
  }

  const removePattern = (dayType: string) => {
    setFormData(prev => ({
      ...prev,
      patterns: prev.patterns.filter(p => p.dayType !== dayType)
    }))
  }

  const hasTimeData = (pattern: TemplatePattern): boolean => {
    return !!(pattern.in1 || pattern.out1 || pattern.in2 || pattern.out2 || pattern.in3 || pattern.out3)
  }

  const formatTime = (timeString: string | null): string => {
    if (!timeString) return ''
    return timeString
  }

  const getDayTypeLabel = (dayType: string): string => {
    switch (dayType) {
      case 'WEEKDAY': return 'Weekdays (Mon-Fri)'
      case 'SATURDAY': return 'Saturday'
      case 'SUNDAY': return 'Sunday'
      default: return dayType
    }
  }

  const getDayTypeColor = (dayType: string): string => {
    switch (dayType) {
      case 'WEEKDAY': return 'bg-blue-100 text-blue-800'
      case 'SATURDAY': return 'bg-purple-100 text-purple-800'
      case 'SUNDAY': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">Timesheet Templates</h3>
          </div>
          <div className="flex items-center space-x-2">
            {timesheetId && onCreateFromTimesheet && (
              <button
                onClick={() => onCreateFromTimesheet(timesheetId)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Copy className="w-4 h-4 mr-2" />
                Save as Template
              </button>
            )}
            <button
              onClick={openCreateModal}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {templates.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h4>
            <p className="text-gray-500 mb-4">
              Create your first template to quickly fill out future timesheets
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="text-lg font-medium text-gray-900">{template.name}</h4>
                      {template.isDefault && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Star className="w-3 h-3 mr-1" />
                          Default
                        </span>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                    )}
                    
                    {/* Pattern Summary */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {template.patterns.map((pattern) => (
                        <span
                          key={pattern.dayType}
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDayTypeColor(pattern.dayType)}`}
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          {getDayTypeLabel(pattern.dayType)}
                        </span>
                      ))}
                    </div>

                    {/* Time Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-600">
                      {template.patterns.map((pattern) => (
                        <div key={pattern.dayType} className="space-y-1">
                          <div className="font-medium">{getDayTypeLabel(pattern.dayType)}</div>
                          {pattern.in1 && pattern.out1 && (
                            <div>In/Out 1: {formatTime(pattern.in1)} - {formatTime(pattern.out1)}</div>
                          )}
                          {pattern.in2 && pattern.out2 && (
                            <div>In/Out 2: {formatTime(pattern.in2)} - {formatTime(pattern.out2)}</div>
                          )}
                          {pattern.in3 && pattern.out3 && (
                            <div>In/Out 3: {formatTime(pattern.in3)} - {formatTime(pattern.out3)}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {timesheetId && (
                      <button
                        onClick={() => handleApplyTemplate(template)}
                        disabled={isApplying === template.id}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isApplying === template.id ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        ) : (
                          <Play className="w-4 h-4 mr-2" />
                        )}
                        Apply
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleSetDefault(template)}
                      className={`p-2 rounded-md ${
                        template.isDefault 
                          ? 'text-yellow-600 hover:bg-yellow-50' 
                          : 'text-gray-400 hover:bg-gray-50'
                      }`}
                      title={template.isDefault ? 'Remove as default' : 'Set as default'}
                    >
                      {template.isDefault ? <Star className="w-4 h-4" /> : <StarOff className="w-4 h-4" />}
                    </button>
                    
                    <button
                      onClick={() => openEditModal(template)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md"
                      title="Edit template"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDeleteTemplate(template)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                      title="Delete template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Template Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
              onClick={() => {
                setShowCreateModal(false)
                setShowEditModal(false)
                resetForm()
                setEditingTemplate(null)
              }}
            />

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  {showCreateModal ? 'Create Template' : 'Edit Template'}
                </h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setShowEditModal(false)
                    resetForm()
                    setEditingTemplate(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Standard Work Week"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Optional description"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-900">
                    Set as default template
                  </label>
                </div>

                {/* Pattern Configuration */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Time Patterns</h4>
                  
                  {/* Add Pattern Buttons */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {['WEEKDAY', 'SATURDAY', 'SUNDAY'].map((dayType) => {
                      const hasPattern = formData.patterns.some(p => p.dayType === dayType)
                      return (
                        <button
                          key={dayType}
                          onClick={() => hasPattern ? removePattern(dayType) : addPattern(dayType as any)}
                          className={`inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md ${
                            hasPattern
                              ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100'
                              : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                          }`}
                        >
                          {hasPattern ? <Trash2 className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                          {getDayTypeLabel(dayType)}
                        </button>
                      )
                    })}
                  </div>

                  {/* Pattern Forms */}
                  <div className="space-y-6">
                    {formData.patterns.map((pattern) => (
                      <div key={pattern.dayType} className="border border-gray-200 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-3">{getDayTypeLabel(pattern.dayType)}</h5>
                        
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">In 1</label>
                            <input
                              type="time"
                              value={pattern.in1 || ''}
                              onChange={(e) => updatePattern(pattern.dayType, 'in1', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Out 1</label>
                            <input
                              type="time"
                              value={pattern.out1 || ''}
                              onChange={(e) => updatePattern(pattern.dayType, 'out1', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">In 2</label>
                            <input
                              type="time"
                              value={pattern.in2 || ''}
                              onChange={(e) => updatePattern(pattern.dayType, 'in2', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Out 2</label>
                            <input
                              type="time"
                              value={pattern.out2 || ''}
                              onChange={(e) => updatePattern(pattern.dayType, 'out2', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">In 3</label>
                            <input
                              type="time"
                              value={pattern.in3 || ''}
                              onChange={(e) => updatePattern(pattern.dayType, 'in3', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Out 3</label>
                            <input
                              type="time"
                              value={pattern.out3 || ''}
                              onChange={(e) => updatePattern(pattern.dayType, 'out3', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <div className="mt-3">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Comments</label>
                          <input
                            type="text"
                            value={pattern.comments || ''}
                            onChange={(e) => updatePattern(pattern.dayType, 'comments', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Optional default comment for this day type"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {formData.patterns.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p>Add time patterns for different day types</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setShowEditModal(false)
                    resetForm()
                    setEditingTemplate(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={showCreateModal ? handleCreateTemplate : handleUpdateTemplate}
                  disabled={!formData.name.trim() || formData.patterns.filter(p => hasTimeData(p)).length === 0}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {showCreateModal ? 'Create Template' : 'Update Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 