#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const { killNodeProcesses, getPlatformInfo, safeExecSync } = require('./utils')

console.log('🔧 Temporary SQLite Fix')
console.log('=======================')

const platformInfo = getPlatformInfo()
console.log(`🖥️  Platform: ${platformInfo.platform}`)

// Kill any running Node processes
killNodeProcesses()

// Remove database files
const dbFiles = ['dev.db', 'dev.db-journal', 'dev.db-wal']
dbFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file)
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath)
      console.log(`🗑️  Removed ${file}`)
    } catch (error) {
      console.log(`⚠️  Could not remove ${file}`)
    }
  }
})

// Update schema to SQLite temporarily
const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')
if (fs.existsSync(schemaPath)) {
  let schema = fs.readFileSync(schemaPath, 'utf8')
  schema = schema.replace('provider = "postgresql"', 'provider = "sqlite"')
  fs.writeFileSync(schemaPath, schema)
  console.log('📝 Updated schema to SQLite')
}

// Update env to SQLite
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  let envContent = fs.readFileSync(envPath, 'utf8')
  envContent = envContent.replace(/DATABASE_URL=.*/, 'DATABASE_URL="file:./dev.db"')
  fs.writeFileSync(envPath, envContent)
  console.log('📝 Updated .env to SQLite')
}

console.log('\n🔄 Regenerating database...')

try {
  safeExecSync('npx prisma generate')
  safeExecSync('npx prisma db push --force-reset')
  safeExecSync('npx prisma db seed')
  
  console.log('\n✅ SQLite database reset successfully!')
  console.log('🚀 You can now run: npm run dev')
  console.log('')
  console.log('⚠️  This is a temporary fix. Consider migrating to PostgreSQL:')
  console.log('   npm run postgres:migrate')
  
} catch (error) {
  console.error('❌ Error during database reset:', error.message)
} 