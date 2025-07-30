import { prisma } from './db'
import { getCurrentPayPeriod, getPayPeriodDates, generateAvailablePayPeriods } from './utils'

// Define timesheet states as string constants instead of importing from Prisma
const TS_STATE = {
  PENDING_STAFF: 'PENDING_STAFF',
  PENDING_MANAGER: 'PENDING_MANAGER', 
  PENDING_HR: 'PENDING_HR',
  APPROVED: 'APPROVED',
  DENIED: 'DENIED'
} as const

// Define roles as string constants instead of importing from Prisma
const ROLES = {
  STAFF: 'STAFF',
  MANAGER: 'MANAGER',
  HR: 'HR',
  ADMIN: 'ADMIN'
} as const

type TsState = typeof TS_STATE[keyof typeof TS_STATE]

export interface TimesheetWithEntries {
  id: string
  userId: string
  periodStart: Date
  periodEnd: Date
  state: TsState
  staffSig?: string | null
  staffSigAt?: Date | null
  managerSig?: string | null
  managerSigAt?: Date | null
  hrSig?: string | null
  hrSigAt?: Date | null
  managerNote?: string | null
  createdAt: Date
  updatedAt: Date
  entries: Array<{
    id: string
    date: Date
    in1?: Date | null
    out1?: Date | null
    in2?: Date | null
    out2?: Date | null
    in3?: Date | null
    out3?: Date | null
    plawaHours: number
    comments?: string | null
  }>
  user: {
    id: string
    name: string
    email: string
    role: string
    managerId?: string | null
    manager?: {
      id: string
      name: string
    } | null
  }
}

