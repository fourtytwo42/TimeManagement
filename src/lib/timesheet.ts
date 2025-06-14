import { prisma } from './db'
import { getCurrentPayPeriod, getPayPeriodDates } from './utils'
import { TsState, Role } from '@prisma/client'

export interface TimesheetWithEntries {
  id: string
  userId: string
  periodStart: Date
  periodEnd: Date
  state: TsState
  staffSig?: string | null
  managerSig?: string | null
  hrSig?: string | null
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
    role: Role
    managerId?: string | null
  }
}

export async function getOrCreateCurrentTimesheet(userId: string): Promise<TimesheetWithEntries> {
  const currentPeriod = getCurrentPayPeriod()
  
  // Try to find existing timesheet for current period
  let timesheet = await prisma.timesheet.findFirst({
    where: {
      userId,
      periodStart: currentPeriod.start,
      periodEnd: currentPeriod.end,
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
        state: TsState.PENDING_STAFF,
        entries: {
          create: periodDates.map(date => ({
            date,
            plawaHours: 0,
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
          }
        }
      }
    })
  }

  return timesheet as TimesheetWithEntries
}

export async function getTimesheetById(id: string, userId: string, userRole: Role): Promise<TimesheetWithEntries | null> {
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
    (userRole === Role.MANAGER && timesheet.user.managerId === userId) || // Manager accessing direct report
    userRole === Role.HR || 
    userRole === Role.ADMIN

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
      state: TsState.PENDING_STAFF,
    }
  })

  if (!timesheet) {
    throw new Error('Timesheet not found or not editable')
  }

  // Update the entry
  const updatedEntry = await prisma.timesheetEntry.update({
    where: {
      id: entryId,
      timesheetId,
    },
    data,
  })

  return updatedEntry
}

export async function submitTimesheet(timesheetId: string, userId: string, signature: string) {
  // Verify the timesheet belongs to the user and is in PENDING_STAFF state
  const timesheet = await prisma.timesheet.findFirst({
    where: {
      id: timesheetId,
      userId,
      state: TsState.PENDING_STAFF,
    },
    include: {
      user: {
        select: {
          managerId: true,
        }
      }
    }
  })

  if (!timesheet) {
    throw new Error('Timesheet not found or not submittable')
  }

  // Update timesheet with signature and change state
  const updatedTimesheet = await prisma.timesheet.update({
    where: { id: timesheetId },
    data: {
      staffSig: signature,
      state: TsState.PENDING_MANAGER,
    },
  })

  return updatedTimesheet
}

export async function getUserTimesheets(userId: string, userRole: Role) {
  let whereClause: any = {}

  if (userRole === Role.STAFF) {
    whereClause = { userId }
  } else if (userRole === Role.MANAGER) {
    // Get timesheets for direct reports
    whereClause = {
      user: {
        managerId: userId
      }
    }
  } else if (userRole === Role.HR || userRole === Role.ADMIN) {
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
      state: TsState.PENDING_MANAGER,
      user: {
        managerId: managerId
      }
    },
    include: {
      user: {
        select: {
          managerId: true,
        }
      }
    }
  })

  if (!timesheet) {
    throw new Error('Timesheet not found or not approvable')
  }

  // Update timesheet with manager signature and change state
  const updatedTimesheet = await prisma.timesheet.update({
    where: { id: timesheetId },
    data: {
      managerSig: signature,
      state: TsState.PENDING_HR,
    },
  })

  return updatedTimesheet
}

export async function denyTimesheet(timesheetId: string, managerId: string, note: string) {
  // Verify the timesheet is pending manager approval and belongs to a direct report
  const timesheet = await prisma.timesheet.findFirst({
    where: {
      id: timesheetId,
      state: TsState.PENDING_MANAGER,
      user: {
        managerId: managerId
      }
    }
  })

  if (!timesheet) {
    throw new Error('Timesheet not found or not deniable')
  }

  // Update timesheet with manager note and change state back to pending staff
  const updatedTimesheet = await prisma.timesheet.update({
    where: { id: timesheetId },
    data: {
      managerNote: note,
      state: TsState.PENDING_STAFF,
      // Clear staff signature since they need to resubmit
      staffSig: null,
    },
  })

  return updatedTimesheet
}

export async function getPendingManagerApprovals(managerId: string) {
  const timesheets = await prisma.timesheet.findMany({
    where: {
      state: TsState.PENDING_MANAGER,
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