import nodemailer from 'nodemailer'
import { prisma } from './db'

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

  constructor() {
    this.initialize()
  }

  private initialize() {
    try {
      const config: EmailConfig = {
        host: process.env.SMTP_HOST || '',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || ''
        }
      }

      // Check if email is configured
      if (config.host && config.auth.user && config.auth.pass) {
        this.transporter = nodemailer.createTransporter(config)
        this.isEnabled = true
        console.log('Email service initialized successfully')
      } else {
        console.log('Email service not configured - notifications will be disabled')
      }
    } catch (error) {
      console.error('Failed to initialize email service:', error)
      this.isEnabled = false
    }
  }

  public isEmailEnabled(): boolean {
    return this.isEnabled
  }

  public async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isEnabled || !this.transporter) {
      console.log('Email service not available - skipping email send')
      return false
    }

    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
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
    })
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

    return this.sendEmail({
      to: recipientEmail,
      subject: `Timesheet Status Update - ${timesheetPeriod}`,
      html
    })
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
          
          <div style="background-color: white; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p><strong>Report Type:</strong> ${reportType}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Filename:</strong> ${filename}</p>
          </div>
          
          <p>If you have any questions about this report, please contact HR.</p>
          
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
        content: reportData,
        contentType: filename.endsWith('.pdf') ? 'application/pdf' : 'text/csv'
      }]
    })
  }

  public async sendUserAccountNotification(
    recipientEmail: string,
    recipientName: string,
    action: 'created' | 'suspended' | 'reactivated' | 'deleted',
    temporaryPassword?: string
  ): Promise<boolean> {
    const actionMessages = {
      'created': 'Your account has been created',
      'suspended': 'Your account has been suspended',
      'reactivated': 'Your account has been reactivated',
      'deleted': 'Your account has been deleted'
    }

    const actionColors = {
      'created': '#28a745',
      'suspended': '#ffc107',
      'reactivated': '#28a745',
      'deleted': '#dc3545'
    }

    let additionalContent = ''
    if (action === 'created' && temporaryPassword) {
      additionalContent = `
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
          <p style="color: #856404; font-size: 14px;">Please change your password after your first login.</p>
        </div>
      `
    } else if (action === 'suspended') {
      additionalContent = `
        <p style="color: #856404;">If you believe this is an error, please contact HR for assistance.</p>
      `
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
            ${additionalContent}
          </div>
          
          <p>If you have any questions, please contact your HR department.</p>
          
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
    })
  }
}

// Export singleton instance
export const mailerService = new MailerService()

// Legacy exports for backward compatibility
export const sendEmail = (options: EmailOptions) => mailerService.sendEmail(options)
export const isEmailEnabled = () => mailerService.isEmailEnabled()

// Check if email notifications are enabled globally and for specific user
const isEmailEnabledGlobally = async (): Promise<boolean> => {
  // Check global setting
  const globalEnabled = process.env.EMAIL_NOTIFICATIONS_DEFAULT !== 'false'
  
  if (!globalEnabled) return false

  return true // Default to enabled if no global setting
}

// Send timesheet notification
export const sendTimesheetNotification = async (data: NotificationData): Promise<boolean> => {
  try {
    // Check if email is enabled for this user
    const emailEnabled = await isEmailEnabledGlobally()
    if (!emailEnabled) {
      console.log(`Email notifications disabled globally`)
      return true // Return true to not block the workflow
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { email: true, name: true }
    })

    if (!user) {
      console.error(`User not found: ${data.userId}`)
      return false
    }

    // Get timesheet details if provided
    let timesheetDetails = ''
    if (data.timesheetId) {
      const timesheet = await prisma.timesheet.findUnique({
        where: { id: data.timesheetId },
        include: {
          user: { select: { name: true } }
        }
      })

      if (timesheet) {
        timesheetDetails = `
          <p><strong>Timesheet Details:</strong></p>
          <ul>
            <li>Employee: ${timesheet.user.name}</li>
            <li>Period: ${new Date(timesheet.periodStart).toLocaleDateString()} - ${new Date(timesheet.periodEnd).toLocaleDateString()}</li>
            <li>Status: ${timesheet.state}</li>
          </ul>
        `
      }
    }

    const emailSubject = getEmailSubject(data.type)
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #3b82f6; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Timesheet Management Service</h1>
        </div>
        
        <div style="padding: 20px; background-color: #f9fafb;">
          <h2 style="color: #1f2937;">Hello ${user.name},</h2>
          
          <p style="color: #4b5563; line-height: 1.6;">${data.message}</p>
          
          ${timesheetDetails}
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}" 
               style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Timesheet System
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            This is an automated notification from the Timesheet Management Service. 
            You can disable these notifications in your account settings.
          </p>
        </div>
        
        <div style="background-color: #e5e7eb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
          © ${new Date().getFullYear()} Timesheet Management Service. All rights reserved.
        </div>
      </div>
    `

    return await sendEmail({
      to: user.email,
      subject: emailSubject,
      html: emailBody
    })
  } catch (error) {
    console.error('Error sending timesheet notification:', error)
    return false
  }
}

// Get email subject based on notification type
const getEmailSubject = (type: NotificationData['type']): string => {
  switch (type) {
    case 'submission':
      return 'Timesheet Submitted for Approval'
    case 'approval':
      return 'Timesheet Approved'
    case 'denial':
      return 'Timesheet Requires Revision'
    case 'final_approval':
      return 'Timesheet Finally Approved'
    default:
      return 'Timesheet Notification'
  }
}

// Test email configuration
export const testEmailConfiguration = async (): Promise<boolean> => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
    await transporter.verify()
    console.log('Email configuration is valid')
    return true
  } catch (error) {
    console.error('Email configuration error:', error)
    return false
  }
} 