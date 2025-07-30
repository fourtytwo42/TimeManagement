import { PrismaClient } from '@prisma/client'
import { getCurrentPayPeriod, getPayPeriodDates } from '../src/lib/utils'

const prisma = new PrismaClient()

async function createTestTimesheets() {
  console.log('🌱 Creating test timesheets...')

  // Get users
  const staff = await prisma.user.findUnique({ where: { email: 'staff@tms.com' } })
  const manager = await prisma.user.findUnique({ where: { email: 'manager@tms.com' } })

  if (!staff || !manager) {
    console.error('❌ Staff or manager user not found')
    return
  }

  // Update staff to have manager as their manager
  await prisma.user.update({
    where: { id: staff.id },
    data: { managerId: manager.id }
  })

  // Get current pay period
  const { start: periodStart, end: periodEnd } = getCurrentPayPeriod()
  const dates = getPayPeriodDates(periodStart, periodEnd)

  // Create a timesheet for the staff member
  const timesheet = await prisma.timesheet.create({
    data: {
      userId: staff.id,
      periodStart,
      periodEnd,
      state: 'PENDING_MANAGER',
      staffSig: 'John Staff Digital Signature',
      entries: {
        create: dates.map((date, index) => ({
          date,
          in1: index < 5 ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0) : null,
          out1: index < 5 ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 17, 0) : null,
          in2: index === 2 ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 18, 0) : null,
          out2: index === 2 ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 20, 0) : null,
          plawaHours: index === 1 ? 2 : 0,
          comments: index === 0 ? 'Started new project' : index === 2 ? 'Overtime for deadline' : null
        }))
      }
    },
    include: {
      entries: true,
      user: true
    }
  })

  console.log(`✅ Created timesheet for ${staff.name} (${timesheet.id})`)
  console.log(`📅 Period: ${periodStart.toDateString()} - ${periodEnd.toDateString()}`)
  console.log(`📊 Status: ${timesheet.state}`)
  console.log(`📝 Entries: ${timesheet.entries.length}`)

  // Create a timesheet message
  await prisma.timesheetMessage.create({
    data: {
      timesheetId: timesheet.id,
      senderId: staff.id,
      content: 'Please review my timesheet. I worked overtime on Tuesday for the project deadline.'
    }
  })

  console.log('✅ Added timesheet message')
  console.log('🎉 Test timesheet data created!')
}

createTestTimesheets()
  .catch((e) => {
    console.error('❌ Error creating test data:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 