'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import ManagerApprovalsView from './ManagerApprovalsView'
import { CheckCircle, Clock, Users, AlertCircle } from 'lucide-react'

export default function ManagerDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/auth/signin')
        return
      }

      if (user?.role !== 'MANAGER') {
        router.push('/')
        return
      }
    }
  }, [isAuthenticated, user, isLoading, router])

  if (isLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center'>
        <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600'></div>
      </div>
    )
  }

  if (!isAuthenticated || !user || user.role !== 'MANAGER') {
    return null
  }

  const currentDate = new Date()
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className='min-h-screen bg-gradient-to-br from-green-50 to-emerald-100'>
      <div className='max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'>
        <div className='px-4 py-6 sm:px-0'>
          {/* Header Section */}
          <div className='mb-8 animate-fade-in'>
            <div className='bg-white rounded-2xl shadow-lg p-8 border border-gray-100'>
              <div className='flex items-center justify-between'>
                <div>
                  <h1 className='text-4xl font-bold text-gray-900 mb-2'>
                    Manager Dashboard 📊
                  </h1>
                  <p className='text-lg text-gray-600'>
                    Welcome, {user.name}! Review and approve your team's timesheets for {monthName}.
                  </p>
                </div>
                <div className='hidden md:block'>
                  <div className='h-20 w-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg'>
                    <CheckCircle className='h-10 w-10 text-white' />
                  </div>
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mt-8'>
                <div className='bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-blue-100 text-sm font-medium'>Pending Reviews</p>
                      <p className='text-2xl font-bold'>0</p>
                      <p className='text-blue-100 text-sm'>Awaiting Approval</p>
                    </div>
                    <Clock className='h-8 w-8 text-blue-200' />
                  </div>
                </div>
                
                <div className='bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-green-100 text-sm font-medium'>Team Members</p>
                      <p className='text-2xl font-bold'>1</p>
                      <p className='text-green-100 text-sm'>Direct Reports</p>
                    </div>
                    <Users className='h-8 w-8 text-green-200' />
                  </div>
                </div>
                
                <div className='bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-orange-100 text-sm font-medium'>Action Required</p>
                      <p className='text-2xl font-bold'>0</p>
                      <p className='text-orange-100 text-sm'>Urgent Items</p>
                    </div>
                    <AlertCircle className='h-8 w-8 text-orange-200' />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Approvals Section */}
          <div className='animate-slide-up'>
            <ManagerApprovalsView />
          </div>
        </div>
      </div>
    </div>
  )
} 