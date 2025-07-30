import { NextResponse } from 'next/server'
import { checkDatabaseConnection } from '@/lib/db-health'

export async function GET() {
  try {
    const startTime = Date.now()
    
    // Check database connection
    const dbHealthResult = await checkDatabaseConnection()
    const responseTime = Date.now() - startTime
    
    const health = {
      status: dbHealthResult.isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: dbHealthResult.isHealthy,
        responseTime: `${responseTime}ms`,
        connectionTime: dbHealthResult.connectionTime ? `${dbHealthResult.connectionTime}ms` : undefined,
        error: dbHealthResult.error
      },
      application: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npmpackage_version || '1.0.0'
      }
    }
    
    const statusCode = dbHealthResult.isHealthy ? 200 : 503
    
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