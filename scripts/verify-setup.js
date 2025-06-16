#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const { getPlatformInfo } = require('./utils')

async function verifySetup() {
  console.log('🔍 Verifying TimeSheet Management System Setup...\n')
  
  // Show platform info
  const platformInfo = getPlatformInfo()
  console.log(`🖥️  Platform: ${platformInfo.platform} (${platformInfo.arch})`)
  console.log(`🔧 Node.js: ${process.version}`)
  console.log('')
  
  let allGood = true
  
  // 1. Check .env.local exists
  const envLocalPath = path.join(process.cwd(), '.env.local')
  if (fs.existsSync(envLocalPath)) {
    console.log('✅ .env.local file exists')
  } else {
    console.log('❌ .env.local file missing')
    allGood = false
  }
  
  // 2. Check database file exists
  const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')
  if (fs.existsSync(dbPath)) {
    console.log('✅ Database file exists')
  } else {
    console.log('❌ Database file missing')
    allGood = false
  }
  
  // 3. Check database connection and users
  try {
    const prisma = new PrismaClient()
    await prisma.$connect()
    console.log('✅ Database connection successful')
    
    const userCount = await prisma.user.count()
    if (userCount >= 5) {
      console.log(`✅ Test users seeded (${userCount} users found)`)
      
      // Check specific test users
      const testUsers = [
        'hr@company.com',
        'manager@company.com', 
        'alice@company.com',
        'bob@company.com',
        'carol@company.com'
      ]
      
      for (const email of testUsers) {
        const user = await prisma.user.findUnique({ where: { email } })
        if (user) {
          console.log(`   ✅ ${user.role}: ${user.email} (${user.name})`)
        } else {
          console.log(`   ❌ Missing user: ${email}`)
          allGood = false
        }
      }
    } else {
      console.log(`❌ Insufficient users found (${userCount}/5)`)
      allGood = false
    }
    
    await prisma.$disconnect()
  } catch (error) {
    console.log('❌ Database connection failed:', error.message)
    allGood = false
  }
  
  // 4. Check required directories
  const directories = ['backups']
  directories.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir)
    if (fs.existsSync(dirPath)) {
      console.log(`✅ ${dir} directory exists`)
    } else {
      console.log(`❌ ${dir} directory missing`)
      allGood = false
    }
  })
  
  console.log('\n' + '='.repeat(50))
  if (allGood) {
    console.log('🎉 Setup Verification PASSED! 🎉')
    console.log('Ready to run: npm run dev')
  } else {
    console.log('❌ Setup Verification FAILED!')
    console.log('Try running: npm run setup --force')
  }
  console.log('='.repeat(50))
}

verifySetup().catch(console.error) 