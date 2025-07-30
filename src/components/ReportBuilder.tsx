'use client'

import { useState } from 'react'
import { Plus, X, Filter, BarChart3, FileText, Users, Calendar } from 'lucide-react'

interface ReportBuilderProps {
  onSave: (_config: any) => void
  onCancel: () => void
}

interface ReportConfig {
  name: string
  description: string
  reportType: 'timesheet_summary' | 'user_summary'
  columns: string[]
  filters: {
    dateRange: boolean
    status: boolean
    users: boolean
    roles: boolean
  }
}

const AVAILABLE_COLUMNS = {
  timesheet_summary: [
    { id: 'employeeName', label: 'Employee Name', category: 'Employee' },
    { id: 'employeeEmail', label: 'Employee Email', category: 'Employee' },
    { id: 'managerName', label: 'Manager Name', category: 'Manager' },
    { id: 'managerEmail', label: 'Manager Email', category: 'Manager' },
    { id: 'periodStart', label: 'Period Start', category: 'Period' },
    { id: 'periodEnd', label: 'Period End', category: 'Period' },
    { id: 'status', label: 'Status', category: 'Timesheet' },
    { id: 'totalHours', label: 'Total Hours', category: 'Hours' },
    { id: 'regularHours', label: 'Regular Hours', category: 'Hours' },
    { id: 'plawaHours', label: 'PLAWA Hours', category: 'Hours' },
    { id: 'payRate', label: 'Pay Rate', category: 'Pay' },
    { id: 'estimatedPay', label: 'Estimated Pay', category: 'Pay' },
    { id: 'staffSigned', label: 'Staff Signed', category: 'Signatures' },
    { id: 'managerSigned', label: 'Manager Signed', category: 'Signatures' },
    { id: 'hrSigned', label: 'HR Signed', category: 'Signatures' }
  ],
  user_summary: [
    { id: 'employeeName', label: 'Employee Name', category: 'Employee' },
    { id: 'employeeEmail', label: 'Employee Email', category: 'Employee' },
    { id: 'role', label: 'Role', category: 'Employee' },
    { id: 'managerName', label: 'Manager Name', category: 'Manager' },
    { id: 'managerEmail', label: 'Manager Email', category: 'Manager' },
    { id: 'payRate', label: 'Pay Rate', category: 'Pay' },
    { id: 'totalHours', label: 'Total Hours', category: 'Hours' },
    { id: 'regularHours', label: 'Regular Hours', category: 'Hours' },
    { id: 'plawaHours', label: 'PLAWA Hours', category: 'Hours' },
    { id: 'totalPay', label: 'Total Pay', category: 'Pay' },
    { id: 'timesheetCount', label: 'Timesheet Count', category: 'Summary' },
    { id: 'approvedCount', label: 'Approved Count', category: 'Summary' },
    { id: 'approvalRate', label: 'Approval Rate', category: 'Summary' }
  ]
}

const FILTER_OPTIONS = [
  { id: 'dateRange', label: 'Date Range', icon: Calendar, description: 'Filter by specific date periods' },
  { id: 'status', label: 'Status', icon: BarChart3, description: 'Filter by timesheet status' },
  { id: 'users', label: 'Specific Users', icon: Users, description: 'Filter by selected employees' },
  { id: 'roles', label: 'Roles', icon: FileText, description: 'Filter by employee roles' }
]

