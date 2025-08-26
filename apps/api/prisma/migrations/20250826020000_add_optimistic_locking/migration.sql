-- =============================================
-- Add Optimistic Locking (Version Fields)
-- Generated: 2025-08-26
-- Purpose: Prevent concurrent update conflicts
-- =============================================

-- Add version fields to critical tables for optimistic locking

-- Booking table (most critical for concurrent updates)
ALTER TABLE "Booking" 
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

-- Account table (financial operations)
ALTER TABLE "Account" 
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

-- Transaction table 
ALTER TABLE "Transaction" 
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

-- Approval table (workflow state management)
ALTER TABLE "Approval" 
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

-- Settlement table
ALTER TABLE "Settlement" 
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

-- User table (profile updates)
ALTER TABLE "User" 
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

-- Conversation table (for message system)
ALTER TABLE "Conversation" 
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

-- IntegrationProvider table (circuit breaker state)
ALTER TABLE "IntegrationProvider" 
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

-- Create indexes for version fields (helps with conflict detection queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_booking_version 
  ON "Booking"("id", "version");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_account_version 
  ON "Account"("id", "version");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transaction_version 
  ON "Transaction"("id", "version");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_version 
  ON "Approval"("id", "version");

-- Add check constraint to ensure version is always positive
ALTER TABLE "Booking" 
  ADD CONSTRAINT booking_version_positive CHECK ("version" > 0);

ALTER TABLE "Account" 
  ADD CONSTRAINT account_version_positive CHECK ("version" > 0);

ALTER TABLE "Transaction" 
  ADD CONSTRAINT transaction_version_positive CHECK ("version" > 0);

ALTER TABLE "Approval" 
  ADD CONSTRAINT approval_version_positive CHECK ("version" > 0);

ALTER TABLE "Settlement" 
  ADD CONSTRAINT settlement_version_positive CHECK ("version" > 0);

ALTER TABLE "User" 
  ADD CONSTRAINT user_version_positive CHECK ("version" > 0);

ALTER TABLE "Conversation" 
  ADD CONSTRAINT conversation_version_positive CHECK ("version" > 0);

ALTER TABLE "IntegrationProvider" 
  ADD CONSTRAINT provider_version_positive CHECK ("version" > 0);

-- Add comments for documentation
COMMENT ON COLUMN "Booking"."version" IS 'Optimistic lock version, incremented on each update';
COMMENT ON COLUMN "Account"."version" IS 'Optimistic lock version, incremented on each update';
COMMENT ON COLUMN "Transaction"."version" IS 'Optimistic lock version, incremented on each update';
COMMENT ON COLUMN "Approval"."version" IS 'Optimistic lock version, incremented on each update';
COMMENT ON COLUMN "Settlement"."version" IS 'Optimistic lock version, incremented on each update';
COMMENT ON COLUMN "User"."version" IS 'Optimistic lock version, incremented on each update';
COMMENT ON COLUMN "Conversation"."version" IS 'Optimistic lock version, incremented on each update';
COMMENT ON COLUMN "IntegrationProvider"."version" IS 'Optimistic lock version, incremented on each update';

-- Create trigger function to auto-increment version on update
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to critical tables
CREATE TRIGGER booking_version_trigger
  BEFORE UPDATE ON "Booking"
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

CREATE TRIGGER account_version_trigger
  BEFORE UPDATE ON "Account"
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

CREATE TRIGGER transaction_version_trigger
  BEFORE UPDATE ON "Transaction"
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

CREATE TRIGGER approval_version_trigger
  BEFORE UPDATE ON "Approval"
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

CREATE TRIGGER settlement_version_trigger
  BEFORE UPDATE ON "Settlement"
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

-- Note: Triggers ensure version is always incremented, 
-- but application should still check version for optimistic locking