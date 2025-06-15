'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { apiClient } from '@/lib/api-client'
import { io, Socket } from 'socket.io-client'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  resourceId?: string | null
  createdAt: string
  readAt?: string | null
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (notificationId: string) => Promise<void>
  clearAllNotifications: () => Promise<void>
  refreshNotifications: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

interface NotificationProviderProps {
  children: ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user, isAuthenticated } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)

  // Initialize socket connection
  useEffect(() => {
    if (isAuthenticated && user) {
      const socketInstance = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000', {
        path: '/api/socket'
      })

      socketInstance.on('connect', () => {
        console.log('Connected to notification socket')
        socketInstance.emit('join-user-room', user.id)
      })

      socketInstance.on('new-notification', (notification: Notification) => {
        setNotifications(prev => [notification, ...prev])
      })

      socketInstance.on('notification-read', (notificationId: string) => {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)
        )
      })

      setSocket(socketInstance)

      return () => {
        socketInstance.disconnect()
      }
    }
  }, [isAuthenticated, user])

  // Fetch notifications on mount and when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchNotifications()
    } else {
      setNotifications([])
      setIsLoading(false)
    }
  }, [isAuthenticated, user])

  const fetchNotifications = async () => {
    try {
      setIsLoading(true)
      const data = await apiClient.get('/api/notifications')
      setNotifications(data)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await apiClient.patch(`/api/notifications/${notificationId}/read`)
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await apiClient.patch('/api/notifications/read-all')
      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      )
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      await apiClient.delete(`/api/notifications/${notificationId}`)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const clearAllNotifications = async () => {
    try {
      await apiClient.delete('/api/notifications/clear-all')
      setNotifications([])
    } catch (error) {
      console.error('Error clearing all notifications:', error)
    }
  }

  const refreshNotifications = async () => {
    await fetchNotifications()
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    refreshNotifications
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
} 