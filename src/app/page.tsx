'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { Clock, Users, CheckCircle, FileText, ArrowRight, Shield, Zap, BarChart3 } from 'lucide-react'

export default function HomePage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // Redirect authenticated users to their role-specific dashboard
      const roleRedirects = {
        STAFF: '/staff',
        MANAGER: '/manager',
        HR: '/hr',
        ADMIN: '/hr'
      }
      const redirectPath = roleRedirects[user.role as keyof typeof roleRedirects] || '/staff'
      router.push(redirectPath)
    }
  }, [isAuthenticated, user, isLoading, router])

  if (isLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center'>
        <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600'></div>
      </div>
    )
  }

  if (isAuthenticated) {
    return null // Will redirect via useEffect
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50'>
      {/* Hero Section */}
      <div className='flex items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8'>
        <div className='max-w-4xl w-full'>
          <div className='text-center animate-fade-in'>
            <div className='mx-auto h-24 w-24 bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl flex items-center justify-center shadow-2xl animate-bounce-slow mb-8'>
              <Clock className='h-12 w-12 text-white' />
            </div>
            
            <h1 className='text-4xl md:text-6xl font-bold text-gray-900 mb-6 animate-slide-up'>
              Timesheet Management
              <span className='block text-primary-600'>Made Simple</span>
            </h1>
            
            <p className='text-xl text-gray-600 mb-8 max-w-2xl mx-auto animate-slide-up'>
              Streamline your timesheet workflow with digital signatures, real-time approvals, 
              and automated reporting. Built for modern teams.
            </p>
            
            <div className='animate-slide-up'>
              <Link
                href='/auth/signin'
                className='inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-xl text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 group'
              >
                Get Started
                <ArrowRight className='ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200' />
              </Link>
            </div>
          </div>
          
          {/* Features Grid */}
          <div className='mt-20 animate-slide-up'>
            <div className='text-center mb-12'>
              <h2 className='text-3xl font-bold text-gray-900 mb-4'>
                Everything you need for timesheet management
              </h2>
              <p className='text-lg text-gray-600'>
                Powerful features designed to make time tracking effortless
              </p>
            </div>
            
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
              <div className='bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group'>
                <div className='h-12 w-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200'>
                  <CheckCircle className='h-6 w-6 text-white' />
                </div>
                <h3 className='text-xl font-semibold text-gray-900 mb-3'>Digital Signatures</h3>
                <p className='text-gray-600'>
                  Secure digital signatures at every approval step. No more paper trails or lost documents.
                </p>
              </div>
              
              <div className='bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group'>
                <div className='h-12 w-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200'>
                  <Users className='h-6 w-6 text-white' />
                </div>
                <h3 className='text-xl font-semibold text-gray-900 mb-3'>Role-Based Access</h3>
                <p className='text-gray-600'>
                  Staff, Manager, and HR roles with appropriate permissions and workflows.
                </p>
              </div>
              
              <div className='bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group'>
                <div className='h-12 w-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200'>
                  <BarChart3 className='h-6 w-6 text-white' />
                </div>
                <h3 className='text-xl font-semibold text-gray-900 mb-3'>Smart Reports</h3>
                <p className='text-gray-600'>
                  Automated reporting with CSV and PDF export. Perfect for payroll and auditing.
                </p>
              </div>
              
              <div className='bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group'>
                <div className='h-12 w-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200'>
                  <Zap className='h-6 w-6 text-white' />
                </div>
                <h3 className='text-xl font-semibold text-gray-900 mb-3'>Real-Time Updates</h3>
                <p className='text-gray-600'>
                  Instant notifications and live chat for seamless communication and approvals.
                </p>
              </div>
              
              <div className='bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group'>
                <div className='h-12 w-12 bg-gradient-to-br from-red-400 to-red-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200'>
                  <Shield className='h-6 w-6 text-white' />
                </div>
                <h3 className='text-xl font-semibold text-gray-900 mb-3'>Secure & Reliable</h3>
                <p className='text-gray-600'>
                  Enterprise-grade security with automated backups and data protection.
                </p>
              </div>
              
              <div className='bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group'>
                <div className='h-12 w-12 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200'>
                  <FileText className='h-6 w-6 text-white' />
                </div>
                <h3 className='text-xl font-semibold text-gray-900 mb-3'>Easy Workflow</h3>
                <p className='text-gray-600'>
                  Intuitive bi-monthly timesheet creation with automatic pay-period detection.
                </p>
              </div>
            </div>
          </div>
          
          {/* CTA Section */}
          <div className='mt-20 text-center animate-slide-up'>
            <div className='bg-gradient-to-r from-primary-600 to-primary-700 rounded-3xl p-12 shadow-2xl'>
              <h2 className='text-3xl font-bold text-white mb-4'>
                Ready to streamline your timesheets?
              </h2>
              <p className='text-xl text-primary-100 mb-8'>
                Join thousands of teams already using TMS for efficient time management.
              </p>
              <Link
                href='/auth/signin'
                className='inline-flex items-center px-8 py-4 border-2 border-white text-lg font-medium rounded-xl text-primary-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 group'
              >
                Start Free Trial
                <ArrowRight className='ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200' />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 