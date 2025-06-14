import { prisma } from './db'

export interface DatabaseHealth {
  isHealthy: boolean
  error?: string
  lastChecked: Date
  connectionTime?: number
}

class DatabaseHealthMonitor {
  private lastHealthCheck: DatabaseHealth | null = null
  private healthCheckInterval: NodeJS.Timeout | null = null
  private readonly CHECK_INTERVAL = 30000 // 30 seconds

  async checkHealth(): Promise<DatabaseHealth> {
    const startTime = Date.now()
    
    try {
      // Simple query to test connection
      await prisma.$queryRaw`SELECT 1`
      
      const connectionTime = Date.now() - startTime
      const health: DatabaseHealth = {
        isHealthy: true,
        lastChecked: new Date(),
        connectionTime
      }
      
      this.lastHealthCheck = health
      return health
    } catch (error) {
      const health: DatabaseHealth = {
        isHealthy: false,
        error: error instanceof Error ? error.message : 'Unknown database error',
        lastChecked: new Date()
      }
      
      this.lastHealthCheck = health
      console.error('Database health check failed:', health.error)
      return health
    }
  }

  async ensureConnection(): Promise<boolean> {
    const health = await this.checkHealth()
    
    if (!health.isHealthy) {
      console.warn('Database connection unhealthy, attempting to reconnect...')
      
      try {
        // Disconnect and reconnect
        await prisma.$disconnect()
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Test connection again
        const retryHealth = await this.checkHealth()
        return retryHealth.isHealthy
      } catch (error) {
        console.error('Failed to restore database connection:', error)
        return false
      }
    }
    
    return true
  }

  startMonitoring(): void {
    if (this.healthCheckInterval) {
      return // Already monitoring
    }

    console.log('Starting database health monitoring...')
    
    this.healthCheckInterval = setInterval(async () => {
      const health = await this.checkHealth()
      
      if (!health.isHealthy) {
        console.warn('Database health check failed, attempting recovery...')
        await this.ensureConnection()
      }
    }, this.CHECK_INTERVAL)
  }

  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
      console.log('Stopped database health monitoring')
    }
  }

  getLastHealthCheck(): DatabaseHealth | null {
    return this.lastHealthCheck
  }
}

// Singleton instance
export const dbHealthMonitor = new DatabaseHealthMonitor()

// Utility function for API routes
export async function withDatabaseHealth<T>(
  operation: () => Promise<T>
): Promise<T> {
  const isHealthy = await dbHealthMonitor.ensureConnection()
  
  if (!isHealthy) {
    throw new Error('Database connection is not available. Please try again later.')
  }
  
  try {
    return await operation()
  } catch (error) {
    // If it's a database connection error, try to recover
    if (error instanceof Error && error.message.includes('Unable to open the database file')) {
      console.error('Database connection lost during operation, attempting recovery...')
      
      const recovered = await dbHealthMonitor.ensureConnection()
      if (recovered) {
        // Retry the operation once
        return await operation()
      }
    }
    
    throw error
  }
}

// Auto-start monitoring in production
if (process.env.NODE_ENV === 'production') {
  dbHealthMonitor.startMonitoring()
} 