import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { generateToken } from '@/lib/jwt-auth'

export async function POST(request: NextRequest) {
  try {
    // Check if request has a body
    const contentType = request.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { success: false, error: 'Content-Type must be application/json' },
        { status: 400 }
      )
    }

    // Get the raw body text first to check if it's empty
    const bodyText = await request.text()
    if (!bodyText || bodyText.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Request body cannot be empty' },
        { status: 400 }
      )
    }

    // Parse JSON with proper error handling
    let body
    try {
      body = JSON.parse(bodyText)
    } catch (parseError) {
      console.error('JSON parsing error:', parseError)
      console.error('Raw body:', bodyText)
      return NextResponse.json(
        { success: false, error: 'Invalid JSON format in request body' },
        { status: 400 }
      )
    }

    // Validate required fields
    const { email, name, password, role } = body

    if (!email || !name || !password || !role) {
      return NextResponse.json(
        { success: false, error: 'Email, name, password, and role are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate name length
    if (typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Name must be at least 2 characters long' },
        { status: 400 }
      )
    }

    // Validate password length
    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Validate password strength (optional but recommended)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/
    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        { success: false, error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['STAFF', 'MANAGER', 'HR', 'ADMIN']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role. Must be one of: STAFF, MANAGER, HR, ADMIN' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        name: name.trim(),
        password: hashedPassword,
        role: role,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    })

    // Create auth user object for token generation
    const authUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any
    }

    // Generate JWT token
    const token = generateToken(authUser)

    return NextResponse.json({
      success: true,
      message: 'User registered successfully',
      user: authUser,
      token: token
    })

  } catch (error) {
    console.error('Registration API error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 