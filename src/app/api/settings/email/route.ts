import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt-auth'
import { prisma } from '@/lib/db'
import { encrypt, decrypt } from '@/lib/encryption'

// Local constants to replace Prisma enums
const ROLES = {
  HR: 'HR',
  ADMIN: 'ADMIN'
} as const

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const user = verifyToken(token)

    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    if (user.role !== 'HR' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get current email configuration
    const emailConfig = await prisma.emailConfiguration.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    // Get notification settings
    const notificationSettings = await prisma.notificationSettings.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    // Don't return the actual password, just indicate if it's set
    const response = {
      emailConfig: emailConfig ? {
        id: emailConfig.id,
        smtpHost: emailConfig.smtpHost,
        smtpPort: emailConfig.smtpPort,
        smtpSecure: emailConfig.smtpSecure,
        smtpUser: emailConfig.smtpUser,
        hasPassword: !!emailConfig.smtpPassword,
        fromEmail: emailConfig.fromEmail,
        fromName: emailConfig.fromName,
        isEnabled: emailConfig.isEnabled,
        testEmailSent: emailConfig.testEmailSent,
        lastTestAt: emailConfig.lastTestAt
      } : null,
      notificationSettings: notificationSettings || {
        timesheetSubmissionEnabled: true,
        timesheetApprovalEnabled: true,
        timesheetDenialEnabled: true,
        timesheetFinalApprovalEnabled: true,
        timesheetMessageEnabled: true,
        userAccountEnabled: true,
        reportDeliveryEnabled: true,
        systemAlertsEnabled: true
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching email settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const user = verifyToken(token)

    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    if (user.role !== 'HR' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { emailConfig, notificationSettings } = body

    let savedEmailConfig = null
    let savedNotificationSettings = null

    // Save email configuration if provided
    if (emailConfig) {
      const {
        smtpHost,
        smtpPort,
        smtpSecure,
        smtpUser,
        smtpPassword,
        fromEmail,
        fromName,
        isEnabled
      } = emailConfig

      // Validate required fields
      if (!smtpHost || !smtpPort || !smtpUser || !fromEmail || !fromName) {
        return NextResponse.json(
          { error: 'Missing required email configuration fields' },
          { status: 400 }
        )
      }

      // Encrypt password if provided
      let encryptedPassword = null
      if (smtpPassword) {
        encryptedPassword = encrypt(smtpPassword)
      } else {
        // If no password provided, keep the existing one
        const existingConfig = await prisma.emailConfiguration.findFirst({
          orderBy: { createdAt: 'desc' }
        })
        encryptedPassword = existingConfig?.smtpPassword || null
      }

      // Create new email configuration
      savedEmailConfig = await prisma.emailConfiguration.create({
        data: {
          smtpHost,
          smtpPort: parseInt(smtpPort),
          smtpSecure: smtpSecure === true,
          smtpUser,
          smtpPassword: encryptedPassword,
          fromEmail,
          fromName,
          isEnabled: isEnabled === true,
          createdBy: user.id
        }
      })
    }

    // Save notification settings if provided
    if (notificationSettings) {
      savedNotificationSettings = await prisma.notificationSettings.create({
        data: {
          ...notificationSettings,
          createdBy: user.id
        }
      })
    }

    return NextResponse.json({
      message: 'Settings saved successfully',
      emailConfig: savedEmailConfig ? {
        id: savedEmailConfig.id,
        smtpHost: savedEmailConfig.smtpHost,
        smtpPort: savedEmailConfig.smtpPort,
        smtpSecure: savedEmailConfig.smtpSecure,
        smtpUser: savedEmailConfig.smtpUser,
        hasPassword: !!savedEmailConfig.smtpPassword,
        fromEmail: savedEmailConfig.fromEmail,
        fromName: savedEmailConfig.fromName,
        isEnabled: savedEmailConfig.isEnabled
      } : null,
      notificationSettings: savedNotificationSettings
    })
  } catch (error) {
    console.error('Error saving email settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const user = verifyToken(token)

    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    if (user.role !== 'HR' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { action } = await request.json()

    if (action === 'test') {
      // Test email configuration
      const emailConfig = await prisma.emailConfiguration.findFirst({
        where: { isEnabled: true },
        orderBy: { createdAt: 'desc' }
      })

      if (!emailConfig) {
        return NextResponse.json(
          { error: 'No email configuration found' },
          { status: 400 }
        )
      }

      // Import mailer service dynamically to test
      const { testEmailConfiguration } = await import('@/lib/mailer')
      const testResult = await testEmailConfiguration()

      if (testResult) {
        // Update test status
        await prisma.emailConfiguration.update({
          where: { id: emailConfig.id },
          data: {
            testEmailSent: true,
            lastTestAt: new Date()
          }
        })

        return NextResponse.json({ message: 'Test email sent successfully' })
      } else {
        return NextResponse.json(
          { error: 'Failed to send test email' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error testing email configuration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 