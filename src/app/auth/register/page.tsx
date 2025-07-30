'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Lock, Mail, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-toastify'
import { useAuth } from '@/contexts/AuthContext'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
    role: 'STAFF'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const router = useRouter()
  const { loginWithToken } = useAuth()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Calculate password strength when password changes
    if (name === 'password') {
      let strength = 0
      if (value.length >= 6) strength++
      if (/[a-z]/.test(value)) strength++
      if (/[A-Z]/.test(value)) strength++
      if (/\d/.test(value)) strength++
      if (/[^a-zA-Z0-9]/.test(value)) strength++
      setPasswordStrength(strength)
    }
  }

  const validateForm = () => {
    if (!formData.email || !formData.name || !formData.password || !formData.confirmPassword) {
      toast.error('All fields are required')
      return false
    }

    if (formData.name.trim().length < 2) {
      toast.error('Name must be at least 2 characters long')
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address')
      return false
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return false
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/
    if (!passwordRegex.test(formData.password)) {
      toast.error('Password must contain at least one uppercase letter, one lowercase letter, and one number')
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const response = await apiClient.post('/api/auth/register', {
        email: formData.email.trim(),
        name: formData.name.trim(),
        password: formData.password,
        role: formData.role
      })

      if (response.success && response.user && response.token) {
        // Automatically log the user in
        loginWithToken(response.user, response.token)
        
        toast.success('Registration successful! Welcome to TimeManagement!')
        
        // Redirect to appropriate dashboard based on role
        switch (response.user.role) {
          case 'HR':
          case 'ADMIN':
            router.push('/hr')
            break
          case 'MANAGER':
            router.push('/manager')
            break
          case 'STAFF':
          default:
            router.push('/staff')
            break
        }
      } else {
        toast.error(response.error || 'Registration failed')
      }
    } catch (error: any) {
      console.error('Registration error:', error)
      const errorMessage = error.response?.data?.error || 'Registration failed. Please try again.'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const roles = [
    { value: 'STAFF', label: 'Staff Member', description: 'Create and submit timesheets' },
    { value: 'MANAGER', label: 'Manager', description: 'Review and approve timesheets' },
    { value: 'HR', label: 'HR Representative', description: 'Full system access and reporting' },
    { value: 'ADMIN', label: 'Administrator', description: 'Complete system control' }
  ]

  const getPasswordStrengthColor = (strength: number) => {
    if (strength <= 1) return 'bg-red-500'
    if (strength <= 2) return 'bg-orange-500'
    if (strength <= 3) return 'bg-yellow-500'
    if (strength <= 4) return 'bg-blue-500'
    return 'bg-green-500'
  }

  const getPasswordStrengthText = (strength: number) => {
    if (strength <= 1) return 'Very Weak'
    if (strength <= 2) return 'Weak'
    if (strength <= 3) return 'Fair'
    if (strength <= 4) return 'Good'
    return 'Strong'
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full'>
        <div className='text-center mb-8'>
          <h1 className='text-4xl font-bold text-gray-900 mb-2'>TimeManagement System</h1>
          <p className='text-lg text-gray-600'>Create your account</p>
        </div>

        <div className='bg-white rounded-lg shadow-xl p-8'>
          <div className='text-center mb-6'>
            <h2 className='text-2xl font-bold text-gray-900'>Register</h2>
            <p className='text-gray-600 mt-2'>Fill in your details to create an account</p>
          </div>

          <form onSubmit={handleSubmit} className='space-y-6'>
            {/* Name Field */}
            <div>
              <label htmlFor='name' className='block text-sm font-medium text-gray-700 mb-2'>
                Full Name
              </label>
              <div className='relative'>
                <User className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5' />
                <input
                  id='name'
                  name='name'
                  type='text'
                  autoComplete='name'
                  required
                  className='pl-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                  placeholder='Enter your full name'
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Email Field */}
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
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Role Field */}
            <div>
              <label htmlFor='role' className='block text-sm font-medium text-gray-700 mb-2'>
                Role
              </label>
              <select
                id='role'
                name='role'
                required
                className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                value={formData.role}
                onChange={handleInputChange}
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label} - {role.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Password Field */}
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
                  autoComplete='new-password'
                  required
                  className='pl-10 pr-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                  placeholder='Enter your password'
                  value={formData.password}
                  onChange={handleInputChange}
                />
                <button
                  type='button'
                  className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600'
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className='h-5 w-5' /> : <Eye className='h-5 w-5' />}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className='mt-2'>
                  <div className='flex items-center justify-between text-xs text-gray-600 mb-1'>
                    <span>Password strength:</span>
                    <span className={`font-medium ${getPasswordStrengthColor(passwordStrength).replace('bg-', 'text-')}`}>
                      {getPasswordStrengthText(passwordStrength)}
                    </span>
                  </div>
                  <div className='w-full bg-gray-200 rounded-full h-2'>
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength)}`}
                      style={{ width: `${(passwordStrength / 5) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor='confirmPassword' className='block text-sm font-medium text-gray-700 mb-2'>
                Confirm Password
              </label>
              <div className='relative'>
                <Lock className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5' />
                <input
                  id='confirmPassword'
                  name='confirmPassword'
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete='new-password'
                  required
                  className='pl-10 pr-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                  placeholder='Confirm your password'
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                />
                <button
                  type='button'
                  className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600'
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className='h-5 w-5' /> : <Eye className='h-5 w-5' />}
                </button>
              </div>
            </div>

            <button
              type='submit'
              disabled={isLoading}
              className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {isLoading ? (
                <div className='flex items-center'>
                  <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                  Creating account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className='mt-6 text-center'>
            <p className='text-sm text-gray-600'>
              Already have an account?{' '}
              <a href='/auth/signin' className='font-medium text-indigo-600 hover:text-indigo-500'>
                Sign in here
              </a>
            </p>
          </div>

          <div className='mt-6 pt-6 border-t border-gray-200'>
            <button
              onClick={() => router.push('/auth/signin')}
              className='w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
            >
              <ArrowLeft className='w-4 h-4 mr-2' />
              Back to Sign In
            </button>
          </div>
        </div>

        <div className='text-center mt-8'>
          <p className='text-sm text-gray-500'>
            By creating an account, you agree to our terms of service and privacy policy.
          </p>
        </div>
      </div>
    </div>
  )
} 