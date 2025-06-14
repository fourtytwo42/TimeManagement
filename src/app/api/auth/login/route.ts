import { NextRequest, NextResponse } from 'next/server'
import { login } from '@/lib/jwt-auth'

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
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
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

    // Validate password length
    if (typeof password !== 'string' || password.length < 1) {
      return NextResponse.json(
        { success: false, error: 'Password must be a non-empty string' },
        { status: 400 }
      )
    }

    const result = await login({ email: email.trim().toLowerCase(), password })

    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(
        result,
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Login API error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 