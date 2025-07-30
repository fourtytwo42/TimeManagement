'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Save, X } from 'lucide-react'

interface Template {
  id: string
  name: string
  description: string
  entries: Array<{
    day: string
    in1: string
    out1: string
    in2: string
    out2: string
    in3: string
    out3: string
    plawaHours: number
    comments: string
  }>
}

interface TimesheetTemplatesProps {
  onSelectTemplate: (template: Template) => void
}

export default function TimesheetTemplates({ onSelectTemplate }: TimesheetTemplatesProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    entries: Array.from({ length: 14 }, () => ({
      day: '',
      in1: '',
      out1: '',
      in2: '',
      out2: '',
      in3: '',
      out3: '',
      plawaHours: 0,
      comments: ''
    }))
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/timesheet/templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateTemplate = async () => {
    try {
      const response = await fetch('/api/timesheet/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setShowCreateForm(false)
        setFormData({
          name: '',
          description: '',
          entries: Array.from({ length: 14 }, () => ({
            day: '',
            in1: '',
            out1: '',
            in2: '',
            out2: '',
            in3: '',
            out3: '',
            plawaHours: 0,
            comments: ''
          }))
        })
        await fetchTemplates()
      }
    } catch (error) {
      console.error('Error creating template:', error)
    }
  }

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return

    try {
      const response = await fetch(`/api/timesheet/templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setEditingTemplate(null)
        setFormData({
          name: '',
          description: '',
          entries: Array.from({ length: 14 }, () => ({
            day: '',
            in1: '',
            out1: '',
            in2: '',
            out2: '',
            in3: '',
            out3: '',
            plawaHours: 0,
            comments: ''
          }))
        })
        await fetchTemplates()
      }
    } catch (error) {
      console.error('Error updating template:', error)
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return

    try {
      const response = await fetch(`/api/timesheet/templates/${templateId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchTemplates()
      }
    } catch (error) {
      console.error('Error deleting template:', error)
    }
  }

  const startEdit = (template: Template) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      description: template.description,
      entries: template.entries
    })
  }

  const cancelEdit = () => {
    setEditingTemplate(null)
    setFormData({
      name: '',
      description: '',
      entries: Array.from({ length: 14 }, () => ({
        day: '',
        in1: '',
        out1: '',
        in2: '',
        out2: '',
        in3: '',
        out3: '',
        plawaHours: 0,
        comments: ''
      }))
    })
  }

  const updateEntry = (index: number, field: string, value: string | number) => {
    const newEntries = [...formData.entries]
    newEntries[index] = { ...newEntries[index], [field]: value }
    setFormData({ ...formData, entries: newEntries })
  }

  if (isLoading) {
    return <div className='text-center py-8'>Loading templates...</div>
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h2 className='text-xl font-semibold'>Timesheet Templates</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className='flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'
        >
          <Plus className='w-4 h-4 mr-2' />
          Create Template
        </button>
      </div>

      {/* Template List */}
      <div className='grid gap-4'>
        {templates.map((template) => (
          <div key={template.id} className='bg-white border border-gray-200 rounded-lg p-4'>
            <div className='flex items-center justify-between mb-2'>
              <h3 className='text-lg font-medium'>{template.name}</h3>
              <div className='flex space-x-2'>
                <button
                  onClick={() => onSelectTemplate(template)}
                  className='px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700'
                >
                  Use
                </button>
                <button
                  onClick={() => startEdit(template)}
                  className='p-1 text-blue-600 hover:text-blue-800'
                >
                  <Edit className='w-4 h-4' />
                </button>
                <button
                  onClick={() => handleDeleteTemplate(template.id)}
                  className='p-1 text-red-600 hover:text-red-800'
                >
                  <Trash2 className='w-4 h-4' />
                </button>
              </div>
            </div>
            <p className='text-gray-600'>{template.description}</p>
          </div>
        ))}
      </div>

      {/* Create/Edit Form */}
      {(showCreateForm || editingTemplate) && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold'>
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </h3>
              <button
                onClick={editingTemplate ? cancelEdit : () => setShowCreateForm(false)}
                className='text-gray-500 hover:text-gray-700'
              >
                <X className='w-6 h-6' />
              </button>
            </div>

            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium mb-1'>Template Name</label>
                <input
                  type='text'
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className='w-full border border-gray-300 rounded px-3 py-2'
                />
              </div>

              <div>
                <label className='block text-sm font-medium mb-1'>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className='w-full border border-gray-300 rounded px-3 py-2'
                  rows={3}
                />
              </div>

              <div>
                <label className='block text-sm font-medium mb-2'>Time Entries</label>
                <div className='space-y-2'>
                  {formData.entries.map((entry, index) => (
                    <div key={index} className='grid grid-cols-8 gap-2 text-sm'>
                      <input
                        type='text'
                        placeholder='Day'
                        value={entry.day}
                        onChange={(e) => updateEntry(index, 'day', e.target.value)}
                        className='border border-gray-300 rounded px-2 py-1'
                      />
                      <input
                        type='time'
                        value={entry.in1}
                        onChange={(e) => updateEntry(index, 'in1', e.target.value)}
                        className='border border-gray-300 rounded px-2 py-1'
                      />
                      <input
                        type='time'
                        value={entry.out1}
                        onChange={(e) => updateEntry(index, 'out1', e.target.value)}
                        className='border border-gray-300 rounded px-2 py-1'
                      />
                      <input
                        type='time'
                        value={entry.in2}
                        onChange={(e) => updateEntry(index, 'in2', e.target.value)}
                        className='border border-gray-300 rounded px-2 py-1'
                      />
                      <input
                        type='time'
                        value={entry.out2}
                        onChange={(e) => updateEntry(index, 'out2', e.target.value)}
                        className='border border-gray-300 rounded px-2 py-1'
                      />
                      <input
                        type='number'
                        placeholder='PLAWA'
                        value={entry.plawaHours}
                        onChange={(e) => updateEntry(index, 'plawaHours', parseFloat(e.target.value) || 0)}
                        className='border border-gray-300 rounded px-2 py-1'
                        step='0.5'
                      />
                      <input
                        type='text'
                        placeholder='Comments'
                        value={entry.comments}
                        onChange={(e) => updateEntry(index, 'comments', e.target.value)}
                        className='border border-gray-300 rounded px-2 py-1'
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className='flex justify-end space-x-2'>
                <button
                  onClick={editingTemplate ? cancelEdit : () => setShowCreateForm(false)}
                  className='px-4 py-2 border border-gray-300 rounded hover:bg-gray-50'
                >
                  Cancel
                </button>
                <button
                  onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
                  className='px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'
                >
                  {editingTemplate ? <><Edit className='w-4 h-4 mr-2' />Update</> : <><Save className='w-4 h-4 mr-2' />Create</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 