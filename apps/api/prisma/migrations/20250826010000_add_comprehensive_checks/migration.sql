-- =============================================
-- Comprehensive CHECK Constraints for Data Integrity
-- Generated: 2025-08-26
-- Purpose: Enforce business rules at database level
-- =============================================

-- ===== Booking Table Constraints =====

-- Existing constraints (skip if exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_total_price_positive') THEN
    ALTER TABLE "Booking" ADD CONSTRAINT booking_total_price_positive CHECK ("totalPrice" > 0);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_pax_count_positive') THEN
    ALTER TABLE "Booking" ADD CONSTRAINT booking_pax_count_positive CHECK ("paxCount" > 0);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_nights_non_negative') THEN
    ALTER TABLE "Booking" ADD CONSTRAINT booking_nights_non_negative CHECK ("nights" >= 0);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_days_positive') THEN
    ALTER TABLE "Booking" ADD CONSTRAINT booking_days_positive CHECK ("days" > 0);
  END IF;
END $$;

-- New comprehensive constraints
ALTER TABLE "Booking" ADD CONSTRAINT booking_dates_valid 
  CHECK ("startDate" < "endDate");

ALTER TABLE "Booking" ADD CONSTRAINT booking_deposit_valid 
  CHECK ("depositAmount" IS NULL OR ("depositAmount" >= 0 AND "depositAmount" <= "totalPrice"));

ALTER TABLE "Booking" ADD CONSTRAINT booking_currency_valid 
  CHECK ("currency" IN ('KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP'));

ALTER TABLE "Booking" ADD CONSTRAINT booking_email_format 
  CHECK ("email" IS NULL OR "email" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE "Booking" ADD CONSTRAINT booking_contact_format 
  CHECK ("contact" IS NULL OR "contact" ~* '^[0-9+-]{10,20}$');

ALTER TABLE "Booking" ADD CONSTRAINT booking_memo_length 
  CHECK ("memo" IS NULL OR length("memo") <= 500);

-- ===== Transaction Table Constraints =====

ALTER TABLE "Transaction" ADD CONSTRAINT transaction_amount_positive 
  CHECK ("amount" > 0);

ALTER TABLE "Transaction" ADD CONSTRAINT transaction_exchange_rate_positive 
  CHECK ("exchangeRate" IS NULL OR "exchangeRate" > 0);

ALTER TABLE "Transaction" ADD CONSTRAINT transaction_currency_valid 
  CHECK ("currency" IN ('KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP'));

-- ===== Settlement Table Constraints =====

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'settlement_amount_positive') THEN
    ALTER TABLE "Settlement" ADD CONSTRAINT settlement_amount_positive CHECK ("amount" > 0);
  END IF;
END $$;

ALTER TABLE "Settlement" ADD CONSTRAINT settlement_exchange_rate_positive 
  CHECK ("exchangeRate" IS NULL OR "exchangeRate" > 0);

ALTER TABLE "Settlement" ADD CONSTRAINT settlement_quantity_positive 
  CHECK ("quantity" IS NULL OR "quantity" > 0);

ALTER TABLE "Settlement" ADD CONSTRAINT settlement_unit_price_positive 
  CHECK ("unitPrice" IS NULL OR "unitPrice" > 0);

ALTER TABLE "Settlement" ADD CONSTRAINT settlement_currency_valid 
  CHECK ("currency" IN ('KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP'));

-- ===== Account Table Constraints =====

ALTER TABLE "Account" ADD CONSTRAINT account_balance_non_negative 
  CHECK ("balance" >= 0);

ALTER TABLE "Account" ADD CONSTRAINT account_currency_valid 
  CHECK ("currency" IN ('KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP'));

-- ===== Approval Table Constraints =====

ALTER TABLE "Approval" ADD CONSTRAINT approval_amount_positive 
  CHECK ("amount" IS NULL OR "amount" > 0);

ALTER TABLE "Approval" ADD CONSTRAINT approval_dates_valid 
  CHECK (
    ("status" != 'APPROVED' OR "approvedAt" IS NOT NULL) AND
    ("status" != 'REJECTED' OR "rejectReason" IS NOT NULL)
  );

-- ===== Flight Table Constraints =====

ALTER TABLE "Flight" ADD CONSTRAINT flight_times_format 
  CHECK (
    "departureTime" ~* '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND
    "arrivalTime" ~* '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  );

ALTER TABLE "Flight" ADD CONSTRAINT flight_dates_iso_format 
  CHECK (
    ("departDate" IS NULL OR "departDate" ~* '^\d{4}-\d{2}-\d{2}$') AND
    ("arriveDate" IS NULL OR "arriveDate" ~* '^\d{4}-\d{2}-\d{2}$')
  );

-- ===== Vehicle Table Constraints =====

ALTER TABLE "Vehicle" ADD CONSTRAINT vehicle_passengers_positive 
  CHECK ("passengers" > 0);

ALTER TABLE "Vehicle" ADD CONSTRAINT vehicle_count_positive 
  CHECK ("count" IS NULL OR "count" > 0);

ALTER TABLE "Vehicle" ADD CONSTRAINT vehicle_times_format 
  CHECK (
    ("pickupTime" IS NULL OR "pickupTime" ~* '^([01][0-9]|2[0-3]):[0-5][0-9]$') AND
    ("returnTime" IS NULL OR "returnTime" ~* '^([01][0-9]|2[0-3]):[0-5][0-9]$')
  );

ALTER TABLE "Vehicle" ADD CONSTRAINT vehicle_dates_iso_format 
  CHECK (
    ("pickupDate" IS NULL OR "pickupDate" ~* '^\d{4}-\d{2}-\d{2}$') AND
    ("returnDate" IS NULL OR "returnDate" ~* '^\d{4}-\d{2}-\d{2}$')
  );

-- ===== Hotel Table Constraints =====

ALTER TABLE "Hotel" ADD CONSTRAINT hotel_dates_iso_format 
  CHECK (
    "checkIn" ~* '^\d{4}-\d{2}-\d{2}$' AND
    "checkOut" ~* '^\d{4}-\d{2}-\d{2}$'
  );

ALTER TABLE "Hotel" ADD CONSTRAINT hotel_dates_valid 
  CHECK ("checkIn" < "checkOut");

ALTER TABLE "Hotel" ADD CONSTRAINT hotel_nights_positive 
  CHECK ("nights" IS NULL OR "nights" > 0);

-- ===== ExchangeRate Table Constraints =====

ALTER TABLE "ExchangeRate" ADD CONSTRAINT exchange_rate_positive 
  CHECK ("rate" > 0);

ALTER TABLE "ExchangeRate" ADD CONSTRAINT exchange_dates_valid 
  CHECK ("validFrom" < "validUntil");

-- ===== Message Table Constraints =====

ALTER TABLE "Message" ADD CONSTRAINT message_content_required 
  CHECK (
    ("type" = 'TEXT' AND "content" IS NOT NULL AND length("content") > 0) OR
    ("type" != 'TEXT')
  );

-- ===== Integration Provider Constraints =====

ALTER TABLE "IntegrationProvider" ADD CONSTRAINT provider_error_count_non_negative 
  CHECK ("errorCount" >= 0);

ALTER TABLE "IntegrationProvider" ADD CONSTRAINT provider_circuit_valid 
  CHECK (
    ("circuitOpenUntil" IS NULL) OR 
    ("circuitOpenUntil" > now())
  );

-- ===== Cache Table Constraints =====

ALTER TABLE "FxRateCache" ADD CONSTRAINT fx_cache_rate_positive 
  CHECK ("rate" > 0);

ALTER TABLE "FxRateCache" ADD CONSTRAINT fx_cache_ttl_positive 
  CHECK ("ttlSec" > 0);

ALTER TABLE "FlightStatusCache" ADD CONSTRAINT flight_cache_ttl_positive 
  CHECK ("ttlSec" > 0);

-- ===== Create Performance Indexes =====

-- Partial indexes for frequently queried statuses
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_booking_confirmed 
  ON "Booking"("startDate", "endDate") 
  WHERE status = 'CONFIRMED';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_booking_pending 
  ON "Booking"("createdAt") 
  WHERE status = 'PENDING';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_pending 
  ON "Approval"("createdAt", "approverId") 
  WHERE status = 'PENDING';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transaction_recent 
  ON "Transaction"("transactionDate") 
  WHERE "transactionDate" > (CURRENT_DATE - INTERVAL '90 days');

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_booking_customer_search 
  ON "Booking"("customerName", "teamName", "status");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_booking_date_range 
  ON "Booking"("startDate", "endDate", "status")
  WHERE status IN ('CONFIRMED', 'PENDING');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flight_schedule 
  ON "Flight"("departDate", "departureTime", "airline");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hotel_availability 
  ON "Hotel"("checkIn", "checkOut", "name");

-- Message system performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_unread 
  ON "Message"("conversationId", "createdAt")
  WHERE "isDeleted" = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_active 
  ON "Conversation"("lastActivity")
  WHERE "lastMessageId" IS NOT NULL;

-- Financial tracking indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_settlement_summary 
  ON "Settlement"("bookingId", "type", "currency");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_account_active 
  ON "Account"("managerId", "isActive")
  WHERE "isActive" = true;

-- Integration monitoring indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_provider_health 
  ON "IntegrationProvider"("status", "lastSuccessAt")
  WHERE status != 'HEALTHY';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_external_call_errors 
  ON "ExternalCallLog"("providerName", "errorType", "occurredAt")
  WHERE "errorType" IS NOT NULL;

-- Cache optimization indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fx_cache_lookup 
  ON "FxRateCache"("base", "quote", "fetchedAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flight_cache_lookup 
  ON "FlightStatusCache"("flightNo", "date", "fetchedAt");

-- Audit and monitoring indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_recent 
  ON "AuditLog"("createdAt", "action")
  WHERE "createdAt" > (CURRENT_DATE - INTERVAL '30 days');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_idempotency_cleanup 
  ON "IdempotencyKey"("ttl")
  WHERE "ttl" < now();

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outbox_pending 
  ON "Outbox"("topic", "createdAt")
  WHERE "deliveredAt" IS NULL;

-- ===== Add Comments for Documentation =====

COMMENT ON CONSTRAINT booking_total_price_positive ON "Booking" IS 'Ensures booking total price is always positive';
COMMENT ON CONSTRAINT booking_dates_valid ON "Booking" IS 'Ensures end date is after start date';
COMMENT ON CONSTRAINT booking_currency_valid ON "Booking" IS 'Restricts currency to supported codes';
COMMENT ON CONSTRAINT transaction_amount_positive ON "Transaction" IS 'Ensures transaction amounts are positive';
COMMENT ON CONSTRAINT settlement_amount_positive ON "Settlement" IS 'Ensures settlement amounts are positive';
COMMENT ON CONSTRAINT account_balance_non_negative ON "Account" IS 'Prevents negative account balances';

-- ===== Statistics Update =====
-- Update statistics for query planner optimization
ANALYZE "Booking";
ANALYZE "Transaction";
ANALYZE "Settlement";
ANALYZE "Flight";
ANALYZE "Hotel";
ANALYZE "Vehicle";
ANALYZE "Account";
ANALYZE "Approval";
ANALYZE "IntegrationProvider";
ANALYZE "ExternalCallLog";