-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "responseBody" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ttl" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outbox" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_key_key" ON "IdempotencyKey"("key");

-- CreateIndex
CREATE INDEX "IdempotencyKey_endpoint_ttl_idx" ON "IdempotencyKey"("endpoint", "ttl");

-- CreateIndex
CREATE INDEX "Outbox_topic_deliveredAt_idx" ON "Outbox"("topic", "deliveredAt");

-- Add database-level CHECK constraints for data integrity
ALTER TABLE "Booking" ADD CONSTRAINT "booking_total_price_positive" CHECK ("totalPrice" > 0);
ALTER TABLE "Booking" ADD CONSTRAINT "booking_pax_count_positive" CHECK ("paxCount" > 0);
ALTER TABLE "Booking" ADD CONSTRAINT "booking_nights_non_negative" CHECK ("nights" >= 0);
ALTER TABLE "Booking" ADD CONSTRAINT "booking_days_positive" CHECK ("days" > 0);

-- Add CHECK constraint for Settlement table if exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Settlement') THEN
        ALTER TABLE "Settlement" ADD CONSTRAINT "settlement_amount_positive" CHECK ("amount" > 0);
    END IF;
END
$$;