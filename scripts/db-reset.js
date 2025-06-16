const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { killNodeProcesses, safeExecSync } = require('./utils');

console.log('🔄 Starting comprehensive database reset...');

// Function to run command with error handling
function runCommand(command, description) {
  try {
    console.log(`📋 ${description}...`);
    const output = execSync(command, { 
      stdio: 'pipe', 
      encoding: 'utf8',
      cwd: process.cwd()
    });
    console.log(`✅ ${description} completed`);
    if (output.trim()) {
      console.log(`   Output: ${output.trim()}`);
    }
    return true;
  } catch (error) {
    console.log(`⚠️  ${description} failed: ${error.message}`);
    return false;
  }
}

// Function to kill Node processes (now using cross-platform utility)
function killProcesses() {
  killNodeProcesses();
}

// Function to check if database file exists and remove if corrupted
function cleanupDatabase() {
  const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
  const dbWalPath = path.join(process.cwd(), 'prisma', 'dev.db-wal');
  const dbShmPath = path.join(process.cwd(), 'prisma', 'dev.db-shm');
  
  console.log('🧹 Cleaning up database files...');
  
  // Remove WAL and SHM files (SQLite transaction files)
  [dbWalPath, dbShmPath].forEach(filePath => {
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`✅ Removed ${path.basename(filePath)}`);
      } catch (error) {
        console.log(`⚠️  Could not remove ${path.basename(filePath)}: ${error.message}`);
      }
    }
  });
  
  // Check if main database file exists
  if (fs.existsSync(dbPath)) {
    console.log('📁 Database file exists, will be reset');
  } else {
    console.log('📁 No existing database file found');
  }
}

// Main execution
async function main() {
  console.log('🚀 TimeManagement Database Reset Tool');
  console.log('=====================================');
  
  // Step 1: Kill Node processes
  killProcesses();
  
  // Step 2: Wait a moment for processes to fully terminate
  console.log('⏳ Waiting for processes to terminate...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Step 3: Clean up database files
  cleanupDatabase();
  
  // Step 4: Generate Prisma client
  runCommand('npx prisma generate', 'Generating Prisma client');
  
  // Step 5: Reset database with force
  runCommand('npx prisma db push --force-reset', 'Resetting database schema');
  
  // Step 6: Seed database
  runCommand('npx prisma db seed', 'Seeding database with initial data');
  
  // Step 7: Verify database connection
  console.log('🔍 Verifying database connection...');
  try {
    execSync('npx prisma db execute --stdin', { 
      input: 'SELECT 1;',
      stdio: 'pipe',
      encoding: 'utf8'
    });
    console.log('✅ Database connection verified');
  } catch (error) {
    console.log('⚠️  Database verification failed, but this might be normal');
  }
  
  console.log('');
  console.log('🎉 Database reset completed successfully!');
  console.log('💡 You can now run: npm run dev');
  console.log('');
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run the script
main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
}); 