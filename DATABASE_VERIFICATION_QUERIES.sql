-- ============================================================================
-- MEDIFIND BACKEND - DATABASE VERIFICATION QUERIES
-- ============================================================================
-- Week 1 Implementation: PostgreSQL Database Verification
-- Database: MediFind_DB
-- Tables: 10 (Users, Refresh Tokens, Medical Profiles, Emergencies, etc.)
-- ============================================================================

-- Quick Reference: Copy any query below and run in pgAdmin 4 or psql CLI
-- All queries are read-only (SELECT statements) - SAFE to execute

-- ============================================================================
-- 1. BASIC DATABASE INFORMATION
-- ============================================================================

-- Check if database exists and connection is working
SELECT NOW() AS "Current Time", current_database() AS "Database Name", current_user AS "Current User";

-- Expected Output:
-- current_time        | Database Name | Current User
-- 2026-03-11 10:15:30 | MediFind_DB   | postgres

---

-- Get database size
SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) AS "Database Size"
FROM pg_database
WHERE datname = 'MediFind_DB';

-- Expected Output:
-- datname     | Database Size
-- MediFind_DB | 25 MB (or similar)

---

-- ============================================================================
-- 2. VERIFY TABLE STRUCTURE (SCHEMA)
-- ============================================================================

-- List all tables in public schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Expected Output (10 tables):
-- users
-- refresh_tokens
-- medical_profiles
-- emergencies
-- emergency_requests
-- emergency_tracking
-- responder
-- caregiver_links
-- medical_reports
-- audit_logs

---

-- Get detailed column information for users table
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Expected Output:
-- Column Name      | Data Type                | Is Nullable | Default
-- id               | uuid                     | NO          | uuid_generate_v4()
-- email            | character varying(255)   | NO          | 
-- fullName         | character varying(255)   | NO          |
-- phoneNumber      | character varying(20)    | NO          |
-- passwordHash     | character varying(255)   | NO          |
-- role             | character varying(50)    | NO          |
-- lastLogin        | timestamp with time zone | YES         |
-- createdAt        | timestamp with time zone | NO          | CURRENT_TIMESTAMP
-- updatedAt        | timestamp with time zone | NO          | CURRENT_TIMESTAMP

---

-- Get detailed column information for refresh_tokens table
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'refresh_tokens'
ORDER BY ordinal_position;

-- Expected Output:
-- Column Name | Data Type                | Is Nullable | Default
-- id          | uuid                     | NO          | uuid_generate_v4()
-- userId      | uuid                     | NO          |
-- tokenHash   | character varying(500)   | NO          |
-- expiresAt   | timestamp with time zone | NO          |
-- revokedAt   | timestamp with time zone | YES         |
-- createdAt   | timestamp with time zone | NO          | CURRENT_TIMESTAMP

---

-- Get table relationships (Foreign Keys)
SELECT 
    constraint_name,
    table_name,
    column_name,
    foreign_table_name,
    foreign_column_name
FROM information_schema.key_column_usage
WHERE table_name IN ('users', 'refresh_tokens', 'medical_profiles', 'emergencies')
    AND foreign_table_name IS NOT NULL
ORDER BY table_name, constraint_name;

-- Expected Output (Foreign Keys):
-- constraint_name              | table_name       | column_name | foreign_table_name | foreign_column_name
-- medical_profiles_userId_fkey | medical_profiles | userId      | users              | id
-- emergencies_patientId_fkey   | emergencies      | patientId   | users              | id
-- emergencies_respId_fkey      | emergencies      | respId      | responder          | id
-- refresh_tokens_userId_fkey   | refresh_tokens   | userId      | users              | id

---

-- Get all indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Expected Output - Indexes on:
-- users (id, email)
-- refresh_tokens (id, userId, expiresAt)
-- medical_profiles (id, userId)
-- emergencies (id, patientId, respId)

---

-- ============================================================================
-- 3. CHECK DATA IN TABLES (AFTER TESTING)
-- ============================================================================

-- Count total users registered
SELECT COUNT(*) AS "Total Users" FROM users;

-- Expected Output: 1 (or more after registration tests)

