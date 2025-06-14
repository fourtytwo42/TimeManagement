'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-toastify'
import { format } from 'date-fns'
import { Send, User, MessageSquare } from 'lucide-react'

interface TimesheetMessage {
  id: string
  content: string
  createdAt: string
  sender: {
    id: string
    name: string
    role: string
  }
}

interface TimesheetCommentsProps {
  timesheetId: string
  readOnly?: boolean
}

export default function TimesheetComments({ timesheetId, readOnly = false }: TimesheetCommentsProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<TimesheetMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchMessages()
  }, [timesheetId])

  const fetchMessages = async () => {
    try {
      const data = await apiClient.get(`/api/timesheet/${timesheetId}/messages`)
      setMessages(data)
    } catch (error) {
      console.error('Error fetching timesheet messages:', error)
      toast.error('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      const message = await apiClient.post(`/api/timesheet/${timesheetId}/messages`, {
        content: newMessage.trim()
      })
      
      setMessages(prev => [...prev, message])
      setNewMessage('')
      toast.success('Message sent')
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'STAFF':
        return 'bg-blue-100 text-blue-800'
      case 'MANAGER':
        return 'bg-green-100 text-green-800'
      case 'HR':
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900">Timesheet Discussion</h3>
          <span className="text-sm text-gray-500">({messages.length} messages)</span>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Leave comments and questions about this timesheet. All participants (staff, manager, HR) can see these messages.
        </p>
      </div>

      <div className="h-96 flex flex-col">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No messages yet</p>
                <p className="text-sm">Start the conversation about this timesheet</p>
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.sender.id === user?.id
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-1' : 'order-2'}`}>
                    <div
                      className={`px-4 py-2 rounded-lg ${
                        isOwnMessage
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <div className={`flex items-center mt-1 space-x-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(message.sender.role)}`}>
                        {message.sender.role}
                      </span>
                      <span className="text-xs text-gray-500">
                        {message.sender.name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {format(new Date(message.createdAt), 'MMM d, h:mm a')}
                      </span>
                    </div>
                  </div>
                  
                  <div className={`flex-shrink-0 ${isOwnMessage ? 'order-2 ml-2' : 'order-1 mr-2'}`}>
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Message Input */}
        {!readOnly && (
          <div className="border-t border-gray-200 p-4">
            <div className="flex space-x-2">
              <div className="flex-1">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message about this timesheet..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                  disabled={sending}
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        )}
      </div>
    </div>
  )
} 