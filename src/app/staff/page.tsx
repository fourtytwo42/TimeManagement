'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Role } from '@prisma/client'
import StaffTimesheetView from './StaffTimesheetView'
import { Clock, Calendar, User, CheckCircle } from 'lucide-react'

export default function StaffDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/auth/signin')
        return
      }

      if (user?.role !== Role.STAFF) {
        router.push('/')
        return
      }
    }
  }, [isAuthenticated, user, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!isAuthenticated || !user || user.role !== Role.STAFF) {
    return null
  }

  const currentDate = new Date()
  const currentPeriod = currentDate.getDate() <= 15 ? '1st Half' : '2nd Half'
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header Section */}
          <div className="mb-8 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">
                    Welcome back, {user.name?.split(' ')[0]}! 👋
                  </h1>
                  <p className="text-lg text-gray-600">
                    Ready to manage your timesheet for {monthName}?
                  </p>
                </div>
                <div className="hidden md:block">
                  <div className="h-20 w-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Clock className="h-10 w-10 text-white" />
                  </div>
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Current Period</p>
                      <p className="text-2xl font-bold">{currentPeriod}</p>
                      <p className="text-blue-100 text-sm">{monthName}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-blue-200" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Your Role</p>
                      <p className="text-2xl font-bold">Staff Member</p>
                      <p className="text-green-100 text-sm">Active Employee</p>
                    </div>
                    <User className="h-8 w-8 text-green-200" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">Status</p>
                      <p className="text-2xl font-bold">Ready</p>
                      <p className="text-purple-100 text-sm">To Submit</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-purple-200" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Timesheet Section */}
          <div className="animate-slide-up">
            <StaffTimesheetView />
          </div>
        </div>
      </div>
    </div>
  )
} 