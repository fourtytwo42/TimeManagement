#!/usr/bin/env node
const { execSync } = require('child_process')
const os = require('os')

/**
 * Kill Node processes in a cross-platform way
 */
function killNodeProcesses() {
  try {
    const platform = os.platform()
    
    if (platform === 'win32') {
      // Windows
      console.log('🔪 Killing Node processes (Windows)...')
      execSync('taskkill /F /IM node.exe', { stdio: 'ignore' })
    } else {
      // Linux, macOS, and other Unix-like systems
      console.log('🔪 Killing Node processes (Unix)...')
      execSync('pkill -f node || true', { stdio: 'ignore' })
    }
  } catch (error) {
    console.log('ℹ️  No Node processes to kill or unable to kill them')
  }
}

/**
 * Check if we're running on Windows
 */
function isWindows() {
  return os.platform() === 'win32'
}

/**
 * Check if we're running on Linux
 */
function isLinux() {
  return os.platform() === 'linux'
}

/**
 * Check if we're running on macOS
 */
function isMacOS() {
  return os.platform() === 'darwin'
}

/**
 * Get platform-specific information
 */
function getPlatformInfo() {
  const platform = os.platform()
  const arch = os.arch()
  const release = os.release()
  
  return {
    platform,
    arch,
    release,
    isWindows: platform === 'win32',
    isLinux: platform === 'linux',
    isMacOS: platform === 'darwin',
    isUnix: platform !== 'win32'
  }
}

/**
 * Execute a command with better error handling
 */
function safeExecSync(command, options = {}) {
  try {
    return execSync(command, { stdio: 'inherit', ...options })
  } catch (error) {
    console.error(`❌ Command failed: ${command}`)
    console.error(`Error: ${error.message}`)
    throw error
  }
}

module.exports = {
  killNodeProcesses,
  isWindows,
  isLinux,
  isMacOS,
  getPlatformInfo,
  safeExecSync
} 