import nodemailer from 'nodemailer'
import { prisma } from './db'
import { decrypt } from './encryption'

interface EmailConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
}

interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

interface NotificationData {
  userId: string
  timesheetId?: string
  type: 'submission' | 'approval' | 'denial' | 'final_approval'
  message: string
}

class MailerService {
  private transporter: nodemailer.Transporter | null = null
  private isEnabled: boolean = false
  private fromEmail: string = ''
  private fromName: string = ''

  constructor() {
    this.initialize()
  }

  private async initialize() {
    try {
      await this.loadConfigurationFromDatabase()
    } catch (error) {
      console.error('Failed to initialize email service:', error)
      this.isEnabled = false
    }
  }

  private async loadConfigurationFromDatabase() {
    try {
      // Get the latest email configuration
      const emailConfig = await prisma.emailConfiguration.findFirst({
        where: { isEnabled: true },
        orderBy: { createdAt: 'desc' }
      })

      if (!emailConfig) {
        console.log('No email configuration found - notifications will be disabled')
        this.isEnabled = false
        return
      }

      // Decrypt password
      let decryptedPassword = ''
      if (emailConfig.smtpPassword) {
        // Decrypt the stored password
        decryptedPassword = decrypt(emailConfig.smtpPassword)
      }

      const config: EmailConfig = {
        host: emailConfig.smtpHost,
        port: emailConfig.smtpPort,
        secure: emailConfig.smtpSecure,
        auth: {
          user: emailConfig.smtpUser,
          pass: decryptedPassword
        }
      }

      this.fromEmail = emailConfig.fromEmail
      this.fromName = emailConfig.fromName

      // Create transporter
      this.transporter = nodemailer.createTransport(config)
      this.isEnabled = true
      console.log('Email service initialized successfully from database configuration')
    } catch (error) {
      console.error('Failed to load email configuration from database:', error)
      this.isEnabled = false
    }
  }

  public async refreshConfiguration() {
    await this.loadConfigurationFromDatabase()
  }

  public isEmailEnabled(): boolean {
    return this.isEnabled
  }

  private async isNotificationEnabled(type: string): Promise<boolean> {
    try {
      const settings = await prisma.notificationSettings.findFirst({
        orderBy: { createdAt: 'desc' }
      })

      if (!settings) return true // Default to enabled if no settings found

      switch (type) {
        case 'submission':
          return settings.timesheetSubmissionEnabled
        case 'approval':
          return settings.timesheetApprovalEnabled
        case 'denial':
          return settings.timesheetDenialEnabled
        case 'final_approval':
          return settings.timesheetFinalApprovalEnabled
        case 'message':
          return settings.timesheetMessageEnabled
        case 'user_account':
          return settings.userAccountEnabled
        case 'report':
          return settings.reportDeliveryEnabled
        case 'system':
          return settings.systemAlertsEnabled
        default:
          return true
      }
    } catch (error) {
      console.error('Error checking notification settings:', error)
      return true // Default to enabled on error
    }
  }