export async function getOrCreateCurrentTimesheet(userId: string): Promise<TimesheetWithEntries> {
  const currentPeriod = getCurrentPayPeriod()
  
  // Try to find existing timesheet for current period using findFirst instead of findUnique
  let timesheet = await prisma.timesheet.findFirst({
    where: {
      userId,
      periodStart: currentPeriod.start,
      periodEnd: currentPeriod.end
    },
    include: {
      entries: {
        orderBy: { date: 'asc' }
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          managerId: true,
          manager: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  })

  // If no timesheet exists, create one with entries for each day
  if (!timesheet) {
    const periodDates = getPayPeriodDates(currentPeriod.start, currentPeriod.end)
    
    timesheet = await prisma.timesheet.create({
      data: {
        userId,
        periodStart: currentPeriod.start,
        periodEnd: currentPeriod.end,
        state: TS_STATE.PENDING_STAFF,
        entries: {
          create: periodDates.map(date => ({
            date,
            plawaHours: 0
          }))
        }
      },
      include: {
        entries: {
          orderBy: { date: 'asc' }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            managerId: true,
            manager: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })
  }

  return timesheet as TimesheetWithEntries
}

export async function createTimesheetForPeriod(
  userId: string, 
  periodStart: Date, 
  periodEnd: Date
): Promise<TimesheetWithEntries> {
  console.log('🔍 createTimesheetForPeriod called with:', {
    userId,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    TS_STATE_available: !!TS_STATE,
    PENDING_STAFFvalue: TS_STATE.PENDING_STAFF
  })

  try {
    // Check if timesheet already exists for this period
    console.log('🔍 Checking for existing timesheet...')
    const existingTimesheet = await prisma.timesheet.findFirst({
      where: {
        userId,
        periodStart,
        periodEnd
      }
    })

    if (existingTimesheet) {
      console.log('❌ Timesheet already exists:', existingTimesheet.id)
      throw new Error('Timesheet already exists for this pay period')
    }

    console.log('✅ No existing timesheet found, creating new one...')

    // Create new timesheet with entries for each day in the period
    const periodDates = getPayPeriodDates(periodStart, periodEnd)
    console.log('🔍 Generated period dates:', periodDates.length, 'days')
    
    console.log('🔍 About to create timesheet with state:', TS_STATE.PENDING_STAFF)
    
    const timesheet = await prisma.timesheet.create({
      data: {
        userId,
        periodStart,
        periodEnd,
        state: TS_STATE.PENDING_STAFF,
        entries: {
          create: periodDates.map(date => ({
            date,
            plawaHours: 0
          }))
        }
      },
      include: {
        entries: {
          orderBy: { date: 'asc' }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            managerId: true,
            manager: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    console.log('✅ Timesheet created successfully:', {
      id: timesheet.id,
      state: timesheet.state,
      entriesCount: timesheet.entries.length
    })

    return timesheet as TimesheetWithEntries
  } catch (error) {
    console.error('❌ Error in createTimesheetForPeriod:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      TS_STATEdebug: {
        TS_STATE,
        PENDING_STAFF: TS_STATE.PENDING_STAFF,
        typeof_TS_STATE: typeof TS_STATE,
        keys: Object.keys(TS_STATE)
      }
    })
    throw error
  }
}

export async function getAvailablePayPeriods(userId: string): Promise<Array<{
  start: Date
  end: Date
  label: string
  isCurrent: boolean
  isPast: boolean
  isFuture: boolean
  hasTimesheet: boolean
}>> {
  // Get all available pay periods
  const allPeriods = generateAvailablePayPeriods(6, 3)
  
  // Get existing timesheets for this user
  const existingTimesheets = await prisma.timesheet.findMany({
    where: { userId },
    select: { periodStart: true }
  })
  
  const existingPeriodStarts = new Set(
    existingTimesheets.map(ts => ts.periodStart.getTime())
  )
  
  // Mark which periods already have timesheets
  return allPeriods.map(period => ({
    ...period,
    hasTimesheet: existingPeriodStarts.has(period.start.getTime())
  }))
}

export async function getTimesheetById(id: string, userId: string, userRole: string): Promise<TimesheetWithEntries | null> {
  const timesheet = await prisma.timesheet.findUnique({
    where: { id },
    include: {
      entries: {
        orderBy: { date: 'asc' }
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          managerId: true,
          manager: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  })

  if (!timesheet) {
    return null
  }

  // Check access permissions
  const canAccess = 
    timesheet.userId === userId || // Own timesheet
    (userRole === 'MANAGER' && timesheet.user.managerId === userId) || // Manager accessing direct report
    userRole === 'HR' || 
    userRole === 'ADMIN'

  if (!canAccess) {
    return null
  }

  return timesheet as TimesheetWithEntries
}

export async function updateTimesheetEntry(
  timesheetId: string,
  entryId: string,
  data: {
    in1?: Date | null
    out1?: Date | null
    in2?: Date | null
    out2?: Date | null
    in3?: Date | null
    out3?: Date | null
    plawaHours?: number
    comments?: string | null
  },
  userId: string
) {
  // Verify the timesheet belongs to the user and is in PENDING_STAFF state
  const timesheet = await prisma.timesheet.findFirst({
    where: {
      id: timesheetId,
      userId,
      state: TS_STATE.PENDING_STAFF
    }
  })

  if (!timesheet) {
    throw new Error('Timesheet not found or not editable')
  }

  // Update the entry
  const updatedEntry = await prisma.timesheetEntry.update({
    where: {
      id: entryId,
      timesheetId
    },
    data
  })

  return updatedEntry
}

export async function submitTimesheet(timesheetId: string, userId: string, signature: string) {
  // Verify the timesheet belongs to the user and is in PENDING_STAFF state
  const timesheet = await prisma.timesheet.findFirst({
    where: {
      id: timesheetId,
      userId,
      state: TS_STATE.PENDING_STAFF
    },
    include: {
      user: {
        select: {
          managerId: true
        }
      }
    }
  })

  if (!timesheet) {
    throw new Error('Timesheet not found or not submittable')
  }

  // Update timesheet with staff signature and timestamp
  await prisma.$executeRaw`
    UPDATE Timesheet 
    SET staffSig = ${signature}, 
        staffSigAt = ${new Date().toISOString()},
        state = ${TS_STATE.PENDING_MANAGER},
        updatedAt = ${new Date().toISOString()}
    WHERE id = ${timesheetId}
  `

  // Fetch the updated timesheet
  const updatedTimesheet = await prisma.timesheet.findUnique({
    where: { id: timesheetId }
  })

  return updatedTimesheet
}

export async function getUserTimesheets(userId: string, userRole: string) {
  let whereClause: any = {}

  if (userRole === 'STAFF') {
    whereClause = { userId }
  } else if (userRole === 'MANAGER') {
    // Get timesheets for direct reports
    whereClause = {
      user: {
        managerId: userId
      }
    }
  } else if (userRole === 'HR' || userRole === 'ADMIN') {
    // HR and Admin can see all timesheets
    whereClause = {}
  }

  const timesheets = await prisma.timesheet.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          managerId: true,
          manager: {
            select: {
              id: true,
              name: true
            }
          }
        }
      },
      entries: {
        orderBy: { date: 'asc' }
      }
    },
    orderBy: [
      { periodStart: 'desc' },
      { user: { name: 'asc' } }
    ]
  })

  return timesheets as TimesheetWithEntries[]
}

export async function approveTimesheet(timesheetId: string, managerId: string, signature: string) {
  // Verify the timesheet is pending manager approval and belongs to a direct report
  const timesheet = await prisma.timesheet.findFirst({
    where: {
      id: timesheetId,
      state: TS_STATE.PENDING_MANAGER,
      user: {
        managerId: managerId
      }
    },
    include: {
      user: {
        select: {
          managerId: true
        }
      }
    }
  })

  if (!timesheet) {
    throw new Error('Timesheet not found or not approvable')
  }

  // Update timesheet with manager signature and timestamp
  await prisma.$executeRaw`
    UPDATE Timesheet 
    SET managerSig = ${signature}, 
        managerSigAt = ${new Date().toISOString()},
        state = ${TS_STATE.PENDING_HR},
        updatedAt = ${new Date().toISOString()}
    WHERE id = ${timesheetId}
  `

  // Fetch the updated timesheet
  const updatedTimesheet = await prisma.timesheet.findUnique({
    where: { id: timesheetId }
  })

  return updatedTimesheet
}

export async function denyTimesheet(timesheetId: string, managerId: string, note: string) {
  // Verify the timesheet is pending manager approval and belongs to a direct report
  const timesheet = await prisma.timesheet.findFirst({
    where: {
      id: timesheetId,
      state: TS_STATE.PENDING_MANAGER,
      user: {
        managerId: managerId
      }
    }
  })

  if (!timesheet) {
    throw new Error('Timesheet not found or not deniable')
  }

  // Update timesheet with denial note and return to staff
  await prisma.$executeRaw`
    UPDATE Timesheet 
    SET managerNote = ${note}, 
        state = ${TS_STATE.PENDING_STAFF},
        staffSig = NULL,
        staffSigAt = NULL,
        updatedAt = ${new Date().toISOString()}
    WHERE id = ${timesheetId}
  `

  // Fetch the updated timesheet
  const updatedTimesheet = await prisma.timesheet.findUnique({
    where: { id: timesheetId }
  })

  return updatedTimesheet
}

export async function getPendingManagerApprovals(managerId: string) {
  const timesheets = await prisma.timesheet.findMany({
    where: {
      state: TS_STATE.PENDING_MANAGER,
      user: {
        managerId: managerId
      }
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          managerId: true,
          manager: {
            select: {
              id: true,
              name: true
            }
          }
        }
      },
      entries: {
        orderBy: { date: 'asc' }
      }
    },
    orderBy: [
      { updatedAt: 'asc' }, // Oldest submissions first
      { user: { name: 'asc' } }
    ]
  })

  return timesheets as TimesheetWithEntries[]
} 