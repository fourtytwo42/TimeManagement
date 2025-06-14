import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt-auth'
import { prisma } from '@/lib/db'
import { Role } from '@prisma/client'

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

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'received' // 'sent' or 'received'
    const threadId = searchParams.get('threadId') // For getting specific thread

    if (threadId) {
      // Get specific thread with all replies
      const thread = await prisma.message.findFirst({
        where: {
          id: threadId,
          OR: [
            { senderId: user.id },
            { receiverId: user.id }
          ]
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          receiver: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          replies: {
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              },
              receiver: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      })

      if (!thread) {
        return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
      }

      return NextResponse.json(thread)
    }

    let messages
    if (type === 'sent') {
      messages = await prisma.message.findMany({
        where: { 
          senderId: user.id,
          parentId: null // Only get root messages, not replies
        },
        include: {
          receiver: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          replies: {
            select: {
              id: true,
              createdAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    } else {
      messages = await prisma.message.findMany({
        where: { 
          receiverId: user.id,
          parentId: null // Only get root messages, not replies
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          replies: {
            select: {
              id: true,
              createdAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    return NextResponse.json(messages)
  } catch (error) {
    console.error('Error fetching messages:', error)
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

    const body = await request.json()
    const { receiverId, subject, content, parentId } = body

    if (!receiverId || !content) {
      return NextResponse.json(
        { error: 'Receiver ID and content are required' },
        { status: 400 }
      )
    }

    // If this is a reply, get the parent message to determine subject and receiver
    let finalReceiverId = receiverId
    let finalSubject = subject

    if (parentId) {
      const parentMessage = await prisma.message.findFirst({
        where: {
          id: parentId,
          OR: [
            { senderId: user.id },
            { receiverId: user.id }
          ]
        }
      })

      if (!parentMessage) {
        return NextResponse.json({ error: 'Parent message not found' }, { status: 404 })
      }

      // For replies, send to the other participant in the conversation
      finalReceiverId = parentMessage.senderId === user.id ? parentMessage.receiverId : parentMessage.senderId
      finalSubject = parentMessage.subject.startsWith('Re: ') ? parentMessage.subject : `Re: ${parentMessage.subject}`
    }

    if (!finalSubject) {
      return NextResponse.json(
        { error: 'Subject is required for new messages' },
        { status: 400 }
      )
    }

    // Check if receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: finalReceiverId },
      select: { id: true, role: true, managerId: true }
    })

    if (!receiver) {
      return NextResponse.json({ error: 'Receiver not found' }, { status: 404 })
    }

    // Check permissions - HR can message anyone, Manager can only message subordinates
    if (user.role === Role.MANAGER) {
      // Manager can only message their direct reports
      const isDirectReport = await prisma.user.findFirst({
        where: {
          id: finalReceiverId,
          managerId: user.id
        }
      })

      if (!isDirectReport) {
        return NextResponse.json(
          { error: 'You can only send messages to your direct reports' },
          { status: 403 }
        )
      }
    } else if (user.role === Role.STAFF) {
      // Staff can only message their manager or HR
      if (receiver.role !== Role.HR && receiver.role !== Role.ADMIN && receiver.id !== user.id) {
        const currentUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { managerId: true }
        })

        if (!currentUser?.managerId || receiver.id !== currentUser.managerId) {
          return NextResponse.json(
            { error: 'You can only send messages to your manager or HR' },
            { status: 403 }
          )
        }
      }
    }
    // HR and ADMIN can message anyone (no additional checks needed)

    // Create the message
    const message = await prisma.message.create({
      data: {
        senderId: user.id,
        receiverId: finalReceiverId,
        parentId: parentId || null,
        subject: finalSubject,
        content
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 