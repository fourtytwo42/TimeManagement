'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { apiClient } from '@/lib/api-client'
import { Mail, Server, Shield, Bell, TestTube, Save, Eye, EyeOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface EmailConfig {
  id?: string
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUser: string
  hasPassword: boolean
  fromEmail: string
  fromName: string
  isEnabled: boolean
  testEmailSent?: boolean
  lastTestAt?: string
}

interface NotificationSettings {
  timesheetSubmissionEnabled: boolean
  timesheetApprovalEnabled: boolean
  timesheetDenialEnabled: boolean
  timesheetFinalApprovalEnabled: boolean
  timesheetMessageEnabled: boolean
  userAccountEnabled: boolean
  reportDeliveryEnabled: boolean
  systemAlertsEnabled: boolean
}

export default function EmailSettings() {
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: '',
    hasPassword: false,
    fromEmail: '',
    fromName: '',
    isEnabled: false
  })

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    timesheetSubmissionEnabled: true,
    timesheetApprovalEnabled: true,
    timesheetDenialEnabled: true,
    timesheetFinalApprovalEnabled: true,
    timesheetMessageEnabled: true,
    userAccountEnabled: true,
    reportDeliveryEnabled: true,
    systemAlertsEnabled: true
  })

  const [smtpPassword, setSmtpPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [activeTab, setActiveTab] = useState<'smtp' | 'notifications'>('smtp')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setIsLoading(true)
      const response = await apiClient.get('/api/settings/email')
      
      if (response.emailConfig) {
        setEmailConfig(response.emailConfig)
      }
      
      if (response.notificationSettings) {
        setNotificationSettings(response.notificationSettings)
      }
    } catch (error) {
      console.error('Error fetching email settings:', error)
      toast.error('Failed to load email settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    try {
      setIsLoading(true)

      const payload: any = {}

      if (activeTab === 'smtp') {
        // Validate SMTP settings
        if (!emailConfig.smtpHost || !emailConfig.smtpUser || !emailConfig.fromEmail || !emailConfig.fromName) {
          toast.error('Please fill in all required SMTP fields')
          return
        }

        payload.emailConfig = {
          ...emailConfig,
          smtpPassword: smtpPassword || undefined // Only send if provided
        }
      } else {
        payload.notificationSettings = notificationSettings
      }

      await apiClient.post('/api/settings/email', payload)
      toast.success('Settings saved successfully')
      
      // Refresh settings to get updated data
      await fetchSettings()
      setSmtpPassword('') // Clear password field after save
    } catch (error: any) {
      console.error('Error saving settings:', error)
      toast.error(error.response?.data?.error || 'Failed to save settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestEmail = async () => {
    try {
      setIsTesting(true)
      await apiClient.put('/api/settings/email', { action: 'test' })
      toast.success('Test email sent successfully! Check your inbox.')
      
      // Refresh settings to update test status
      await fetchSettings()
    } catch (error: any) {
      console.error('Error testing email:', error)
      toast.error(error.response?.data?.error || 'Failed to send test email')
    } finally {
      setIsTesting(false)
    }
  }

  const handleEmailConfigChange = (field: keyof EmailConfig, value: any) => {
    setEmailConfig(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleNotificationChange = (field: keyof NotificationSettings, value: boolean) => {
    setNotificationSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const getStatusIcon = () => {
    if (!emailConfig.isEnabled) {
      return <XCircle className='h-5 w-5 text-red-500' />
    }
    if (emailConfig.testEmailSent) {
      return <CheckCircle className='h-5 w-5 text-green-500' />
    }
    return <AlertCircle className='h-5 w-5 text-yellow-500' />
  }

  const getStatusText = () => {
    if (!emailConfig.isEnabled) {
      return 'Disabled'
    }
    if (emailConfig.testEmailSent) {
      return 'Configured & Tested'
    }
    return 'Configured (Not Tested)'
  }

  if (isLoading && !emailConfig.smtpHost) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600'></div>
      </div>
    )
  }

  return (
    <div className='max-w-4xl mx-auto'>
      {/* Header */}
      <div className='mb-8'>
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='text-2xl font-bold text-gray-900'>Email Settings</h2>
            <p className='text-gray-600 mt-1'>Configure SMTP settings and notification preferences</p>
          </div>
          <div className='flex items-center space-x-2'>
            {getStatusIcon()}
            <span className='text-sm font-medium text-gray-700'>{getStatusText()}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className='border-b border-gray-200 mb-6'>
        <nav className='-mb-px flex space-x-8'>
          <button
            onClick={() => setActiveTab('smtp')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'smtp'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className='flex items-center space-x-2'>
              <Server className='h-4 w-4' />
              <span>SMTP Configuration</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'notifications'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className='flex items-center space-x-2'>
              <Bell className='h-4 w-4' />
              <span>Notification Settings</span>
            </div>
          </button>
        </nav>
      </div>

      {/* SMTP Configuration Tab */}
      {activeTab === 'smtp' && (
        <div className='space-y-6'>
          {/* Enable/Disable Toggle */}
          <div className='bg-white rounded-lg border border-gray-200 p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <h3 className='text-lg font-medium text-gray-900'>Email Notifications</h3>
                <p className='text-sm text-gray-600'>Enable or disable email notifications system-wide</p>
              </div>
              <label className='relative inline-flex items-center cursor-pointer'>
                <input
                  type='checkbox'
                  checked={emailConfig.isEnabled}
                  onChange={(e) => handleEmailConfigChange('isEnabled', e.target.checked)}
                  className='sr-only peer'
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>

          {/* SMTP Server Settings */}
          <div className='bg-white rounded-lg border border-gray-200 p-6'>
            <h3 className='text-lg font-medium text-gray-900 mb-4'>SMTP Server Settings</h3>
            
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  SMTP Host *
                </label>
                <input
                  type='text'
                  value={emailConfig.smtpHost}
                  onChange={(e) => handleEmailConfigChange('smtpHost', e.target.value)}
                  placeholder='smtp.gmail.com'
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  SMTP Port *
                </label>
                <input
                  type='number'
                  value={emailConfig.smtpPort}
                  onChange={(e) => handleEmailConfigChange('smtpPort', parseInt(e.target.value))}
                  placeholder='587'
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Username *
                </label>
                <input
                  type='text'
                  value={emailConfig.smtpUser}
                  onChange={(e) => handleEmailConfigChange('smtpUser', e.target.value)}
                  placeholder='your-email@gmail.com'
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Password {emailConfig.hasPassword ? '(Leave blank to keep current)' : '*'}
                </label>
                <div className='relative'>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    placeholder={emailConfig.hasPassword ? '••••••••' : 'Enter password'}
                    className='w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword(!showPassword)}
                    className='absolute inset-y-0 right-0 pr-3 flex items-center'
                  >
                    {showPassword ? (
                      <EyeOff className='h-4 w-4 text-gray-400' />
                    ) : (
                      <Eye className='h-4 w-4 text-gray-400' />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className='mt-4'>
              <label className='flex items-center'>
                <input
                  type='checkbox'
                  checked={emailConfig.smtpSecure}
                  onChange={(e) => handleEmailConfigChange('smtpSecure', e.target.checked)}
                  className='rounded border-gray-300 text-primary-600 focus:ring-primary-500'
                />
                <span className='ml-2 text-sm text-gray-700'>Use SSL/TLS (recommended for port 465)</span>
              </label>
            </div>
          </div>

          {/* From Address Settings */}
          <div className='bg-white rounded-lg border border-gray-200 p-6'>
            <h3 className='text-lg font-medium text-gray-900 mb-4'>From Address Settings</h3>
            
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  From Email *
                </label>
                <input
                  type='email'
                  value={emailConfig.fromEmail}
                  onChange={(e) => handleEmailConfigChange('fromEmail', e.target.value)}
                  placeholder='noreply@company.com'
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  From Name *
                </label>
                <input
                  type='text'
                  value={emailConfig.fromName}
                  onChange={(e) => handleEmailConfigChange('fromName', e.target.value)}
                  placeholder='Timesheet Management System'
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                />
              </div>
            </div>
          </div>

          {/* Test Email */}
          {emailConfig.isEnabled && (
            <div className='bg-blue-50 rounded-lg border border-blue-200 p-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <h3 className='text-lg font-medium text-blue-900'>Test Email Configuration</h3>
                  <p className='text-sm text-blue-700'>Send a test email to verify your settings</p>
                  {emailConfig.lastTestAt && (
                    <p className='text-xs text-blue-600 mt-1'>
                      Last tested: {new Date(emailConfig.lastTestAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleTestEmail}
                  disabled={isTesting || !emailConfig.smtpHost}
                  className='flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  <TestTube className='h-4 w-4' />
                  <span>{isTesting ? 'Sending...' : 'Send Test Email'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notification Settings Tab */}
      {activeTab === 'notifications' && (
        <div className='space-y-6'>
          <div className='bg-white rounded-lg border border-gray-200 p-6'>
            <h3 className='text-lg font-medium text-gray-900 mb-4'>Notification Types</h3>
            <p className='text-sm text-gray-600 mb-6'>
              Control which types of notifications are sent via email. Users will still see in-app notifications.
            </p>

            <div className='space-y-4'>
              {[
                { key: 'timesheetSubmissionEnabled', label: 'Timesheet Submissions', description: 'Notify when staff submit timesheets for approval' },
                { key: 'timesheetApprovalEnabled', label: 'Timesheet Approvals', description: 'Notify when managers approve timesheets' },
                { key: 'timesheetDenialEnabled', label: 'Timesheet Denials', description: 'Notify when timesheets are denied or require changes' },
                { key: 'timesheetFinalApprovalEnabled', label: 'Final Approvals', description: 'Notify when HR gives final approval to timesheets' },
                { key: 'timesheetMessageEnabled', label: 'Timesheet Messages', description: 'Notify when messages are added to timesheets' },
                { key: 'userAccountEnabled', label: 'User Account Changes', description: 'Notify about account creation, suspension, etc.' },
                { key: 'reportDeliveryEnabled', label: 'Report Delivery', description: 'Email reports when requested' },
                { key: 'systemAlertsEnabled', label: 'System Alerts', description: 'Important system notifications and alerts' }
              ].map((setting) => (
                <div key={setting.key} className='flex items-center justify-between p-4 border border-gray-200 rounded-lg'>
                  <div>
                    <h4 className='text-sm font-medium text-gray-900'>{setting.label}</h4>
                    <p className='text-sm text-gray-600'>{setting.description}</p>
                  </div>
                  <label className='relative inline-flex items-center cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={notificationSettings[setting.key as keyof NotificationSettings]}
                      onChange={(e) => handleNotificationChange(setting.key as keyof NotificationSettings, e.target.checked)}
                      className='sr-only peer'
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className='flex justify-end'>
        <button
          onClick={handleSaveSettings}
          disabled={isLoading}
          className='flex items-center space-x-2 px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          <Save className='h-4 w-4' />
          <span>{isLoading ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>
    </div>
  )
} 