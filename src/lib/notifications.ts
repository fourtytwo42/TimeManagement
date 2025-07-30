import { prisma } from '@/lib/db'
import { io } from 'socket.io-client'

interface CreateNotificationData {
  userId: string
  type: string
  title: string
  message: string
  resourceId?: string
}

export async function createNotification(data: CreateNotificationData) {
  try {
    // Create notification in database
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        resourceId: data.resourceId || null
      }
    })

    // Send real-time notification via socket if available
    try {
      const socket = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000', {
        path: '/api/socket'
      })
      
      socket.emit('send-notification', {
        userId: data.userId,
        notification
      })
      
      socket.disconnect()
    } catch (socketError) {
      console.error('Failed to send real-time notification:', socketError)
      // Don't fail the notification creation if socket fails
    }

    return notification
  } catch (error) {
    console.error('Error creating notification:', error)
    throw error
  }
}

// Function to automatically fulfill notifications when user interacts with the resource
export async function fulfillNotifications(
  userId: string,
  resourceId: string,
  actionType: 'timesheet_viewed' | 'timesheet_approved' | 'timesheetdenied' | 'message_sent'
) {
  try {
    // Define which notification types should be fulfilled based on the action
    const fulfillmentMap: Record<string, string[]> = {
      timesheet_viewed: [
        'manager_approval_needed',
        'hr_approval_needed',
        'timesheet_message',
        'timesheetdenial'
      ],
      timesheet_approved: [
        'manager_approval_needed'
      ],
      timesheetdenied: [
        'manager_approval_needed'
      ],
      message_sent: [
        'timesheet_message'
      ]
    }

    const typesToFulfill = fulfillmentMap[actionType] || []
    
    if (typesToFulfill.length > 0) {
      // Delete fulfilled notifications
      await prisma.notification.deleteMany({
        where: {
          userId,
          resourceId,
          type: {
            in: typesToFulfill
          }
        }
      })
    }
  } catch (error) {
    console.error('Error fulfilling notifications:', error)
    // Don't throw error as this is a background operation
  }
}

// Essential timesheet workflow notifications
export async function createTimesheetNotification(
  userId: string,
  type: 'submission' | 'approval' | 'denial' | 'final_approval',
  timesheetId: string,
  additionalMessage?: string
) {
  const titles = {
    submission: 'Timesheet Submitted',
    approval: 'Timesheet Approved by Manager',
    denial: 'Timesheet Requires Attention',
    final_approval: 'Timesheet Fully Approved'
  }

  const messages = {
    submission: 'Your timesheet has been submitted for manager approval.',
    approval: 'Your timesheet has been approved by your manager and sent to HR.',
    denial: 'Your timesheet has been returned and requires changes.',
    final_approval: 'Your timesheet has been fully approved by HR.'
  }

  return createNotification({
    userId,
    type: `timesheet_${type}`,
    title: titles[type],
    message: additionalMessage || messages[type],
    resourceId: timesheetId
  })
}

// Timesheet message notifications
export async function createTimesheetMessageNotification(
  recipientUserId: string,
  senderName: string,
  timesheetId: string,
  messageContent: string
) {
  return createNotification({
    userId: recipientUserId,
    type: 'timesheet_message',
    title: 'New Timesheet Message',
    message: `${senderName} sent a message: '${messageContent.substring(0, 100)}${messageContent.length > 100 ? '...' : ''}'`,
    resourceId: timesheetId
  })
}

// Manager approval needed notification
export async function createManagerApprovalNotification(
  managerId: string,
  staffName: string,
  timesheetId: string
) {
  return createNotification({
    userId: managerId,
    type: 'manager_approval_needed',
    title: 'Timesheet Awaiting Approval',
    message: `${staffName} has submitted a timesheet that requires your approval.`,
    resourceId: timesheetId
  })
}

// HR approval needed notification
export async function createHRApprovalNotification(
  hrUserId: string,
  staffName: string,
  timesheetId: string
) {
  return createNotification({
    userId: hrUserId,
    type: 'hr_approval_needed',
    title: 'Timesheet Awaiting HR Approval',
    message: `${staffName}'s timesheet has been approved by their manager and requires HR approval.`,
    resourceId: timesheetId
  })
} 