---

-- List all users with their roles
SELECT 
    id,
    email,
    "fullName",
    role,
    "lastLogin",
    "createdAt"
FROM users
ORDER BY "createdAt" DESC;

-- Expected Output (after registration):
-- id                       | email                    | fullName          | role     | lastLogin            | createdAt
-- 550e8400-e29b-41d4-a... | john.doe@medifind.com   | John Doe          | PATIENT  | 2026-03-11 10:15:30 | 2026-03-11 10:10:00

---

-- Check user by email
SELECT 
    id,
    email,
    "fullName",
    role,
    "passwordHash" IS NOT NULL AS "Has Password",
    "createdAt"
FROM users
WHERE email = 'john.doe@medifind.com';

-- Expected Output:
-- id                       | email                    | fullName   | role    | Has Password | createdAt
-- 550e8400-e29b-41d4-a... | john.doe@medifind.com   | John Doe   | PATIENT | true         | 2026-03-11 10:10:00

---

-- Check refresh tokens (NEVER reveal actual tokens!)
SELECT 
    id,
    "userId",
    LENGTH("tokenHash") AS "Token Hash Length",
    "expiresAt",
    "revokedAt",
    "createdAt",
    CASE 
        WHEN "revokedAt" IS NOT NULL THEN 'Revoked'
        WHEN "expiresAt" < NOW() THEN 'Expired'
        ELSE 'Valid'
    END AS "Status"
FROM refresh_tokens
ORDER BY "createdAt" DESC
LIMIT 10;

-- Expected Output (after login):
-- id                       | userId                   | Token Hash Length | expiresAt           | revokedAt | createdAt            | Status
-- 662e9511-f30c-52e5-b... | 550e8400-e29b-41d4-a... | 88                | 2026-04-10 10:15:30 | null      | 2026-03-11 10:15:30  | Valid

---

-- Check for revoked tokens (after logout)
SELECT 
    id,
    "userId",
    "expiresAt",
    "revokedAt",
    'Revoked' AS "Status"
FROM refresh_tokens
WHERE "revokedAt" IS NOT NULL
ORDER BY "revokedAt" DESC;

-- Expected Output (after logout):
-- id                       | userId                   | expiresAt           | revokedAt            | Status
-- 662e9511-f30c-52e5-b... | 550e8400-e29b-41d4-a... | 2026-04-10 10:15:30 | 2026-03-11 10:16:00  | Revoked

---

-- Count user registrations by role
SELECT 
    role,
    COUNT(*) AS "Count"
FROM users
GROUP BY role
ORDER BY COUNT(*) DESC;

-- Expected Output (after multi-user testing):
-- role      | Count
-- PATIENT   | 1
-- RESPONDER | 1
-- CAREGIVER | 1

---

-- ============================================================================
-- 4. VERIFY OTHER TABLES (Week 1 - Will be empty initially)
-- ============================================================================

-- Check medical_profiles table structure
SELECT COUNT(*) AS "Total Medical Profiles" FROM medical_profiles;

-- Expected: 0 (not used in Week 1)

---

-- Check emergencies table structure
SELECT COUNT(*) AS "Total Emergencies" FROM emergencies;

-- Expected: 0 (not used in Week 1)

---

-- Check all tables for row counts
SELECT 
    table_name,
    COALESCE(reltuples::integer, 0) AS "Row Count"
FROM information_schema.tables
LEFT JOIN pg_class ON table_name = relname
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected Output (Week 1 state):
-- table_name           | Row Count
-- users                | 1-3 (after testing)
-- refresh_tokens       | 1-5 (after testing)
-- medical_profiles     | 0
-- emergencies          | 0
-- emergency_requests   | 0
-- emergency_tracking   | 0
-- responder            | 0
-- caregiver_links      | 0
-- medical_reports      | 0
-- audit_logs           | 0

---

-- ============================================================================
-- 5. PERFORMANCE CHECKS
-- ============================================================================

-- Check if indexes are being used efficiently
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan AS "Index Scans",
    idx_tup_read AS "Tuples Read",
    idx_tup_fetch AS "Tuples Fetched"
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Expected: Shows which indexes are actively used

