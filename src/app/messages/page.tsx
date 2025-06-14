'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-toastify'
import Layout from '@/components/Layout'
import { 
  Mail, 
  Send, 
  Reply, 
  Trash2, 
  Search, 
  Plus,
  ArrowLeft,
  User,
  Calendar
} from 'lucide-react'

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
  receiver: {
    id: string
    name: string
    email: string
  }
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

export default function MessagesPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox')
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [showReply, setShowReply] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [composeForm, setComposeForm] = useState({
    receiverId: '',
    subject: '',
    content: ''
  })
  const [replyForm, setReplyForm] = useState({
    subject: '',
    content: ''
  })
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchMessages()
    fetchUsers()
  }, [activeTab])

  const fetchMessages = async () => {
    setLoading(true)
    try {
      const data = await apiClient.get(`/api/messages?type=${activeTab === 'inbox' ? 'received' : 'sent'}`)
      setMessages(data)
    } catch (error) {
      console.error('Error fetching messages:', error)
      toast.error('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      // Get users based on role permissions
      if (user?.role === 'HR' || user?.role === 'ADMIN') {
        const data = await apiClient.get('/api/hr/users')
        setUsers(data.filter((u: User) => u.id !== user?.id))
      } else if (user?.role === 'MANAGER') {
        // Get direct reports and HR users
        const data = await apiClient.get('/api/hr/users')
        setUsers(data.filter((u: User) => 
          u.id !== user?.id && (u.role === 'HR' || u.role === 'ADMIN' || u.role === 'STAFF')
        ))
      } else {
        // Staff can message their manager and HR
        const data = await apiClient.get('/api/hr/users')
        setUsers(data.filter((u: User) => 
          u.id !== user?.id && (u.role === 'HR' || u.role === 'ADMIN' || u.role === 'MANAGER')
        ))
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const markAsRead = async (messageId: string) => {
    try {
      await apiClient.patch(`/api/messages/${messageId}`, { isRead: true })
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, isRead: true } : msg
      ))
    } catch (error) {
      console.error('Error marking message as read:', error)
    }
  }

  const handleMessageClick = async (message: Message) => {
    setSelectedMessage(message)
    if (!message.isRead && activeTab === 'inbox') {
      await markAsRead(message.id)
    }
  }

  const handleCompose = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)

    try {
      await apiClient.post('/api/messages', composeForm)
      toast.success('Message sent successfully')
      setShowCompose(false)
      setComposeForm({
        receiverId: '',
        subject: '',
        content: ''
      })
      if (activeTab === 'sent') {
        fetchMessages()
      }
    } catch (error: any) {
      console.error('Error sending message:', error)
      toast.error(error.response?.data?.error || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMessage) return

    setSending(true)

    try {
      await apiClient.post('/api/messages', {
        receiverId: selectedMessage.sender.id,
        subject: replyForm.subject,
        content: replyForm.content
      })
      toast.success('Reply sent successfully')
      setShowReply(false)
      setReplyForm({
        subject: '',
        content: ''
      })
      // Refresh messages to show the reply
      fetchMessages()
    } catch (error: any) {
      console.error('Error sending reply:', error)
      toast.error(error.response?.data?.error || 'Failed to send reply')
    } finally {
      setSending(false)
    }
  }

  const filteredMessages = messages.filter(message => {
    const searchLower = searchTerm.toLowerCase()
    const senderName = activeTab === 'inbox' ? message.sender.name : message.receiver.name
    return (
      message.subject.toLowerCase().includes(searchLower) ||
      message.content.toLowerCase().includes(searchLower) ||
      senderName.toLowerCase().includes(searchLower)
    )
  })

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
            <p className="text-gray-600 mt-2">Send and receive internal messages</p>
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex space-x-4">
                  <button
                    onClick={() => setActiveTab('inbox')}
                    className={`px-4 py-2 text-sm font-medium rounded-md ${
                      activeTab === 'inbox'
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Inbox ({messages.filter(m => !m.isRead && activeTab === 'inbox').length})
                  </button>
                  <button
                    onClick={() => setActiveTab('sent')}
                    className={`px-4 py-2 text-sm font-medium rounded-md ${
                      activeTab === 'sent'
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Sent
                  </button>
                </div>
                <button
                  onClick={() => setShowCompose(true)}
                  className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <Plus className="w-4 h-4 mr-1 inline" />
                  Compose
                </button>
              </div>
            </div>

            <div className="flex h-96">
              {/* Message List */}
              <div className="w-1/3 border-r border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search messages..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
                <div className="overflow-y-auto h-full">
                  {loading ? (
                    <div className="p-4 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                    </div>
                  ) : filteredMessages.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No messages found
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {filteredMessages.map((message) => (
                        <div
                          key={message.id}
                          onClick={() => handleMessageClick(message)}
                          className={`p-4 cursor-pointer hover:bg-gray-50 ${
                            selectedMessage?.id === message.id ? 'bg-primary-50' : ''
                          } ${
                            !message.isRead && activeTab === 'inbox' ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${
                                !message.isRead && activeTab === 'inbox' ? 'font-semibold' : 'font-medium'
                              } text-gray-900 truncate`}>
                                {activeTab === 'inbox' ? message.sender.name : message.receiver.name}
                              </p>
                              <p className={`text-sm ${
                                !message.isRead && activeTab === 'inbox' ? 'font-medium' : ''
                              } text-gray-700 truncate mt-1`}>
                                {message.subject}
                              </p>
                              <p className="text-sm text-gray-500 truncate mt-1">
                                {message.content}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <p className="text-xs text-gray-400">
                                  {new Date(message.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            {!message.isRead && activeTab === 'inbox' && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1"></div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Message Content */}
              <div className="flex-1 flex flex-col">
                {selectedMessage ? (
                  <>
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-medium text-gray-900">
                          {selectedMessage.subject}
                        </h2>
                        <div className="flex items-center space-x-2">
                          {activeTab === 'inbox' && (
                            <button
                              onClick={() => {
                                setReplyForm({
                                  subject: `Re: ${selectedMessage.subject}`,
                                  content: ''
                                })
                                setShowReply(true)
                              }}
                              className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                            >
                              <Reply className="w-4 h-4 mr-1 inline" />
                              Reply
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          {activeTab === 'inbox' ? 'From' : 'To'}: {
                            activeTab === 'inbox' ? selectedMessage.sender.name : selectedMessage.receiver.name
                          }
                        </div>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(selectedMessage.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 p-6">
                      <div className="prose max-w-none">
                        <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Select a message to read</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCompose(false)} />

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Compose Message</h3>
                <button
                  onClick={() => setShowCompose(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCompose} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">To</label>
                  <select
                    required
                    value={composeForm.receiverId}
                    onChange={(e) => setComposeForm({ ...composeForm, receiverId: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select recipient</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Subject</label>
                  <input
                    type="text"
                    required
                    value={composeForm.subject}
                    onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter subject"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Message</label>
                  <textarea
                    required
                    rows={6}
                    value={composeForm.content}
                    onChange={(e) => setComposeForm({ ...composeForm, content: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter your message"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCompose(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4 mr-1 inline" />
                    {sending ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reply Modal */}
      {showReply && selectedMessage && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowReply(false)} />

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Reply to {selectedMessage.sender.name}
                </h3>
                <button
                  onClick={() => setShowReply(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleReply} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Subject</label>
                  <input
                    type="text"
                    required
                    value={replyForm.subject}
                    onChange={(e) => setReplyForm({ ...replyForm, subject: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Message</label>
                  <textarea
                    required
                    rows={6}
                    value={replyForm.content}
                    onChange={(e) => setReplyForm({ ...replyForm, content: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter your reply"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowReply(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4 mr-1 inline" />
                    {sending ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
} 