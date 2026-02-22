-- One-shot additive migration to align DB for v2 while keeping v1 compatible
-- Date: 2025-10-20
-- Strategy: additive-only (no drops), conditional creation, and safe backfills

-- =========================================
-- Enums
-- =========================================

-- FinanceType
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t WHERE t.typname = 'FinanceType') THEN
    CREATE TYPE "FinanceType" AS ENUM ('INCOME', 'EXPENSE');
  END IF;
END $$;

-- FinanceStatus (+ ensure DELETED value)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t WHERE t.typname = 'FinanceStatus') THEN
    CREATE TYPE "FinanceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
  BEGIN
    ALTER TYPE "FinanceStatus" ADD VALUE 'DELETED';
  EXCEPTION WHEN duplicate_object THEN
    -- already added
    NULL;
  END;
END $$;

-- BookingType (should already exist from v1)
-- safeguard: do nothing if missing (v1 provides it). If absent, create minimal.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t WHERE t.typname = 'BookingType') THEN
    CREATE TYPE "BookingType" AS ENUM ('PACKAGE','FIT','GROUP','BUSINESS','INCENTIVE');
  END IF;
END $$;

-- =========================================
-- User table additions
-- =========================================
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP;

-- =========================================
-- Booking table additions/backfills
-- =========================================
-- Add new columns required by v2 (all additive)
ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "type" "BookingType" DEFAULT 'PACKAGE',
  ADD COLUMN IF NOT EXISTS "totalPax" INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "vehicleInfo" JSONB,
  ADD COLUMN IF NOT EXISTS "coordinator" TEXT,
  ADD COLUMN IF NOT EXISTS "revenue" DECIMAL,
  ADD COLUMN IF NOT EXISTS "userId" TEXT,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP;

-- Backfill type from legacy bookingType when available
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Booking' AND column_name = 'bookingType'
  ) THEN
    EXECUTE 'UPDATE "Booking" SET "type" = "bookingType"::"BookingType" WHERE "type" IS NULL';
  END IF;
END $$;

-- Backfill totalPax from paxCount when available
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Booking' AND column_name = 'paxCount'
  ) THEN
    EXECUTE 'UPDATE "Booking" SET "totalPax" = GREATEST(1, COALESCE("paxCount", 1)) WHERE "totalPax" IS NULL';
  END IF;
END $$;

-- Add FK for Booking.userId -> User.id (SET NULL on delete)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.table_name = 'Booking' AND tc.constraint_type = 'FOREIGN KEY' AND tc.constraint_name = 'Booking_userId_fkey'
  ) THEN
    ALTER TABLE "Booking"
      ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Helpful indexes (idempotent + column-safe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Booking' AND column_name = 'bookingNumber'
  ) THEN
    CREATE INDEX IF NOT EXISTS "Booking_bookingNumber_idx" ON "Booking"("bookingNumber");
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Booking' AND column_name = 'status'
  ) THEN
    CREATE INDEX IF NOT EXISTS "Booking_status_idx" ON "Booking"("status");
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Booking' AND column_name = 'startDate'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Booking' AND column_name = 'endDate'
  ) THEN
    CREATE INDEX IF NOT EXISTS "Booking_start_end_idx" ON "Booking"("startDate","endDate");
  END IF;
END $$;

-- =========================================
-- FinanceRecord table (create if missing)
-- =========================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'FinanceRecord'
  ) THEN
    CREATE TABLE "FinanceRecord" (
      "id" TEXT PRIMARY KEY,
      "type" "FinanceType" NOT NULL,
      "category" TEXT NOT NULL,
      "amount" DECIMAL NOT NULL,
      "currency" TEXT NOT NULL DEFAULT 'KRW',
      "exchangeRate" DECIMAL NOT NULL DEFAULT 1.0,
      "occurredAt" TIMESTAMP NOT NULL,
      "description" TEXT,
      "remarks" TEXT,
      "companyCode" TEXT NOT NULL DEFAULT 'ENTRIP_MAIN',
      "createdBy" TEXT,
      "updatedBy" TEXT,
      "status" "FinanceStatus" NOT NULL DEFAULT 'PENDING',
      "approvedBy" TEXT,
      "approvedAt" TIMESTAMP,
      "rejectedBy" TEXT,
      "rejectedAt" TIMESTAMP,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "deletedAt" TIMESTAMP
    );
  END IF;
END $$;

-- Indexes for FinanceRecord (idempotent + column-safe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'FinanceRecord' AND column_name = 'type'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'FinanceRecord' AND column_name = 'status'
  ) THEN
    CREATE INDEX IF NOT EXISTS "FinanceRecord_type_status_idx" ON "FinanceRecord"("type","status");
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'FinanceRecord' AND column_name = 'occurredAt'
  ) THEN
    CREATE INDEX IF NOT EXISTS "FinanceRecord_occurredAt_idx" ON "FinanceRecord"("occurredAt");
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'FinanceRecord' AND column_name = 'status'
  ) THEN
    CREATE INDEX IF NOT EXISTS "FinanceRecord_status_idx" ON "FinanceRecord"("status");
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'FinanceRecord' AND column_name = 'createdAt'
  ) THEN
    CREATE INDEX IF NOT EXISTS "FinanceRecord_createdAt_idx" ON "FinanceRecord"("createdAt");
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'FinanceRecord' AND column_name = 'companyCode'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'FinanceRecord' AND column_name = 'type'
  ) THEN
    CREATE INDEX IF NOT EXISTS "FinanceRecord_companyCode_type_idx" ON "FinanceRecord"("companyCode","type");
  END IF;
END $$;

-- FKs for FinanceRecord user references (conditional)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'FinanceRecord' AND constraint_name = 'FinanceRecord_createdBy_fkey'
  ) THEN
    ALTER TABLE "FinanceRecord" ADD CONSTRAINT "FinanceRecord_createdBy_fkey"
      FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'FinanceRecord' AND constraint_name = 'FinanceRecord_approvedBy_fkey'
  ) THEN
    ALTER TABLE "FinanceRecord" ADD CONSTRAINT "FinanceRecord_approvedBy_fkey"
      FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'FinanceRecord' AND constraint_name = 'FinanceRecord_rejectedBy_fkey'
  ) THEN
    ALTER TABLE "FinanceRecord" ADD CONSTRAINT "FinanceRecord_rejectedBy_fkey"
      FOREIGN KEY ("rejectedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- =========================================
-- FxRateCache precision (optional, keep as-is if v1 style exists)
-- NOTE: We won’t alter precision to avoid lock; both Prisma Decimal map safely.
-- =========================================

-- Done.