---

-- Check table size
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS "Size"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Expected Output:
-- tablename            | Size
-- users                | 16 KB
-- refresh_tokens       | 16 KB
-- medical_profiles     | 8 KB
-- (others...)          | 8 KB

---

-- ============================================================================
-- 6. CONSTRAINT VERIFICATION
-- ============================================================================

-- Verify unique constraints (Email must be unique!)
SELECT 
    constraint_name,
    table_name,
    column_name
FROM information_schema.key_column_usage
WHERE constraint_type = 'UNIQUE'
    AND table_schema = 'public'
ORDER BY table_name;

-- Expected Output:
-- constraint_name | table_name | column_name
-- users_email_key | users      | email

---

-- Check NOT NULL constraints
SELECT 
    table_name,
    column_name,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND is_nullable = 'NO'
ORDER BY table_name, ordinal_position;

-- Expected Output (Not Nullable Columns):
-- table_name      | column_name | is_nullable
-- users           | id          | NO
-- users           | email       | NO
-- users           | passwordHash| NO
-- refresh_tokens  | id          | NO
-- refresh_tokens  | userId      | NO
-- refresh_tokens  | tokenHash   | NO

---

-- ============================================================================
-- 7. DATA INTEGRITY CHECKS
-- ============================================================================

-- Find users without passwords (should be 0)
SELECT COUNT(*) AS "Users Without Password" 
FROM users 
WHERE "passwordHash" IS NULL;

-- Expected: 0 (all users should have password hash)

---

-- Find orphaned refresh tokens (userId doesn't exist)
SELECT COUNT(*) AS "Orphaned Tokens" 
FROM refresh_tokens r
LEFT JOIN users u ON r."userId" = u.id
WHERE u.id IS NULL;

-- Expected: 0 (all tokens should link to valid users)

---

-- Find expired but not revoked tokens
SELECT COUNT(*) AS "Expired Tokens" 
FROM refresh_tokens
WHERE "expiresAt" < NOW() 
    AND "revokedAt" IS NULL;

-- Expected: 0 initially (tokens expire in 30 days)

---

-- ============================================================================
-- 8. SECURITY CHECKS
-- ============================================================================

-- DANGER: Check if any plain passwords exist (should be 0)
SELECT COUNT(*) AS "Risk: Plain Passwords" 
FROM users
WHERE "passwordHash" LIKE '%SecurePassword%' 
   OR "passwordHash" NOT LIKE '$2%';  -- bcryptjs starts with $2

-- Expected: 0 (all passwords should be bcryptjs hashes)

---

-- Verify password hash format (bcryptjs uses $2a$, $2b$, $2x$, $2y$)
SELECT 
    id,
    email,
    CASE 
        WHEN "passwordHash" LIKE '$2a$%' THEN '$2a$ - bcryptjs'
        WHEN "passwordHash" LIKE '$2b$%' THEN '$2b$ - bcryptjs'
        ELSE 'Unknown Format'
    END AS "Hash Type",
    LENGTH("passwordHash") AS "Hash Length"
FROM users;

-- Expected Output:
-- id | email                    | Hash Type      | Hash Length
-- 1  | john.doe@medifind.com   | $2b$ - bcryptjs| 60

---

-- ============================================================================
-- 9. CONCURRENT CONNECTION CHECK
-- ============================================================================

-- Check active connections
SELECT 
    datname AS "Database",
    count(*) AS "Active Connections"
FROM pg_stat_activity
WHERE datname = 'MediFind_DB'
GROUP BY datname;

-- Expected: 1-2 connections (backend + pgAdmin)

---

-- ============================================================================
-- 10. MIGRATION STATUS
-- ============================================================================

-- Check if _prisma_migrations table exists (Prisma tracking)
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = '_prisma_migrations'
) AS "Migrations Table Exists";

-- Expected: true

---

-- List all Prisma migrations applied
SELECT 
    id,
    checksum,
    finished_at,
    execution_time_ms AS "Execution Time (ms)",
    logs
FROM "_prisma_migrations"
ORDER BY finished_at DESC;

