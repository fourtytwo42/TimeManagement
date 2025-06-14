# Database Management Guide

This guide provides comprehensive instructions for managing and troubleshooting database issues in the TimeManagement application.

## Quick Fix Commands

### 🚨 Emergency Database Reset
If you encounter database connection errors, use this command for a complete reset:

```bash
npm run db:reset
```

This command will:
1. Kill any running Node processes
2. Clean up database lock files
3. Regenerate Prisma client
4. Reset database schema
5. Seed with initial data

### 🔧 Alternative Fix Command
```bash
npm run db:fix
```
(Same as `db:reset` - provided for convenience)

## Manual Database Management

### Step-by-Step Manual Reset
If the automated script fails, run these commands in order:

```bash
# 1. Kill Node processes (Windows)
taskkill /F /IM node.exe

# 2. Generate Prisma client
npx prisma generate

# 3. Reset database
npx prisma db push --force-reset

# 4. Seed database
npx prisma db seed
```

### Database Health Check
Check if your database is healthy:

```bash
curl http://localhost:3000/api/health
```

Or visit: http://localhost:3000/api/health in your browser

## Common Database Issues

### Issue 1: "Unable to open the database file"
**Symptoms:**
- Error code 14
- PrismaClientInitializationError
- Cannot connect to database

**Solution:**
```bash
npm run db:reset
```

### Issue 2: Database locked
**Symptoms:**
- Database is locked errors
- Operations hang indefinitely

**Solution:**
1. Stop the development server (Ctrl+C)
2. Run: `npm run db:reset`
3. Restart: `npm run dev`

### Issue 3: Schema out of sync
**Symptoms:**
- Column doesn't exist errors
- Table not found errors

**Solution:**
```bash
npx prisma db push --force-reset
npx prisma db seed
```

## Database Monitoring

### Health Monitoring
The application includes automatic database health monitoring in production. In development, you can:

1. Check health endpoint: `GET /api/health`
2. Monitor console logs for database warnings
3. Use the database health utilities in your code

### Using Database Health Utilities

```typescript
import { checkDatabaseConnection, withRetry } from '@/lib/db'
import { withDatabaseHealth } from '@/lib/db-health'

// Check connection
const isHealthy = await checkDatabaseConnection()

// Retry database operations
const result = await withRetry(async () => {
  return await prisma.user.findMany()
})

// Wrap API operations with health checks
const users = await withDatabaseHealth(async () => {
  return await prisma.user.findMany()
})
```

## Prevention Tips

### 1. Proper Shutdown
Always stop the development server properly:
- Use Ctrl+C instead of closing terminal
- Wait for graceful shutdown

### 2. Avoid Multiple Instances
- Don't run multiple `npm run dev` simultaneously
- Check for existing Node processes before starting

### 3. Regular Health Checks
- Monitor the `/api/health` endpoint
- Watch for database warnings in console

### 4. Clean Development Environment
- Restart development server periodically
- Clear Node modules if issues persist: `rm -rf node_modules && npm install`

## Database Schema

### Current Tables
- `User` - User accounts and authentication
- `Timesheet` - Timesheet records
- `TimesheetEntry` - Individual time entries
- `TimesheetMessage` - Comments/messages on timesheets
- `Message` - Direct messages between users
- `AuditLog` - System audit trail

### Seeded Data
After running `npm run db:seed`, you'll have:

**Users:**
- Manager: `manager@company.com` (password: `password123`)
- Staff: `alice@company.com` (password: `password123`)
- Staff: `bob@company.com` (password: `password123`)
- Staff: `carol@company.com` (password: `password123`)
- HR: `hr@company.com` (password: `password123`)

## Troubleshooting Checklist

When encountering database issues:

- [ ] Stop development server (Ctrl+C)
- [ ] Run `npm run db:reset`
- [ ] Wait for completion
- [ ] Start server with `npm run dev`
- [ ] Test login with demo accounts
- [ ] Check `/api/health` endpoint

If issues persist:
- [ ] Check file permissions on `prisma/dev.db`
- [ ] Verify `.env` file exists and has correct `DATABASE_URL`
- [ ] Clear browser cache and cookies
- [ ] Restart your terminal/IDE

## Advanced Troubleshooting

### Database File Permissions (Windows)
If you get permission errors:

```bash
# Check if database file is read-only
attrib prisma\dev.db

# Remove read-only attribute if needed
attrib -R prisma\dev.db
```

### Complete Clean Slate
For persistent issues, nuclear option:

```bash
# Remove database and node_modules
rm -rf prisma/dev.db* node_modules package-lock.json

# Reinstall and reset
npm install
npm run db:reset
```

## Getting Help

If you continue to experience issues:

1. Check the console output for specific error messages
2. Verify all environment variables are set correctly
3. Ensure no antivirus software is blocking database files
4. Try running as administrator (Windows) if permission issues persist

The database management tools are designed to handle most common issues automatically. The `npm run db:reset` command should resolve 95% of database-related problems. 