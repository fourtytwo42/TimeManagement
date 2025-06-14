import { NextRequest, NextResponse } from 'next/server'
import { checkDatabaseConnection } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()
    
    // Check database connection
    const isDatabaseHealthy = await checkDatabaseConnection()
    const responseTime = Date.now() - startTime
    
    const health = {
      status: isDatabaseHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: isDatabaseHealthy,
        responseTime: `${responseTime}ms`
      },
      application: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0'
      }
    }
    
    const statusCode = isDatabaseHealthy ? 200 : 503
    
    return NextResponse.json(health, { status: statusCode })
  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 