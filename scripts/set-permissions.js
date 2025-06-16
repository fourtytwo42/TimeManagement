#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { getPlatformInfo } = require('./utils')

const platformInfo = getPlatformInfo()

// Only run on Unix-like systems
if (platformInfo.isUnix) {
  console.log('🔧 Setting execute permissions for scripts...')
  
  const scriptsDir = path.join(process.cwd(), 'scripts')
  const scriptFiles = [
    'setup.js',
    'verify-setup.js',
    'utils.js',
    'sqlite-temp-fix.js',
    'db-reset.js',
    'set-permissions.js'
  ]
  
  scriptFiles.forEach(file => {
    const filePath = path.join(scriptsDir, file)
    if (fs.existsSync(filePath)) {
      try {
        // Set read, write, execute for owner; read, execute for group and others
        fs.chmodSync(filePath, 0o755)
        console.log(`✅ Set permissions for ${file}`)
      } catch (error) {
        console.log(`⚠️  Could not set permissions for ${file}: ${error.message}`)
      }
    }
  })
  
  console.log('✅ Permissions set successfully')
} else {
  console.log('ℹ️  Windows detected - no permission changes needed')
} 