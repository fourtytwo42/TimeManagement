import { NextRequest, NextResponse } from 'next/server'
import { login } from '@/lib/jwt-auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const result = await login({ email, password })

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
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 