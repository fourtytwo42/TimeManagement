import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting simple database seed...')

  // Clear existing data
  console.log('🗑️  Clearing existing data...')
  await prisma.user.deleteMany()

  // Create users
  console.log('👥 Creating users...')
  
  const hashedPassword = await bcrypt.hash('password123', 12)

  // Create HR Admin
  const hrUser = await prisma.user.create({
    data: {
      email: 'hr@company.com',
      name: 'HR Admin',
      role: 'HR',
      password: hashedPassword,
      payRate: 25.00,
      settings: JSON.stringify({ emailNotifications: true })
    }
  })

  // Create Manager
  const managerUser = await prisma.user.create({
    data: {
      email: 'manager@company.com',
      name: 'John Manager',
      role: 'MANAGER',
      password: hashedPassword,
      payRate: 30.00,
      settings: JSON.stringify({ emailNotifications: true })
    }
  })

  // Create Staff Users
  const aliceUser = await prisma.user.create({
    data: {
      email: 'alice@company.com',
      name: 'Alice Smith',
      role: 'STAFF',
      password: hashedPassword,
      payRate: 18.50,
      managerId: managerUser.id,
      settings: JSON.stringify({ emailNotifications: false })
    }
  })

  const bobUser = await prisma.user.create({
    data: {
      email: 'bob@company.com',
      name: 'Bob Johnson',
      role: 'STAFF',
      password: hashedPassword,
      payRate: 20.00,
      managerId: managerUser.id,
      settings: JSON.stringify({ emailNotifications: false })
    }
  })

  const carolUser = await prisma.user.create({
    data: {
      email: 'carol@company.com',
      name: 'Carol Davis',
      role: 'STAFF',
      password: hashedPassword,
      payRate: 19.25,
      managerId: managerUser.id,
      settings: JSON.stringify({ emailNotifications: false })
    }
  })

  console.log('✅ Database seeded successfully!')
  console.log('')
  console.log('📋 Summary:')
  console.log('👥 Users created:')
  console.log('   - HR Admin: hr@company.com')
  console.log('   - Manager: manager@company.com')
  console.log('   - Staff: alice@company.com, bob@company.com, carol@company.com')
  console.log('   - Password for all: password123')
  console.log('')
  console.log('📋 No timesheets or messages created - clean start!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 