-- Expected Output (shows all migrations applied):
-- id                                   | checksum | finished_at              | Execution Time | logs
-- 20240101000001_init                  | xxx      | 2026-03-11 10:00:00      | 145            | 
-- 20240101000002_add_refresh_tokens    | xxx      | 2026-03-11 10:00:05      | 98             |

---

-- ============================================================================
-- 11. QUICK HEALTH CHECK (Run all at once)
-- ============================================================================

-- Copy and paste all these together for quick verification
SELECT 
    'Database Connected' AS "Status",
    current_database() AS "Database",
    NOW() AS "Time"
UNION ALL
SELECT 'Table Count', COUNT(*)::text, NULL::timestamp 
FROM information_schema.tables 
WHERE table_schema = 'public'
UNION ALL
SELECT 'Users Count', COUNT(*)::text, NULL::timestamp 
FROM users
UNION ALL
SELECT 'Refresh Tokens Count', COUNT(*)::text, NULL::timestamp 
FROM refresh_tokens
UNION ALL
SELECT 'Valid Tokens', COUNT(*)::text, NULL::timestamp 
FROM refresh_tokens 
WHERE "revokedAt" IS NULL AND "expiresAt" > NOW()
UNION ALL
SELECT 'PostGIS Enabled', 'true'::text, NULL::timestamp 
WHERE EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'postgis');

-- Expected Output (All Green):
-- Status                  | Database    | Time
-- Database Connected      | MediFind_DB | 2026-03-11 10:15:30
-- Table Count             | 10          | 
-- Users Count             | 1           |
-- Refresh Tokens Count    | 2           |
-- Valid Tokens            | 1           |
-- PostGIS Enabled         | true        |

---

-- ============================================================================
-- 12. ADMIN QUERIES FOR MANAGEMENT
-- ============================================================================

-- Clean up old revoked tokens (optional - keep last 30 days)
-- ⚠️ WARNING: This is a DELETE operation - use with caution!
-- DELETE FROM refresh_tokens
-- WHERE "revokedAt" IS NOT NULL 
--   AND "revokedAt" < NOW() - INTERVAL '30 days';

---

-- Clean up expired tokens (optional)
-- ⚠️ WARNING: This is a DELETE operation - use with caution!
-- DELETE FROM refresh_tokens
-- WHERE "expiresAt" < NOW() 
--   AND "revokedAt" IS NOT NULL;

---

-- Get login activity per user
SELECT 
    u.id,
    u.email,
    u."fullName",
    u."lastLogin",
    COUNT(rt.id) AS "Active Sessions"
FROM users u
LEFT JOIN refresh_tokens rt ON u.id = rt."userId" 
    AND rt."revokedAt" IS NULL 
    AND rt."expiresAt" > NOW()
GROUP BY u.id, u.email, u."fullName", u."lastLogin"
ORDER BY u."lastLogin" DESC NULLS LAST;

-- Expected Output (After testing logins):
-- id | email                    | fullName   | lastLogin            | Active Sessions
-- 1  | john.doe@medifind.com   | John Doe   | 2026-03-11 10:15:30  | 1
-- 2  | responder@medifind.com  | Responder  | (null)               | 0

---

-- ============================================================================
-- KEY SQL COMMANDS FOR pgAdmin 4 or psql CLI:
-- ============================================================================

-- COPY ENTIRE FILE INTO pgAdmin SQL WINDOW AND RUN ONE QUERY AT A TIME
-- Or use psql CLI:
--
-- psql -U postgres -d MediFind_DB -f database_verification.sql
--
-- ============================================================================

-- 🎯 RECOMMENDED VERIFICATION ORDER:
--
-- 1. SELECT NOW(); -- Test connection
-- 2. SELECT current_database(); -- Verify correct DB
-- 3. SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'; -- List tables
-- 4. SELECT COUNT(*) FROM users; -- Check users table
-- 5. SELECT COUNT(*) FROM refresh_tokens; -- Check tokens
-- 6. SELECT 'Database health check passed' WHERE EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'postgis'); -- Verify PostGIS
--
-- ============================================================================
