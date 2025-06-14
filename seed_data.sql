-- Seed data for Timesheet Management System

-- Insert users with hashed passwords (password123 hashed with bcrypt)
INSERT INTO "User" ("id", "email", "name", "role", "password", "payRate", "managerId", "settings", "createdAt", "updatedAt") VALUES
('hr-user-001', 'hr@company.com', 'HR Admin', 'HR', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VJBzwxAaa', 25.0, NULL, '{"emailNotifications": false}', NOW(), NOW()),
('manager-001', 'manager@company.com', 'Manager User', 'MANAGER', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VJBzwxAaa', 30.0, NULL, '{"emailNotifications": false}', NOW(), NOW()),
('staff-alice', 'alice@company.com', 'Alice Johnson', 'STAFF', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VJBzwxAaa', 20.0, 'manager-001', '{"emailNotifications": false}', NOW(), NOW()),
('staff-bob', 'bob@company.com', 'Bob Smith', 'STAFF', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VJBzwxAaa', 22.0, 'manager-001', '{"emailNotifications": false}', NOW(), NOW()),
('staff-carol', 'carol@company.com', 'Carol Davis', 'STAFF', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VJBzwxAaa', 21.0, 'manager-001', '{"emailNotifications": false}', NOW(), NOW());

-- Verify the data was inserted
SELECT 'Users created:' as message, COUNT(*) as count FROM "User";
SELECT email, name, role FROM "User" ORDER BY role, name; 