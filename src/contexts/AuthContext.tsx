'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { AuthUser } from '@/lib/jwt-auth'

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedToken = localStorage.getItem('auth_token')
        const storedUser = localStorage.getItem('auth_user')

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser)
          
          // Verify token is still valid by checking expiration
          const tokenPayload = JSON.parse(atob(storedToken.split('.')[1]))
          const currentTime = Date.now() / 1000
          
          if (tokenPayload.exp > currentTime) {
            setToken(storedToken)
            setUser(parsedUser)
          } else {
            // Token expired, clear storage
            localStorage.removeItem('auth_token')
            localStorage.removeItem('auth_user')
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        // Clear invalid data
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true)
      
      // Validate inputs before sending
      if (!email || !password) {
        return { success: false, error: 'Email and password are required' }
      }

      if (typeof email !== 'string' || typeof password !== 'string') {
        return { success: false, error: 'Email and password must be strings' }
      }

      const trimmedEmail = email.trim()
      if (!trimmedEmail) {
        return { success: false, error: 'Email cannot be empty' }
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(trimmedEmail)) {
        return { success: false, error: 'Please enter a valid email address' }
      }

      const requestBody = JSON.stringify({ 
        email: trimmedEmail.toLowerCase(), 
        password: password 
      })
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          console.error('Failed to parse error response:', errorText)
          return { success: false, error: `Server error: ${response.status}` }
        }
        return { success: false, error: errorData.error || 'Login failed' }
      }

      const data = await response.json()

      if (data.success && data.user && data.token) {
        // Store in localStorage
        localStorage.setItem('auth_token', data.token)
        localStorage.setItem('auth_user', JSON.stringify(data.user))
        
        // Update state
        setToken(data.token)
        setUser(data.user)
        
        return { success: true }
      } else {
        return { success: false, error: data.error || 'Login failed' }
      }
    } catch (error) {
      console.error('Login error:', error)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return { success: false, error: 'Network connection error. Please check your internet connection.' }
      }
      return { success: false, error: 'An unexpected error occurred. Please try again.' }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    // Clear localStorage
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    
    // Clear state
    setToken(null)
    setUser(null)
  }

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isLoading,
    isAuthenticated: !!user && !!token,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 