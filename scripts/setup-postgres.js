#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 PostgreSQL Migration Setup')
console.log('==============================')

// Check if .env file exists
const envPath = path.join(process.cwd(), '.env')
const envLocalPath = path.join(process.cwd(), '.env.local')

let envFile = envPath
if (fs.existsSync(envLocalPath)) {
  envFile = envLocalPath
} else if (!fs.existsSync(envPath)) {
  console.log('❌ No .env file found. Creating one...')
  fs.writeFileSync(envPath, '')
}

console.log(`📝 Updating environment file: ${envFile}`)

// Read current env file
let envContent = ''
if (fs.existsSync(envFile)) {
  envContent = fs.readFileSync(envFile, 'utf8')
}

// Offer different database options
console.log('\n🎯 Database Options:')
console.log('1. 🐘 Local PostgreSQL (requires installation)')
console.log('2. 🐳 Docker PostgreSQL (requires Docker)')
console.log('3. ☁️  Cloud PostgreSQL (instant, free tier available)')
console.log('4. 🔄 Keep SQLite (temporary fix)')

// For now, set up local PostgreSQL
const postgresUrl = 'DATABASE_URL="postgresql://timesheet_user:timesheet_password@localhost:5432/timesheet_db"'

if (envContent.includes('DATABASE_URL=')) {
  // Replace existing DATABASE_URL
  envContent = envContent.replace(/DATABASE_URL=.*/, postgresUrl)
} else {
  // Add DATABASE_URL
  envContent += `\n${postgresUrl}\n`
}

// Ensure other required env vars exist
const requiredVars = [
  'JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"',
  'NEXTAUTH_URL="http://localhost:3000"',
  'NEXTAUTH_SECRET="your-nextauth-secret-change-this-in-production"'
]

requiredVars.forEach(varLine => {
  const varName = varLine.split('=')[0]
  if (!envContent.includes(`${varName}=`)) {
    envContent += `${varLine}\n`
  }
})

fs.writeFileSync(envFile, envContent)
console.log('✅ Environment file updated with local PostgreSQL')

console.log('\n🚀 Quick Start Options:')
console.log('')
console.log('🟢 OPTION 1: Free Cloud Database (Recommended)')
console.log('   • Visit: https://neon.tech (free PostgreSQL)')
console.log('   • Create account & database')
console.log('   • Copy connection string to .env')
console.log('')
console.log('🟡 OPTION 2: Local PostgreSQL')
console.log('   • Download: https://www.postgresql.org/download/')
console.log('   • Install with default settings')
console.log('   • Create database: timesheet_db')
console.log('')
console.log('🔵 OPTION 3: Docker (if available)')
console.log('   • Run: docker-compose up -d')
console.log('')

console.log('📋 After database is ready:')
console.log('   npx prisma generate')
console.log('   npx prisma db push')
console.log('   npx prisma db seed')
console.log('   npm run dev')

console.log('\n💡 Need immediate fix? Run: npm run sqlite:temp') 