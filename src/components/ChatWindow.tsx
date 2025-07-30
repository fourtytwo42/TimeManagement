'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Send, Paperclip, Smile } from 'lucide-react'
import { apiClient } from '@/lib/api-client'

interface Message {
  id: string
  content: string
  sender: string
  timestamp: Date
  isOwn: boolean
}

interface ChatWindowProps {
  timesheetId: string
  isOpen: boolean
  onClose: () => void
}

export default function ChatWindow({ timesheetId, isOpen, onClose }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      fetchMessages()
    }
  }, [isOpen, timesheetId])

  const fetchMessages = async () => {
    try {
      const data = await apiClient.get(`/api/timesheet/${timesheetId}/messages`)
      setMessages(data || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    setIsLoading(true)
    try {
      await apiClient.post(`/api/timesheet/${timesheetId}/messages`, {
        content: newMessage
      })

      setNewMessage('')
      await fetchMessages()
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-lg shadow-xl w-full max-w-2xl h-[600px] flex flex-col'>
        {/* Header */}
        <div className='flex items-center justify-between p-4 border-b'>
          <h3 className='text-lg font-semibold'>Timesheet Messages</h3>
          <button
            onClick={onClose}
            className='text-gray-500 hover:text-gray-700'
          >
            ×
          </button>
        </div>

        {/* Messages */}
        <div className='flex-1 overflow-y-auto p-4 space-y-4'>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.isOwn
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className='text-sm'>{message.content}</p>
                <p className='text-xs opacity-75 mt-1'>
                  {new Date(message.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className='p-4 border-t'>
          <div className='flex items-center space-x-2'>
            <button className='text-gray-500 hover:text-gray-700'>
              <Paperclip className='h-5 w-5' />
            </button>
            <button className='text-gray-500 hover:text-gray-700'>
              <Smile className='h-5 w-5' />
            </button>
            <input
              type='text'
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder='Type a message...'
              className='flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !newMessage.trim()}
              className='bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 disabled:opacity-50'
            >
              <Send className='h-5 w-5' />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 