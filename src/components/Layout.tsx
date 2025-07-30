'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Menu, X, Clock, Users, FileText, Settings, CheckCircle, LogOut, Bell, MessageCircle, Home, User } from 'lucide-react'
import NotificationDropdown from './NotificationDropdown'


// Define role constants to avoid Prisma client issues
const ROLES = {
  STAFF: 'STAFF',
  MANAGER: 'MANAGER',
  HR: 'HR',
  ADMIN: 'ADMIN'
} as const

type UserRole = typeof ROLES[keyof typeof ROLES]

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout, isAuthenticated } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!isAuthenticated || !user) {
    return <>{children}</>
  }

  const handleLogout = () => {
    logout()
    router.push('/auth/signin')
  }

  // Simplified navigation - only Dashboard for all roles
  const navigation = [
    {
      name: 'Dashboard',
      href: `/${user.role.toLowerCase()}`,
      icon: Home,
      roles: [ROLES.STAFF, ROLES.MANAGER, ROLES.HR, ROLES.ADMIN]
    }
  ]

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user.role as UserRole)
  )

  const isActive = (href: string) => {
    if (!pathname) return false
    if (href === `/${user.role.toLowerCase()}`) {
      return pathname === href
    }
    return pathname.startsWith(href.split('?')[0])
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className='fixed inset-0 bg-gray-600 bg-opacity-75' onClick={() => setSidebarOpen(false)} />
        <div className='relative flex w-full max-w-xs flex-1 flex-col bg-white'>
          <div className='absolute top-0 right-0 -mr-12 pt-2'>
            <button
              type='button'
              className='ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white'
              onClick={() => setSidebarOpen(false)}
            >
              <X className='h-6 w-6 text-white' />
            </button>
          </div>
          <div className='h-0 flex-1 overflow-y-auto pt-5 pb-4'>
            <div className='flex flex-shrink-0 items-center px-4'>
              <Clock className='h-8 w-8 text-primary-600' />
              <span className='ml-2 text-xl font-bold text-gray-900'>TMS</span>
            </div>
            <nav className='mt-5 space-y-1 px-2'>
              {filteredNavigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                      isActive(item.href)
                        ? 'bg-primary-100 text-primary-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className='mr-4 h-6 w-6 flex-shrink-0' />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className='flex flex-shrink-0 border-t border-gray-200 p-4'>
            <div className='group block w-full flex-shrink-0'>
              <div className='flex items-center'>
                <div className='ml-3'>
                  <p className='text-base font-medium text-gray-700'>{user.name}</p>
                  <p className='text-sm font-medium text-gray-500'>{user.role}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className='hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col'>
        <div className='flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white'>
          <div className='flex flex-1 flex-col overflow-y-auto pt-5 pb-4'>
            <div className='flex flex-shrink-0 items-center px-4'>
              <Clock className='h-8 w-8 text-primary-600' />
              <span className='ml-2 text-xl font-bold text-gray-900'>Timesheet MS</span>
            </div>
            <nav className='mt-5 flex-1 space-y-1 bg-white px-2'>
              {filteredNavigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                      isActive(item.href)
                        ? 'bg-primary-100 text-primary-900 border-r-2 border-primary-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className='mr-3 h-5 w-5 flex-shrink-0' />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className='flex flex-shrink-0 border-t border-gray-200 p-4'>
            <div className='group block w-full flex-shrink-0'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center'>
                  <div className='h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center'>
                    <span className='text-sm font-medium text-primary-600'>
                      {user.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className='ml-3'>
                    <p className='text-sm font-medium text-gray-700'>{user.name}</p>
                    <p className='text-xs font-medium text-gray-500'>{user.role}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className='text-gray-400 hover:text-gray-600 transition-colors duration-200'
                  title='Sign out'
                >
                  <LogOut className='h-5 w-5' />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className='lg:pl-64 flex flex-col flex-1'>
        {/* Top bar */}
        <div className='sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200 print:hidden'>
          <div className='flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8'>
            <button
              type='button'
              className='border-r border-gray-200 px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 lg:hidden'
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className='h-6 w-6' />
            </button>
            
            <div className='flex items-center space-x-4'>
              <div className='text-sm text-gray-500'>
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
              
              <div className='flex items-center space-x-2'>
                <NotificationDropdown />
              </div>
            </div>
          </div>
        </div>
        
        {/* Print header - date only */}
        <div className='hidden print:block print:bg-white print:border-b print:border-gray-300 print:py-2 print:px-4'>
          <div className='print:text-center'>
            <div className='print:text-sm print:font-medium print:text-black'>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className='flex-1'>
          <div className='py-6'>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
} 