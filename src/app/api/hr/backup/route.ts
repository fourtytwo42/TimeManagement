import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt-auth'
import { Role } from '@prisma/client'
import { createBackup, listBackups, getBackupStats, validateBackup, restoreBackup } from '@/lib/backup'

export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const user = verifyToken(token)

    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    if (user.role !== Role.HR && user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { action, filename, config } = body

    switch (action) {
      case 'create':
        console.log(`Manual backup triggered by ${user.name}`)
        const result = await createBackup(config)

        if (result.success) {
          return NextResponse.json({
            message: 'Backup created successfully',
            filename: result.filename,
            size: result.size
          })
        } else {
          return NextResponse.json(
            { error: result.error || 'Backup failed' },
            { status: 500 }
          )
        }

      case 'validate':
        if (!filename) {
          return NextResponse.json({ error: 'Filename required for validation' }, { status: 400 })
        }

        const validation = await validateBackup(filename)
        return NextResponse.json(validation)

      case 'restore':
        if (!filename) {
          return NextResponse.json({ error: 'Filename required for restore' }, { status: 400 })
        }

        console.log(`Database restore initiated by ${user.name} using backup: ${filename}`)
        const restoreResult = await restoreBackup(filename)

        if (restoreResult.success) {
          return NextResponse.json({
            message: 'Database restored successfully',
            filename
          })
        } else {
          return NextResponse.json(
            { error: restoreResult.error || 'Restore failed' },
            { status: 500 }
          )
        }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in backup operation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const user = verifyToken(token)

    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    if (user.role !== Role.HR && user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'list'

    switch (action) {
      case 'list':
        const backups = listBackups()
        return NextResponse.json({ backups })

      case 'stats':
        const stats = getBackupStats()
        return NextResponse.json({ stats })

      case 'info':
        const backups_info = listBackups()
        const stats_info = getBackupStats()
        return NextResponse.json({
          backups: backups_info,
          stats: stats_info
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error fetching backup information:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 