'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { io, Socket } from 'socket.io-client'
import { Send, MessageCircle } from 'lucide-react'

interface Message {
  id: string
  content: string
  sender: {
    id: string
    name: string
  }
  createdAt: string
}

interface ChatWindowProps {
  type: 'timesheet' | 'conversation'
  roomId: string
  title: string
  className?: string
}

export default function ChatWindow({ type, roomId, title, className = '' }: ChatWindowProps) {
  const { user } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return

    // Initialize socket connection
    const socketInstance = io({
      path: '/api/socket',
      addTrailingSlash: false,
    })

    socketInstance.on('connect', () => {
      console.log('Connected to socket server')
      setIsConnected(true)
      
      // Join the appropriate room
      if (type === 'timesheet') {
        socketInstance.emit('join-timesheet', roomId)
      } else {
        socketInstance.emit('join-conversation', roomId)
      }
    })

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from socket server')
      setIsConnected(false)
    })

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      setIsConnected(false)
    })

    // Listen for new messages
    const messageEvent = type === 'timesheet' ? 'new-timesheet-message' : 'new-private-message'
    socketInstance.on(messageEvent, (message: Message) => {
      console.log('Received message:', message)
      setMessages(prev => [...prev, message])
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [roomId, type, user])

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = () => {
    if (!socket || !newMessage.trim() || !user || !isConnected) return

    const messageData = {
      [type === 'timesheet' ? 'timesheetId' : 'conversationId']: roomId,
      content: newMessage.trim(),
      sender: {
        id: user.id,
        name: user.name || 'Unknown User'
      }
    }

    const event = type === 'timesheet' ? 'send-timesheet-message' : 'send-private-message'
    socket.emit(event, messageData)
    
    setNewMessage('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <MessageCircle className="w-5 h-5 text-gray-500 mr-2" />
            <h3 className="text-sm font-medium text-gray-900">{title}</h3>
          </div>
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-500 ml-2">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="h-64 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender.id === user?.id ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg text-sm ${
                  message.sender.id === user?.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {message.sender.id !== user?.id && (
                  <div className="text-xs font-medium mb-1 opacity-75">
                    {message.sender.name}
                  </div>
                )}
                <div>{message.content}</div>
                <div className={`text-xs mt-1 opacity-75`}>
                  {new Date(message.createdAt).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 resize-none border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
            rows={1}
            disabled={!isConnected}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || !isConnected}
            className="bg-primary-600 text-white p-2 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        {!isConnected && (
          <div className="text-xs text-red-500 mt-1">
            Chat is disconnected. Messages cannot be sent.
          </div>
        )}
      </div>
    </div>
  )
} 