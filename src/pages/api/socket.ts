import { Server as NetServer } from 'http'
import { NextApiRequest, NextApiResponse } from 'next'
import { Server as ServerIO } from 'socket.io'

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: ServerIO
    }
  }
}

export default function SocketHandler(
  req: NextApiRequest,
  res: NextApiResponseServerIO
) {
  if (!res.socket.server.io) {
    console.log('Setting up Socket.IO server...')
    
    const io = new ServerIO(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
      }
    })

    io.on('connection', (socket) => {
      console.log(`Socket connected: ${socket.id}`)

      // Join timesheet rooms
      socket.on('join-timesheet', (timesheetId: string) => {
        socket.join(`timesheet-${timesheetId}`)
        console.log(`Socket ${socket.id} joined timesheet room: ${timesheetId}`)
      })

      // Join conversation rooms
      socket.on('join-conversation', (conversationId: string) => {
        socket.join(`conversation-${conversationId}`)
        console.log(`Socket ${socket.id} joined conversation: ${conversationId}`)
      })

      // Handle timesheet messages
      socket.on('send-timesheet-message', (data: {
        timesheetId: string
        content: string
        sender: { id: string; name: string }
      }) => {
        const message = {
          id: Date.now().toString(),
          content: data.content,
          sender: data.sender,
          createdAt: new Date().toISOString()
        }
        
        io.to(`timesheet-${data.timesheetId}`).emit('new-timesheet-message', message)
      })

      // Handle private messages
      socket.on('send-private-message', (data: {
        conversationId: string
        content: string
        sender: { id: string; name: string }
      }) => {
        const message = {
          id: Date.now().toString(),
          content: data.content,
          sender: data.sender,
          createdAt: new Date().toISOString()
        }
        
        io.to(`conversation-${data.conversationId}`).emit('new-private-message', message)
      })

      // Handle notifications
      socket.on('send-notification', (data: {
        userId: string
        message: string
        type: string
      }) => {
        socket.broadcast.emit('notification', {
          message: data.message,
          type: data.type,
          timestamp: new Date().toISOString()
        })
      })

      socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`)
      })
    })

    res.socket.server.io = io
  }

  res.end()
} 