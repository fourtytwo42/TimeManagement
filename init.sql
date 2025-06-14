-- Initialize PostgreSQL database for Timesheet Management System
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create database if it doesn't exist (this runs automatically via POSTGRES_DB)
-- The database 'timesheet_db' will be created by the Docker environment

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE timesheet_db TO timesheet_user; 