  public async sendEmail(options: EmailOptions, notificationType?: string): Promise<boolean> {
    if (!this.isEnabled || !this.transporter) {
      console.log('Email service not available - skipping email send')
      return false
    }

    // Check if this type of notification is enabled
    if (notificationType && !(await this.isNotificationEnabled(notificationType))) {
      console.log(`Notification type '${notificationType}' is disabled - skipping email send`)
      return false
    }

    try {
      const mailOptions = {
        from: `${this.fromName} <${this.fromEmail}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments
      }

      const result = await this.transporter.sendMail(mailOptions)
      console.log('Email sent successfully:', result.messageId)
      return true
    } catch (error) {
      console.error('Failed to send email:', error)
      return false
    }
  }

  // Timesheet notification templates
  public async sendTimesheetMessageNotification(
    recipientEmail: string,
    recipientName: string,
    senderName: string,
    timesheetPeriod: string,
    messageContent: string
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
          <h2 style="color: #333; margin-bottom: 20px;">New Timesheet Message</h2>
          
          <p>Hi ${recipientName},</p>
          
          <p>You have received a new message on your timesheet for the period <strong>${timesheetPeriod}</strong>.</p>
          
          <div style="background-color: white; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">
            <p><strong>From:</strong> ${senderName}</p>
            <p><strong>Message:</strong></p>
            <p style="font-style: italic;">"${messageContent}"</p>
          </div>
          
          <p>Please log in to your timesheet system to view the full conversation and respond if needed.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
            <p>This is an automated notification from the Timesheet Management System.</p>
          </div>
        </div>
      </div>
    `

    return this.sendEmail({
      to: recipientEmail,
      subject: `New Timesheet Message - ${timesheetPeriod}`,
      html
    }, 'message')
  }

  public async sendTimesheetStatusNotification(
    recipientEmail: string,
    recipientName: string,
    timesheetPeriod: string,
    status: string,
    note?: string
  ): Promise<boolean> {
    const statusMessages = {
      'APPROVED': 'Your timesheet has been approved!',
      'PENDING_MANAGER': 'Your timesheet is pending manager approval.',
      'PENDING_HR': 'Your timesheet is pending HR approval.',
      'DENIED': 'Your timesheet requires attention.'
    }

    const statusColors = {
      'APPROVED': '#28a745',
      'PENDING_MANAGER': '#007bff',
      'PENDING_HR': '#6f42c1',
      'DENIED': '#dc3545'
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
          <h2 style="color: #333; margin-bottom: 20px;">Timesheet Status Update</h2>
          
          <p>Hi ${recipientName},</p>
          
          <div style="background-color: white; padding: 20px; border-left: 4px solid ${statusColors[status as keyof typeof statusColors]}; margin: 20px 0;">
            <h3 style="color: ${statusColors[status as keyof typeof statusColors]}; margin-top: 0;">
              ${statusMessages[status as keyof typeof statusMessages]}
            </h3>
            <p><strong>Timesheet Period:</strong> ${timesheetPeriod}</p>
            <p><strong>Status:</strong> ${status.replace('PENDING_', '').replace('_', ' ')}</p>
            ${note ? `<p><strong>Note:</strong> ${note}</p>` : ''}
          </div>
          
          <p>Please log in to your timesheet system to view the details.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
            <p>This is an automated notification from the Timesheet Management System.</p>
          </div>
        </div>
      </div>
    `

    const notificationType = status === 'APPROVED' ? 'final_approval' : 
                            status === 'DENIED' ? 'denial' : 'approval'

    return this.sendEmail({
      to: recipientEmail,
      subject: `Timesheet Status Update - ${timesheetPeriod}`,
      html
    }, notificationType)
  }

  public async sendReportEmail(
    recipientEmail: string,
    recipientName: string,
    reportType: string,
    reportData: Buffer,
    filename: string
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
          <h2 style="color: #333; margin-bottom: 20px;">Timesheet Report</h2>
          
          <p>Hi ${recipientName},</p>
          
          <p>Your requested ${reportType} report is attached to this email.</p>
          
          <div style="background-color: white; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0;">
            <p><strong>Report Type:</strong> ${reportType}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Filename:</strong> ${filename}</p>
          </div>
          
          <p>Please find the report attached as a ${filename.split('.').pop()?.toUpperCase()} file.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
            <p>This is an automated notification from the Timesheet Management System.</p>
          </div>
        </div>
      </div>
    `

    return this.sendEmail({
      to: recipientEmail,
      subject: `Timesheet Report - ${reportType}`,
      html,
      attachments: [{
        filename,
        content: reportData
      }]
    }, 'report')
  }

  public async sendFinalApprovedTimesheetNotification(
    recipientEmail: string,
    recipientName: string,
    timesheetPeriod: string,
    totalHours: number,
    plawaHours: number,
    regularHours: number,
    approvedBy: string
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
          <h2 style="color: #333; margin-bottom: 20px;">🎉 Timesheet Fully Approved!</h2>
          
          <p>Hi ${recipientName},</p>
          
          <div style="background-color: white; padding: 20px; border-left: 4px solid #28a745; margin: 20px 0;">
            <h3 style="color: #28a745; margin-top: 0;">
              Your timesheet has been fully approved and is now final!
            </h3>
            <p><strong>Timesheet Period:</strong> ${timesheetPeriod}</p>
            <p><strong>Approved By:</strong> ${approvedBy} (HR)</p>
            <p><strong>Approval Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div style="background-color: #e8f5e8; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h4 style="color: #155724; margin-top: 0;">Hours Summary:</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 5px 0; border-bottom: 1px solid #c3e6c3;"><strong>Total Hours:</strong></td>
                <td style="padding: 5px 0; border-bottom: 1px solid #c3e6c3; text-align: right;">${totalHours.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; border-bottom: 1px solid #c3e6c3;">Regular Hours:</td>
                <td style="padding: 5px 0; border-bottom: 1px solid #c3e6c3; text-align: right;">${regularHours.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0;">PLAWA Hours:</td>
                <td style="padding: 5px 0; text-align: right;">${plawaHours.toFixed(2)}</td>
              </tr>
            </table>
          </div>
          
          <p>Your timesheet has completed the full approval process and is now locked for payroll processing. No further changes can be made to this timesheet.</p>
          
          <p>You can view the final approved timesheet by logging into the system.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
            <p>This is an automated notification from the Timesheet Management System.</p>
            <p>If you have any questions about your timesheet, please contact HR.</p>
          </div>
        </div>
      </div>
    `

    return this.sendEmail({
      to: recipientEmail,
      subject: `✅ Timesheet Fully Approved - ${timesheetPeriod}`,
      html
    }, 'final_approval')
  }

  public async sendUserAccountNotification(
    recipientEmail: string,
    recipientName: string,
    action: 'created' | 'suspended' | 'reactivated' | 'deleted',
    temporaryPassword?: string
  ): Promise<boolean> {
    const actionMessages = {
      'created': 'Your account has been created!',
      'suspended': 'Your account has been suspended.',
      'reactivated': 'Your account has been reactivated.',
      'deleted': 'Your account has been deleted.'
    }

    const actionColors = {
      'created': '#28a745',
      'suspended': '#ffc107',
      'reactivated': '#17a2b8',
      'deleted': '#dc3545'
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
          <h2 style="color: #333; margin-bottom: 20px;">Account Notification</h2>
          
          <p>Hi ${recipientName},</p>
          
          <div style="background-color: white; padding: 20px; border-left: 4px solid ${actionColors[action]}; margin: 20px 0;">
            <h3 style="color: ${actionColors[action]}; margin-top: 0;">
              ${actionMessages[action]}
            </h3>
            ${temporaryPassword ? `
              <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
              <p style="color: #dc3545; font-weight: bold;">Please change your password after your first login.</p>
            ` : ''}
          </div>
          
          ${action !== 'deleted' ? '<p>Please log in to your timesheet system to access your account.</p>' : ''}
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
            <p>This is an automated notification from the Timesheet Management System.</p>
          </div>
        </div>
      </div>
    `

    return this.sendEmail({
      to: recipientEmail,
      subject: `Account ${action.charAt(0).toUpperCase() + action.slice(1)} - Timesheet System`,
      html
    }, 'user_account')
  }
}

// Create singleton instance
const mailerService = new MailerService()

// Export functions
export const sendEmail = (options: EmailOptions, notificationType?: string) => 
  mailerService.sendEmail(options, notificationType)
export const isEmailEnabled = () => mailerService.isEmailEnabled()
export const refreshEmailConfiguration = () => mailerService.refreshConfiguration()
export const sendFinalApprovedTimesheetNotification = (
  recipientEmail: string,
  recipientName: string,
  timesheetPeriod: string,
  totalHours: number,
  plawaHours: number,
  regularHours: number,
  approvedBy: string
) => mailerService.sendFinalApprovedTimesheetNotification(
  recipientEmail,
  recipientName,
  timesheetPeriod,
  totalHours,
  plawaHours,
  regularHours,
  approvedBy
)

// Check if email notifications are enabled globally
const isEmailEnabledGlobally = async (): Promise<boolean> => {
  try {
    const emailConfig = await prisma.emailConfiguration.findFirst({
      where: { isEnabled: true },
      orderBy: { createdAt: 'desc' }
    })
    return !!emailConfig
  } catch (error) {
    return false
  }
}

export const sendTimesheetNotification = async (data: NotificationData): Promise<boolean> => {
  try {
    if (!(await isEmailEnabledGlobally())) {
      console.log('Email notifications are disabled globally')
      return false
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { email: true, name: true }
    })

    if (!user) {
      console.error('User not found for notification:', data.userId)
      return false
    }

    // Get timesheet details if provided
    let timesheetPeriod = 'Unknown Period'
    if (data.timesheetId) {
      const timesheet = await prisma.timesheet.findUnique({
        where: { id: data.timesheetId },
        select: { periodStart: true, periodEnd: true }
      })

      if (timesheet) {
        timesheetPeriod = `${new Date(timesheet.periodStart).toLocaleDateString()} - ${new Date(timesheet.periodEnd).toLocaleDateString()}`
      }
    }

    // Send appropriate notification based on type
    switch (data.type) {
      case 'submission':
        return await mailerService.sendTimesheetStatusNotification(
          user.email,
          user.name,
          timesheetPeriod,
          'PENDING_MANAGER'
        )
      
      case 'approval':
        return await mailerService.sendTimesheetStatusNotification(
          user.email,
          user.name,
          timesheetPeriod,
          'PENDING_HR'
        )
      
      case 'final_approval':
        return await mailerService.sendTimesheetStatusNotification(
          user.email,
          user.name,
          timesheetPeriod,
          'APPROVED'
        )
      
      case 'denial':
        return await mailerService.sendTimesheetStatusNotification(
          user.email,
          user.name,
          timesheetPeriod,
          'DENIED',
          data.message
        )
      
      default:
        console.error('Unknown notification type:', data.type)
        return false
    }
  } catch (error) {
    console.error('Failed to send timesheet notification:', error)
    return false
  }
}

const getEmailSubject = (type: NotificationData['type']): string => {
  switch (type) {
    case 'submission':
      return 'Timesheet Submitted for Review'
    case 'approval':
      return 'Timesheet Approved by Manager'
    case 'final_approval':
      return 'Timesheet Fully Approved'
    case 'denial':
      return 'Timesheet Requires Attention'
    default:
      return 'Timesheet Notification'
  }
}

export const testEmailConfiguration = async (): Promise<boolean> => {
  try {
    const emailConfig = await prisma.emailConfiguration.findFirst({
      where: { isEnabled: true },
      orderBy: { createdAt: 'desc' }
    })

    if (!emailConfig) {
      console.error('No email configuration found for testing')
      return false
    }

    // Refresh configuration to ensure we're using the latest settings
    await mailerService.refreshConfiguration()

    const testHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
          <h2 style="color: #333; margin-bottom: 20px;">Email Configuration Test</h2>
          
          <p>This is a test email to verify your email configuration is working correctly.</p>
          
          <div style="background-color: white; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0;">
            <p><strong>SMTP Host:</strong> ${emailConfig.smtpHost}</p>
            <p><strong>SMTP Port:</strong> ${emailConfig.smtpPort}</p>
            <p><strong>SMTP Secure:</strong> ${emailConfig.smtpSecure ? 'Yes' : 'No'}</p>
            <p><strong>From Email:</strong> ${emailConfig.fromEmail}</p>
            <p><strong>From Name:</strong> ${emailConfig.fromName}</p>
          </div>
          
          <p>If you received this email, your configuration is working correctly!</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
            <p>Test sent at: ${new Date().toLocaleString()}</p>
            <p>This is an automated test from the Timesheet Management System.</p>
          </div>
        </div>
      </div>
    `

    return await mailerService.sendEmail({
      to: emailConfig.fromEmail, // Send test email to the configured from address
      subject: 'Email Configuration Test - Timesheet Management System',
      html: testHtml
    }, 'system')
  } catch (error) {
    console.error('Failed to send test email:', error)
    return false
  }
} 