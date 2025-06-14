'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api-client'
import { Mail, X } from 'lucide-react'
import Link from 'next/link'

interface Message {
  id: string
  subject: string
  content: string
  isRead: boolean
  createdAt: string
  sender: {
    id: string
    name: string
    email: string
  }
}

export default function MessageNotification() {
  const { user } = useAuth()
  const [unreadMessages, setUnreadMessages] = useState<Message[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      fetchUnreadMessages()
      // Poll for new messages every 30 seconds
      const interval = setInterval(fetchUnreadMessages, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  const fetchUnreadMessages = async () => {
    try {
      const messages = await apiClient.get('/api/messages?type=received')
      const unread = messages.filter((msg: Message) => !msg.isRead)
      setUnreadMessages(unread)
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const markAsRead = async (messageId: string) => {
    try {
      await apiClient.patch(`/api/messages/${messageId}`, { isRead: true })
      setUnreadMessages(prev => prev.filter(msg => msg.id !== messageId))
    } catch (error) {
      console.error('Error marking message as read:', error)
    }
  }

  const markAllAsRead = async () => {
    setLoading(true)
    try {
      await Promise.all(
        unreadMessages.map(msg => 
          apiClient.patch(`/api/messages/${msg.id}`, { isRead: true })
        )
      )
      setUnreadMessages([])
      setShowDropdown(false)
    } catch (error) {
      console.error('Error marking all messages as read:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user || unreadMessages.length === 0) {
    return null
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-md"
      >
        <Mail className="w-6 h-6" />
        {unreadMessages.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadMessages.length > 9 ? '9+' : unreadMessages.length}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Messages ({unreadMessages.length})
              </h3>
              <div className="flex items-center space-x-2">
                {unreadMessages.length > 0 && (
                  <button
                    onClick={markAllAsRead}
                    disabled={loading}
                    className="text-sm text-primary-600 hover:text-primary-800 disabled:opacity-50"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setShowDropdown(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {unreadMessages.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No unread messages
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {unreadMessages.slice(0, 5).map((message) => (
                  <div key={message.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {message.sender.name}
                          </p>
                          <button
                            onClick={() => markAsRead(message.id)}
                            className="ml-2 text-xs text-gray-500 hover:text-gray-700"
                          >
                            Mark read
                          </button>
                        </div>
                        <p className="text-sm font-medium text-gray-700 truncate mt-1">
                          {message.subject}
                        </p>
                        <p className="text-sm text-gray-500 truncate mt-1">
                          {message.content}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(message.createdAt).toLocaleDateString()} at{' '}
                          {new Date(message.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {unreadMessages.length > 5 && (
                  <div className="p-4 text-center">
                    <p className="text-sm text-gray-500">
                      {unreadMessages.length - 5} more messages...
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-200">
            <Link
              href="/messages"
              className="block w-full text-center bg-primary-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              onClick={() => setShowDropdown(false)}
            >
              View All Messages
            </Link>
          </div>
        </div>
      )}
    </div>
  )
} 