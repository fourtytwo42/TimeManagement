import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Enhanced Prisma client with better error handling and connection management
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    errorFormat: 'pretty'
  })

// Ensure proper cleanup on process termination
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Connection health check utility
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database connection check failed:', error)
    return false
  }
}

// Retry wrapper for database operations
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      // Check if it's a connection error
      if (error instanceof Error && error.message.includes('Unable to open the database file')) {
        console.warn(`Database connection attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms...`)
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay))
          // Exponential backoff
          delay *= 2
          continue
        }
      }
      
      // If it's not a connection error or we've exhausted retries, throw immediately
      throw error
    }
  }
  
  throw lastError!
} 