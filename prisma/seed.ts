import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@tms.com' },
    update: {},
    create: {
      email: 'admin@tms.com',
      name: 'System Administrator',
      password: adminPassword,
      role: Role.ADMIN,
      payRate: 0,
      settings: JSON.stringify({
        emailNotifications: false
      })
    }
  })

  console.log('✅ Created admin user:', admin.email)

  // Create HR user
  const hrPassword = await bcrypt.hash('hr123', 12)
  const hr = await prisma.user.upsert({
    where: { email: 'hr@tms.com' },
    update: {},
    create: {
      email: 'hr@tms.com',
      name: 'HR Manager',
      password: hrPassword,
      role: Role.HR,
      payRate: 75000,
      settings: JSON.stringify({
        emailNotifications: false
      })
    }
  })

  console.log('✅ Created HR user:', hr.email)

  // Create manager user
  const managerPassword = await bcrypt.hash('manager123', 12)
  const manager = await prisma.user.upsert({
    where: { email: 'manager@tms.com' },
    update: {},
    create: {
      email: 'manager@tms.com',
      name: 'Department Manager',
      password: managerPassword,
      role: Role.MANAGER,
      payRate: 65000,
      settings: JSON.stringify({
        emailNotifications: false
      })
    }
  })

  console.log('✅ Created manager user:', manager.email)

  // Create staff user
  const staffPassword = await bcrypt.hash('staff123', 12)
  const staff = await prisma.user.upsert({
    where: { email: 'staff@tms.com' },
    update: {},
    create: {
      email: 'staff@tms.com',
      name: 'John Staff',
      password: staffPassword,
      role: Role.STAFF,
      managerId: manager.id,
      payRate: 45000,
      settings: JSON.stringify({
        emailNotifications: false
      })
    }
  })

  console.log('✅ Created staff user:', staff.email)

  console.log('🎉 Seeding completed!')
  console.log('\n📋 Login credentials:')
  console.log('Admin: admin@tms.com / admin123')
  console.log('HR: hr@tms.com / hr123')
  console.log('Manager: manager@tms.com / manager123')
  console.log('Staff: staff@tms.com / staff123')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 