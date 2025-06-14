# PostgreSQL Migration Guide

## Quick Setup (Recommended)

### Option 1: Using Docker (Easiest)

1. **Install Docker Desktop** if you haven't already
2. **Start Docker Desktop**
3. **Run the database:**
   ```bash
   docker-compose up -d
   ```

### Option 2: Local PostgreSQL Installation

1. **Download PostgreSQL** from https://www.postgresql.org/download/windows/
2. **Install with these settings:**
   - Username: `timesheet_user`
   - Password: `timesheet_password`
   - Database: `timesheet_db`
   - Port: `5432`

## Environment Configuration

**Update your `.env` file with:**
```env
DATABASE_URL="postgresql://timesheet_user:timesheet_password@localhost:5432/timesheet_db"
```

## Migration Commands

```bash
# Generate Prisma client for PostgreSQL
npx prisma generate

# Create and apply database schema
npx prisma db push

# Seed the database with demo data
npx prisma db seed

# Start the application
npm run dev
```

## Benefits of PostgreSQL

✅ **No more file locking issues**
✅ **Better performance and scalability**
✅ **ACID compliance**
✅ **Concurrent connections**
✅ **Production-ready**
✅ **Better JSON support**
✅ **Advanced indexing**

## Troubleshooting

If you get connection errors:
1. Make sure PostgreSQL is running
2. Check the connection string in `.env`
3. Verify the database exists
4. Check firewall settings

## Rollback to SQLite (if needed)

If you want to go back to SQLite temporarily:
```env
DATABASE_URL="file:./dev.db"
```

Then change `provider = "sqlite"` in `prisma/schema.prisma` 