export default function ReportBuilder({ onSave, onCancel }: ReportBuilderProps) {
  const [config, setConfig] = useState<ReportConfig>({
    name: '',
    description: '',
    reportType: 'timesheet_summary',
    columns: [],
    filters: {
      dateRange: false,
      status: false,
      users: false,
      roles: false
    }
  })

  const [activeStep, setActiveStep] = useState(1)

  const handleColumnToggle = (columnId: string) => {
    setConfig(prev => ({
      ...prev,
      columns: prev.columns.includes(columnId)
        ? prev.columns.filter(c => c !== columnId)
        : [...prev.columns, columnId]
    }))
  }

  const handleFilterToggle = (filterId: keyof ReportConfig['filters']) => {
    setConfig(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [filterId]: !prev.filters[filterId]
      }
    }))
  }

  const handleSave = () => {
    if (!config.name || config.columns.length === 0) {
      return
    }
    onSave(config)
  }

  const getColumnsByCategory = () => {
    const columns = AVAILABLE_COLUMNS[config.reportType]
    const categories = Array.from(new Set(columns.map(col => col.category)))
    
    return categories.map(category => ({
      name: category,
      columns: columns.filter(col => col.category === category)
    }))
  }

  const isValid = config.name.trim() !== '' && config.columns.length > 0

  return (
    <div className='max-w-4xl mx-auto'>
      {/* Progress Steps */}
      <div className='mb-8'>
        <div className='flex items-center justify-between'>
          {[
            { step: 1, title: 'Basic Info', icon: FileText },
            { step: 2, title: 'Select Columns', icon: BarChart3 },
            { step: 3, title: 'Configure Filters', icon: Filter },
            { step: 4, title: 'Review & Save', icon: Plus }
          ].map(({ step, title, icon: Icon }) => (
            <div key={step} className='flex items-center'>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                activeStep >= step 
                  ? 'bg-primary-600 border-primary-600 text-white' 
                  : 'border-gray-300 text-gray-500'
              }`}>
                {activeStep > step ? (
                  <svg className='w-6 h-6' fill='currentColor' viewBox='0 0 20 20'>
                    <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                  </svg>
                ) : (
                  <Icon className='w-5 h-5' />
                )}
              </div>
              <span className={`ml-2 text-sm font-medium ${
                activeStep >= step ? 'text-primary-600' : 'text-gray-500'
              }`}>
                {title}
              </span>
              {step < 4 && <div className='flex-1 h-px bg-gray-300 mx-4' />}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className='bg-white rounded-lg shadow-lg p-6'>
        {activeStep === 1 && (
          <div className='space-y-6'>
            <div>
              <h3 className='text-lg font-medium text-gray-900 mb-4'>Report Basic Information</h3>
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Report Name *
                  </label>
                  <input
                    type='text'
                    value={config.name}
                    onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500'
                    placeholder='e.g., Monthly Payroll Summary'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Description
                  </label>
                  <textarea
                    value={config.description}
                    onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500'
                    placeholder='Describe what this report shows and when to use it'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Report Type *
                  </label>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div
                      onClick={() => setConfig(prev => ({ ...prev, reportType: 'timesheet_summary', columns: [] }))}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        config.reportType === 'timesheet_summary'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className='flex items-center mb-2'>
                        <FileText className='w-5 h-5 mr-2 text-primary-600' />
                        <h4 className='font-medium'>Timesheet Summary</h4>
                      </div>
                      <p className='text-sm text-gray-600'>
                        Individual timesheet records with detailed hours and signatures
                      </p>
                    </div>
                    <div
                      onClick={() => setConfig(prev => ({ ...prev, reportType: 'user_summary', columns: [] }))}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        config.reportType === 'user_summary'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className='flex items-center mb-2'>
                        <Users className='w-5 h-5 mr-2 text-primary-600' />
                        <h4 className='font-medium'>User Summary</h4>
                      </div>
                      <p className='text-sm text-gray-600'>
                        Aggregated data by employee with totals and statistics
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeStep === 2 && (
          <div className='space-y-6'>
            <div>
              <h3 className='text-lg font-medium text-gray-900 mb-4'>Select Report Columns</h3>
              <p className='text-sm text-gray-600 mb-6'>
                Choose which data fields to include in your report. You can select multiple columns from each category.
              </p>
              
              <div className='space-y-6'>
                {getColumnsByCategory().map((category) => (
                  <div key={category.name} className='border border-gray-200 rounded-lg p-4'>
                    <h4 className='font-medium text-gray-900 mb-3'>{category.name}</h4>
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
                      {category.columns.map((column) => (
                        <label key={column.id} className='flex items-center'>
                          <input
                            type='checkbox'
                            checked={config.columns.includes(column.id)}
                            onChange={() => handleColumnToggle(column.id)}
                            className='mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded'
                          />
                          <span className='text-sm text-gray-700'>{column.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              {config.columns.length > 0 && (
                <div className='mt-4 p-3 bg-green-50 border border-green-200 rounded-md'>
                  <p className='text-sm text-green-800'>
                    Selected {config.columns.length} column{config.columns.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeStep === 3 && (
          <div className='space-y-6'>
            <div>
              <h3 className='text-lg font-medium text-gray-900 mb-4'>Configure Filters</h3>
              <p className='text-sm text-gray-600 mb-6'>
                Select which filters users can apply when running this report. Filters allow users to narrow down the data.
              </p>
              
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {FILTER_OPTIONS.map((filter) => {
                  const Icon = filter.icon
                  return (
                    <div
                      key={filter.id}
                      onClick={() => handleFilterToggle(filter.id as keyof ReportConfig['filters'])}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        config.filters[filter.id as keyof ReportConfig['filters']]
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className='flex items-center mb-2'>
                        <Icon className='w-5 h-5 mr-2 text-primary-600' />
                        <h4 className='font-medium'>{filter.label}</h4>
                      </div>
                      <p className='text-sm text-gray-600'>{filter.description}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {activeStep === 4 && (
          <div className='space-y-6'>
            <div>
              <h3 className='text-lg font-medium text-gray-900 mb-4'>Review & Save Report</h3>
              
              <div className='bg-gray-50 rounded-lg p-6 space-y-4'>
                <div>
                  <h4 className='font-medium text-gray-900'>Report Name</h4>
                  <p className='text-gray-600'>{config.name}</p>
                </div>
                
                {config.description && (
                  <div>
                    <h4 className='font-medium text-gray-900'>Description</h4>
                    <p className='text-gray-600'>{config.description}</p>
                  </div>
                )}
                
                <div>
                  <h4 className='font-medium text-gray-900'>Report Type</h4>
                  <p className='text-gray-600'>
                    {config.reportType === 'timesheet_summary' ? 'Timesheet Summary' : 'User Summary'}
                  </p>
                </div>
                
                <div>
                  <h4 className='font-medium text-gray-900'>Selected Columns ({config.columns.length})</h4>
                  <div className='flex flex-wrap gap-2 mt-2'>
                    {config.columns.map((columnId) => {
                      const column = AVAILABLE_COLUMNS[config.reportType].find(c => c.id === columnId)
                      return (
                        <span key={columnId} className='px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full'>
                          {column?.label}
                        </span>
                      )
                    })}
                  </div>
                </div>
                
                <div>
                  <h4 className='font-medium text-gray-900'>Available Filters</h4>
                  <div className='flex flex-wrap gap-2 mt-2'>
                    {Object.entries(config.filters)
                      .filter(([_, enabled]) => enabled)
                      .map(([filterId]) => {
                        const filter = FILTER_OPTIONS.find(f => f.id === filterId)
                        return (
                          <span key={filterId} className='px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full'>
                            {filter?.label}
                          </span>
                        )
                      })}
                    {Object.values(config.filters).every(v => !v) && (
                      <span className='text-gray-500 text-sm'>No filters enabled</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className='flex justify-between items-center mt-8 pt-6 border-t border-gray-200'>
          <div className='flex space-x-3'>
            <button
              onClick={onCancel}
              className='px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50'
            >
              Cancel
            </button>
            {activeStep > 1 && (
              <button
                onClick={() => setActiveStep(prev => prev - 1)}
                className='px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50'
              >
                Previous
              </button>
            )}
          </div>
          
          <div className='flex space-x-3'>
            {activeStep < 4 ? (
              <button
                onClick={() => setActiveStep(prev => prev + 1)}
                disabled={activeStep === 1 && !config.name}
                className='px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={!isValid}
                className='px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                Save Report
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 