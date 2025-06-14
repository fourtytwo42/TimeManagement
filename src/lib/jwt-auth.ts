import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { prisma } from './db'
import { Role, UserStatus } from '@prisma/client'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key'
const JWT_EXPIRES_IN = '7d'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  success: boolean
  user?: AuthUser
  token?: string
  error?: string
}

// Generate JWT token
export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

// Verify JWT token
export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role
    }
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

// Login function
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    const { email, password } = credentials

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        password: true
      }
    })

    if (!user) {
      return {
        success: false,
        error: 'Invalid email or password'
      }
    }

    // Check if user is suspended
    if (user.status === UserStatus.SUSPENDED) {
      return {
        success: false,
        error: 'Your account has been suspended. Please contact HR for assistance.'
      }
    }

    // Check if user is inactive
    if (user.status === UserStatus.INACTIVE) {
      return {
        success: false,
        error: 'Your account is inactive. Please contact HR for assistance.'
      }
    }

    // Verify password
    if (!user.password) {
      return {
        success: false,
        error: 'Invalid email or password'
      }
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return {
        success: false,
        error: 'Invalid email or password'
      }
    }

    // Create auth user object (without password)
    const authUser: AuthUser = {
      id: user.id,
      email: user.email!,
      name: user.name!,
      role: user.role
    }

    // Generate JWT token
    const token = generateToken(authUser)

    return {
      success: true,
      user: authUser,
      token
    }
  } catch (error) {
    console.error('Login error:', error)
    return {
      success: false,
      error: 'An error occurred during login'
    }
  }
}

// Get user by ID (for token refresh)
export async function getUserById(id: string): Promise<AuthUser | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true
      }
    })

    if (!user || user.status !== UserStatus.ACTIVE) {
      return null
    }

    return {
      id: user.id,
      email: user.email!,
      name: user.name!,
      role: user.role
    }
  } catch (error) {
    console.error('Get user by ID error:', error)
    return null
  }
}

// Middleware helper for API routes
export function requireAuth(allowedRoles?: Role[]) {
  return (req: any, res: any, next: any) => {
    // This is a middleware function for Express-style APIs
    // For Next.js API routes, we handle auth in each route
    next()
  }
} 