'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Send, MessageCircle } from 'lucide-react'
import { apiClient } from '@/lib/api-client'

interface Comment {
  id: string
  content: string
  sender: {
    id: string
    name: string
    role: string
  }
  createdAt: string
}

interface TimesheetCommentsProps {
  timesheetId: string
}

export default function TimesheetComments({ timesheetId }: TimesheetCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (shouldScrollToBottom && !isLoading) {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      setShouldScrollToBottom(false)
    }
  }, [comments, shouldScrollToBottom, isLoading])

  useEffect(() => {
    fetchComments()
  }, [timesheetId])

  const fetchComments = async () => {
    try {
      setIsLoading(true)
      const data = await apiClient.get(`/api/timesheet/${timesheetId}/messages`)
      setComments(data || [])
    } catch (error) {
      console.error('Error fetching comments:', error)
      setComments([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await apiClient.post(`/api/timesheet/${timesheetId}/messages`, {
        content: newComment
      })

      setNewComment('')
      setShouldScrollToBottom(true) // Trigger scroll only when adding new comment
      await fetchComments() // Refresh comments after adding
    } catch (error) {
      console.error('Error adding comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className='bg-white rounded-lg border border-gray-200 print:hidden'>
      <div className='px-4 py-3 border-b border-gray-200'>
        <div className='flex items-center'>
          <MessageCircle className='w-5 h-5 text-gray-500 mr-2' />
          <h3 className='text-lg font-medium text-gray-900'>Comments</h3>
          <span className='ml-2 text-sm text-gray-500'>({comments.length})</span>
        </div>
      </div>

      <div className='h-64 overflow-y-auto p-4 space-y-4'>
        {isLoading ? (
          <div className='text-center text-gray-500 py-8'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2'></div>
            <p>Loading comments...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className='text-center text-gray-500 py-8'>
            <MessageCircle className='w-8 h-8 mx-auto mb-2 text-gray-300' />
            <p>No comments yet. Start the conversation!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className='flex space-x-3'>
              <div className='flex-shrink-0'>
                <div className='w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center'>
                  <span className='text-white text-sm font-medium'>
                    {comment.sender?.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
              </div>
              <div className='flex-1 min-w-0'>
                <div className='bg-gray-50 rounded-lg px-3 py-2'>
                  <div className='flex items-center justify-between mb-1'>
                    <span className='text-sm font-medium text-gray-900'>
                      {comment.sender?.name || 'Unknown User'}
                    </span>
                    <span className='text-xs text-gray-500'>
                      {new Date(comment.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className='text-sm text-gray-700'>{comment.content}</p>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={commentsEndRef} />
      </div>

      <div className='px-4 py-3 border-t border-gray-200'>
        <form onSubmit={handleSubmit} className='flex space-x-2'>
          <input
            type='text'
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder='Add a comment...'
            className='flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            disabled={isSubmitting}
          />
          <button
            type='submit'
            disabled={isSubmitting || !newComment.trim()}
            className='bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            <Send className='w-4 h-4' />
          </button>
        </form>
      </div>
    </div>
  )
} 