'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { User, Lock, Mail, Eye, EyeOff } from 'lucide-react'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage('')

    try {
      const success = await login(email, password)
      if (success) {
        router.push('/')
      } else {
        setErrorMessage('Invalid email or password')
      }
    } catch (err) {
      setErrorMessage('An error occurred during login')
    } finally {
      setIsLoading(false)
    }
  }

  const demoUsers = [
    { email: 'hr@company.com', password: 'password123', role: 'HR', description: 'HR Dashboard Access' },
    { email: 'manager@company.com', password: 'password123', role: 'Manager', description: 'Manager Approvals' },
    { email: 'alice@company.com', password: 'password123', role: 'Staff', description: 'Staff Timesheet' },
    { email: 'bob@company.com', password: 'password123', role: 'Staff', description: 'Staff Timesheet' },
    { email: 'carol@company.com', password: 'password123', role: 'Staff', description: 'Staff Timesheet' }
  ]

  const fillDemoCredentials = (demoUser: typeof demoUsers[0]) => {
    setEmail(demoUser.email)
    setPassword(demoUser.password)
    setErrorMessage('')
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-4xl w-full'>
        <div className='text-center mb-8'>
          <h1 className='text-4xl font-bold text-gray-900 mb-2'>TimeManagement System</h1>
          <p className='text-lg text-gray-600'>Sign in to access your timesheet dashboard</p>
        </div>

        <div className='grid md:grid-cols-2 gap-8'>
          {/* Login Form */}
          <div className='bg-white rounded-lg shadow-xl p-8'>
            <div className='text-center mb-6'>
              <h2 className='text-2xl font-bold text-gray-900'>Sign In</h2>
              <p className='text-gray-600 mt-2'>Enter your credentials to continue</p>
            </div>

            <form onSubmit={handleSubmit} className='space-y-6'>
              <div>
                <label htmlFor='email' className='block text-sm font-medium text-gray-700 mb-2'>
                  Email Address
                </label>
                <div className='relative'>
                  <Mail className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5' />
                  <input
                    id='email'
                    name='email'
                    type='email'
                    autoComplete='email'
                    required
                    className='pl-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                    placeholder='Enter your email'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor='password' className='block text-sm font-medium text-gray-700 mb-2'>
                  Password
                </label>
                <div className='relative'>
                  <Lock className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5' />
                  <input
                    id='password'
                    name='password'
                    type={showPassword ? 'text' : 'password'}
                    autoComplete='current-password'
                    required
                    className='pl-10 pr-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                    placeholder='Enter your password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type='button'
                    className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600'
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className='h-5 w-5' /> : <Eye className='h-5 w-5' />}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div className='bg-red-50 border border-red-200 rounded-md p-3'>
                  <p className='text-red-600 text-sm'>{errorMessage}</p>
                </div>
              )}

              <button
                type='submit'
                disabled={isLoading}
                className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {isLoading ? (
                  <div className='flex items-center'>
                    <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                    Signing in...
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className='mt-6 text-center'>
              <p className='text-sm text-gray-600'>
                Don't have an account?{' '}
                <a href='/auth/register' className='font-medium text-indigo-600 hover:text-indigo-500'>
                  Register here
                </a>
              </p>
            </div>
          </div>

          {/* Demo Users */}
          <div className='bg-white rounded-lg shadow-xl p-8'>
            <div className='text-center mb-6'>
              <h3 className='text-xl font-bold text-gray-900'>Demo Accounts</h3>
              <p className='text-gray-600 mt-2'>Click any account to auto-fill credentials</p>
            </div>

            <div className='space-y-4'>
              {demoUsers.map((user, index) => (
                <button
                  key={index}
                  onClick={() => fillDemoCredentials(user)}
                  className='w-full p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors duration-200 text-left'
                >
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center space-x-3'>
                      <div className='flex-shrink-0'>
                        <div className='w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center'>
                          <User className='h-4 w-4 text-indigo-600' />
                        </div>
                      </div>
                      <div>
                        <p className='text-sm font-medium text-gray-900'>{user.email}</p>
                        <p className='text-xs text-gray-500'>{user.description}</p>
                      </div>
                    </div>
                    <div className='text-right'>
                      <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800'>
                        {user.role}
                      </span>
                      <p className='text-xs text-gray-500 mt-1'>password123</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className='mt-6 p-4 bg-blue-50 rounded-lg'>
              <h4 className='text-sm font-medium text-blue-900 mb-2'>System Features</h4>
              <ul className='text-xs text-blue-800 space-y-1'>
                <li>• Staff: Create and submit timesheets</li>
                <li>• Manager: Review and approve timesheets</li>
                <li>• HR: Full system access and reporting</li>
                <li>• Digital signatures and notifications</li>
                <li>• PLAWA hours tracking</li>
              </ul>
            </div>
          </div>
        </div>

        <div className='text-center mt-8'>
          <p className='text-sm text-gray-500'>
            This is a demo system. All data is stored locally and will be reset on restart.
          </p>
        </div>
      </div>
    </div>
  )
} 