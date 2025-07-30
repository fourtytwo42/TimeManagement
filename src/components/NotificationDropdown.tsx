'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Bell, Check, X, Trash2 } from 'lucide-react'
import { useNotifications } from '@/contexts/NotificationContext'

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  isRead: boolean
  createdAt: string
}

export default function NotificationDropdown() {
  const { notifications, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const unreadCount = notifications.filter(n => !n.isRead).length

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id)
  }

  const handleDelete = async (id: string) => {
    await deleteNotification(id)
  }

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear all notifications?')) {
      await clearAllNotifications()
    }
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
  }

  return (
    <div className='relative' ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg'
      >
        <Bell className='h-6 w-6' />
        {unreadCount > 0 && (
          <span className='absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center'>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className='absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden'>
          <div className='p-4 border-b border-gray-200'>
            <div className='flex items-center justify-between'>
              <h3 className='text-lg font-semibold text-gray-900'>Notifications</h3>
              <div className='flex space-x-2'>
                <button
                  onClick={handleMarkAllAsRead}
                  className='text-sm text-blue-600 hover:text-blue-800'
                >
                  Mark all read
                </button>
                <button
                  onClick={handleClearAll}
                  className='text-sm text-red-600 hover:text-red-800'
                >
                  Clear all
                </button>
              </div>
            </div>
          </div>

          <div className='max-h-64 overflow-y-auto'>
            {notifications.length === 0 ? (
              <div className='p-4 text-center text-gray-500'>
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 last:border-b-0 ${
                    !notification.isRead ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className='flex items-start justify-between'>
                    <div className='flex-1'>
                      <h4 className='text-sm font-medium text-gray-900'>
                        {notification.title}
                      </h4>
                      <p className='text-sm text-gray-600 mt-1'>
                        {notification.message}
                      </p>
                      <p className='text-xs text-gray-400 mt-2'>
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className='flex space-x-1 ml-2'>
                      {!notification.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className='text-green-600 hover:text-green-800'
                          title='Mark as read'
                        >
                          <Check className='h-4 w-4' />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification.id)}
                        className='text-red-600 hover:text-red-800'
                        title='Delete'
                      >
                        <Trash2 className='h-4 w-4' />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
} 