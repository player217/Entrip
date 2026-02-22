-- Phase 1.1 – Add-only concurrent indexes (Dev DB)
-- Execute outside a transaction. Recommended via: scripts/db-apply-indexes-phase1_1.sh

-- Booking indexes for common filters/sorts
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Booking_companyCode_createdAt_idx" ON "Booking" ("companyCode", "createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Booking_companyCode_startDate_idx" ON "Booking" ("companyCode", "startDate" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Booking_companyCode_status_idx" ON "Booking" ("companyCode", "status");

-- Notification indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Notification_user_isRead_idx" ON "Notification" ("userId", "isRead");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Notification_company_createdAt_idx" ON "Notification" ("companyCode", "createdAt" DESC);

-- Non-unique helper for user lookups (composite without enforcement)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "User_company_email_idx" ON "User" ("companyCode", "email");

