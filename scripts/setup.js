#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const { getPlatformInfo, safeExecSync } = require('./utils')

// Check if this is being run during npm install (postinstall) or manually
const isPostInstall = process.env.npm_lifecycle_event === 'postinstall'
const isManualSetup = process.argv.includes('--force') || !isPostInstall

// Skip postinstall if database already exists and is seeded (to avoid re-running on every npm install)
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')
const envLocalPath = path.join(process.cwd(), '.env.local')
const isAlreadySetup = fs.existsSync(dbPath) && fs.existsSync(envLocalPath)

if (isPostInstall && isAlreadySetup && !isManualSetup) {
  console.log('✅ System already set up. Use "npm run setup --force" to re-setup.')
  process.exit(0)
}

console.log('🚀 Starting TimeSheet Management System Setup...\n')

// Display platform information
const platformInfo = getPlatformInfo()
console.log(`🖥️  Platform: ${platformInfo.platform} (${platformInfo.arch})`)
if (platformInfo.isLinux) {
  console.log('🐧 Linux detected - using Unix commands')
} else if (platformInfo.isWindows) {
  console.log('🪟 Windows detected - using Windows commands')
} else if (platformInfo.isMacOS) {
  console.log('🍎 macOS detected - using Unix commands')
}
console.log('')

// Check if this is a fresh install
const isFirstTime = !isAlreadySetup

// 1. Check and create .env.local if it doesn't exist
const envExamplePath = path.join(process.cwd(), 'env.example')

if (!fs.existsSync(envLocalPath)) {
  console.log('📝 Creating .env.local file...')
  
  if (fs.existsSync(envExamplePath)) {
    // Copy from env.example
    const envExample = fs.readFileSync(envExamplePath, 'utf8')
    fs.writeFileSync(envLocalPath, envExample)
    console.log('✅ Created .env.local from env.example')
  } else {
    // Create minimal .env.local
    const defaultEnv = `# Database Configuration
DATABASE_URL="file:./dev.db"

# NextAuth Configuration  
NEXTAUTH_SECRET="development-secret-change-in-production-64-chars-long-string"
NEXTAUTH_URL="http://localhost:3000"

# JWT Configuration
JWT_SECRET="development-jwt-secret-key-12345"

# Encryption Key (32 characters)
ENCRYPTION_KEY="default-key-change-in-production-32"

# Development Environment
NODE_ENV="development"
`
    fs.writeFileSync(envLocalPath, defaultEnv)
    console.log('✅ Created .env.local with default values')
  }
} else {
  console.log('✅ .env.local already exists')
}

// 2. Generate Prisma Client
console.log('\n🔧 Generating Prisma client...')
try {
  safeExecSync('npx prisma generate')
  console.log('✅ Prisma client generated')
} catch (error) {
  console.error('❌ Failed to generate Prisma client')
  process.exit(1)
}

// 3. Setup Database
console.log('\n🗄️  Setting up database...')
try {
  const dbExists = fs.existsSync(dbPath)
  
  if (!dbExists) {
    console.log('📂 Database file doesn\'t exist, creating...')
  }
  
  safeExecSync('npx prisma db push')
  console.log('✅ Database schema updated')
} catch (error) {
  console.error('❌ Failed to setup database')
  process.exit(1)
}

// 4. Seed Database with Test Users
console.log('\n🌱 Seeding database with test users...')
try {
  safeExecSync('npx prisma db seed')
  console.log('✅ Database seeded with test users')
} catch (error) {
  console.error('❌ Failed to seed database')
  process.exit(1)
}

// 5. Create necessary directories
console.log('\n📁 Creating necessary directories...')
const directories = ['backups']
directories.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir)
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
    console.log(`✅ Created ${dir} directory`)
  } else {
    console.log(`✅ ${dir} directory already exists`)
  }
})

// 6. Set script permissions on Unix systems
if (platformInfo.isUnix) {
  console.log('\n🔧 Setting script permissions for Unix systems...')
  try {
    safeExecSync('node scripts/set-permissions.js')
  } catch (error) {
    console.log('⚠️  Could not set script permissions, but continuing...')
  }
}

// 7. Final Success Message
console.log('\n🎉 Setup Complete! 🎉')
console.log('')
console.log('📋 What was set up:')
console.log('   ✅ Environment variables (.env.local)')
console.log('   ✅ Database schema and tables')
console.log('   ✅ Test user accounts')
console.log('   ✅ Required directories')
console.log('   ✅ Modern ESLint 9 flat config')
console.log('')
console.log('👥 Test Accounts Created:')
console.log('   🔧 HR Admin: hr@company.com (password: password123)')
console.log('   👔 Manager: manager@company.com (password: password123)')
console.log('   👨‍💼 Staff: alice@company.com (password: password123)')
console.log('   👨‍💼 Staff: bob@company.com (password: password123)')
console.log('   👩‍💼 Staff: carol@company.com (password: password123)')
console.log('')
console.log('🚀 Ready to start! Run: npm run dev')
console.log('🌐 Then open: http://localhost:3000')
console.log('')
console.log('🔍 To verify setup: npm run setup:verify')
console.log('')

if (isFirstTime) {
  console.log('💡 First time setup detected - everything is ready to go!')
} else {
  console.log('🔄 Re-setup completed - your system is refreshed!')
} 