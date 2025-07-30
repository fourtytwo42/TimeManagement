import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import cron from 'node-cron'
import { prisma } from '@/lib/db'

const execAsync = promisify(exec)

interface BackupConfig {
  sourcePath: string
  backupPath: string
  retentionDays: number
  cronExpression: string
  compressionEnabled: boolean
  emailNotifications: boolean
  maxBackupSize: number // in MB
}

const DEFAULT_CONFIG: BackupConfig = {
  sourcePath: './prisma/dev.db',
  backupPath: './backups',
  retentionDays: 30,
  cronExpression: '0 2 * * *', // Daily at 2 AM
  compressionEnabled: true,
  emailNotifications: false,
  maxBackupSize: 100 // 100MB
}

// Ensure backup directory exists
const ensureBackupDirectory = (backupPath: string): void => {
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(backupPath, { recursive: true })
    console.log(`Created backup directory: ${backupPath}`)
  }
}

// Generate backup filename with timestamp
const generateBackupFilename = (compressed: boolean = true): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const extension = compressed ? '.db.gz' : '.db'
  return `backup-${timestamp}${extension}`
}

// Create database backup
export const createBackup = async (config: Partial<BackupConfig> = {}): Promise<{ success: boolean; filename?: string; error?: string; size?: number }> => {
  const fullConfig = { ...DEFAULT_CONFIG, ...config }
  
  try {
    ensureBackupDirectory(fullConfig.backupPath)
    
    const filename = generateBackupFilename(fullConfig.compressionEnabled)
    const backupFilePath = path.join(fullConfig.backupPath, filename)
    
    // Check if source file exists
    if (!fs.existsSync(fullConfig.sourcePath)) {
      return { success: false, error: 'Source database file not found' }
    }
    
    // Get source file size
    const sourceStats = fs.statSync(fullConfig.sourcePath)
    const sourceSizeMB = sourceStats.size / (1024 * 1024)
    
    if (sourceSizeMB > fullConfig.maxBackupSize) {
      return { 
        success: false, 
        error: `Source file too large: ${sourceSizeMB.toFixed(2)}MB exceeds limit of ${fullConfig.maxBackupSize}MB` 
      }
    }
    
    if (fullConfig.compressionEnabled) {
      // Create compressed backup
      await execAsync(`gzip -c '${fullConfig.sourcePath}' > '${backupFilePath}'`)
    } else {
      // Create uncompressed backup
      fs.copyFileSync(fullConfig.sourcePath, backupFilePath)
    }
    
    // Verify backup was created
    if (!fs.existsSync(backupFilePath)) {
      return { success: false, error: 'Backup file was not created' }
    }
    
    const backupStats = fs.statSync(backupFilePath)
    const backupSizeMB = backupStats.size / (1024 * 1024)
    
    // Log backup creation
    console.log(`Backup created: ${filename} (${backupSizeMB.toFixed(2)}MB)`)
    
    // Clean up old backups
    await cleanupOldBackups(fullConfig)
    
    return { 
      success: true, 
      filename, 
      size: Math.round(backupSizeMB * 100) / 100 
    }
    
  } catch (error) {
    console.error('Backup creation failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}

// Clean up old backup files based on retention policy
const cleanupOldBackups = async (config: BackupConfig): Promise<void> => {
  try {
    const files = fs.readdirSync(config.backupPath)
    const backupFiles = files.filter(file => file.startsWith('backup-'))
    
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays)
    
    let deletedCount = 0
    
    for (const file of backupFiles) {
      const filePath = path.join(config.backupPath, file)
      const stats = fs.statSync(filePath)
      
      if (stats.mtime < cutoffDate) {
        fs.unlinkSync(filePath)
        deletedCount++
        console.log(`Deleted old backup: ${file}`)
      }
    }
    
    if (deletedCount > 0) {
      console.log(`Cleaned up ${deletedCount} old backup files`)
    }
  } catch (error) {
    console.error('Error cleaning up old backups:', error)
  }
}

// List all backup files
export const listBackups = (): { filename: string; size: number; created: Date; compressed: boolean }[] => {
  const config = DEFAULT_CONFIG
  
  try {
    ensureBackupDirectory(config.backupPath)
    
    const files = fs.readdirSync(config.backupPath)
    const backupFiles = files.filter(file => file.startsWith('backup-'))
    
    return backupFiles.map(file => {
      const filePath = path.join(config.backupPath, file)
      const stats = fs.statSync(filePath)
      
      return {
        filename: file,
        size: Math.round((stats.size / (1024 * 1024)) * 100) / 100, // Size in MB
        created: stats.mtime,
        compressed: file.endsWith('.gz')
      }
    }).sort((a, b) => b.created.getTime() - a.created.getTime())
    
  } catch (error) {
    console.error('Error listing backups:', error)
    return []
  }
}

// Restore from backup
export const restoreBackup = async (backupFilename: string): Promise<{ success: boolean; error?: string }> => {
  const config = DEFAULT_CONFIG
  
  try {
    const backupFilePath = path.join(config.backupPath, backupFilename)
    
    if (!fs.existsSync(backupFilePath)) {
      return { success: false, error: 'Backup file not found' }
    }
    
    // Create a backup of current database before restoring
    const currentBackupResult = await createBackup({ 
      ...config, 
      backupPath: path.join(config.backupPath, 'pre-restore') 
    })
    
    if (!currentBackupResult.success) {
      return { success: false, error: 'Failed to backup current database before restore' }
    }
    
    if (backupFilename.endsWith('.gz')) {
      // Decompress and restore
      await execAsync(`gzip -dc '${backupFilePath}' > '${config.sourcePath}'`)
    } else {
      // Direct copy
      fs.copyFileSync(backupFilePath, config.sourcePath)
    }
    
    console.log(`Database restored from: ${backupFilename}`)
    return { success: true }
    
  } catch (error) {
    console.error('Restore failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}

// Schedule automatic backups
export const scheduleBackups = (config: Partial<BackupConfig> = {}): void => {
  const fullConfig = { ...DEFAULT_CONFIG, ...config }
  
  console.log(`Scheduling backups with cron expression: ${fullConfig.cronExpression}`)
  
  cron.schedule(fullConfig.cronExpression, async () => {
    console.log('Running scheduled backup...')
    const result = await createBackup(fullConfig)
    
    if (result.success) {
      console.log(`Scheduled backup completed: ${result.filename}`)
    } else {
      console.error(`Scheduled backup failed: ${result.error}`)
    }
  })
  
  console.log('Automatic backup scheduling enabled')
}

// Get backup statistics
export const getBackupStats = (): {
  totalBackups: number
  totalSize: number
  oldestBackup?: Date
  newestBackup?: Date
  compressionRatio?: number
} => {
  const backups = listBackups()
  
  if (backups.length === 0) {
    return { totalBackups: 0, totalSize: 0 }
  }
  
  const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0)
  const compressedBackups = backups.filter(b => b.compressed)
  const uncompressedBackups = backups.filter(b => !b.compressed)
  
  const compressionRatio = compressedBackups.length > 0 && uncompressedBackups.length > 0
    ? (uncompressedBackups.reduce((sum, b) => sum + b.size, 0) / compressedBackups.reduce((sum, b) => sum + b.size, 0))
    : undefined
  
  return {
    totalBackups: backups.length,
    totalSize: Math.round(totalSize * 100) / 100,
    oldestBackup: backups[backups.length - 1]?.created,
    newestBackup: backups[0]?.created,
    compressionRatio: compressionRatio ? Math.round(compressionRatio * 100) / 100 : undefined
  }
}

// Initialize backup system
export const initializeBackupSystem = (): void => {
  console.log('Initializing backup system...')
  
  // Ensure backup directory exists
  ensureBackupDirectory(DEFAULT_CONFIG.backupPath)
  
  // Schedule automatic backups
  scheduleBackups()
  
  console.log('Backup system initialized successfully')
}

export const validateBackup = async (backupFilename: string): Promise<{ valid: boolean; error?: string; size?: number }> => {
  const config = DEFAULT_CONFIG
  
  try {
    const backupFilePath = path.join(config.backupPath, backupFilename)
    
    if (!fs.existsSync(backupFilePath)) {
      return { valid: false, error: 'Backup file not found' }
    }
    
    const stats = fs.statSync(backupFilePath)
    
    if (stats.size === 0) {
      return { valid: false, error: 'Backup file is empty' }
    }
    
    // For compressed files, try to test the compression
    if (backupFilename.endsWith('.gz')) {
      try {
        await execAsync(`gzip -t '${backupFilePath}'`)
      } catch (error) {
        return { valid: false, error: 'Compressed backup file is corrupted' }
      }
    }
    
    return { 
      valid: true, 
      size: Math.round((stats.size / (1024 * 1024)) * 100) / 100 
    }
    
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
} 