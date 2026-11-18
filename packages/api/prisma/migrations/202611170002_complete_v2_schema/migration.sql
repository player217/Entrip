-- Additive v2 restoration. No application table, column, enum or row is deleted.
-- Full pre-conversion rows are retained in a separate, non-API schema.
BEGIN;
-- Freeze source rows before the snapshot and hold locks through conversion.
DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations' ORDER BY tablename LOOP
    EXECUTE format('LOCK TABLE public.%I IN ACCESS EXCLUSIVE MODE', t.tablename);
  END LOOP;
END $$;
CREATE SCHEMA "entrip_legacy_20261117";
DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations' LOOP
    EXECUTE format('CREATE TABLE entrip_legacy_20261117.%I AS TABLE public.%I', t.tablename, t.tablename);
  END LOOP;
END $$;
CREATE TABLE "entrip_legacy_20261117"."_Snapshot" AS SELECT CURRENT_TIMESTAMP AS "capturedAt", '202611170002_complete_v2_schema'::text AS "migration";
CREATE TABLE "entrip_legacy_20261117"."_EnumValues" AS SELECT t.typname, e.enumlabel, e.enumsortorder FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public';

CREATE FUNCTION pg_temp.canonical_company(code text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
 SELECT CASE lower(trim(code)) WHEN 'entrip_main' THEN 'entrip' WHEN 'entrip-main' THEN 'entrip' WHEN 'entrip' THEN 'entrip' WHEN 'star' THEN 'startour' WHEN 'startour' THEN 'startour' WHEN 'happy' THEN 'happytravel' WHEN 'happytravel' THEN 'happytravel' WHEN 'j1' THEN 'j1' ELSE code END
$$;
-- Never merge accounts merely because an alias becomes equal.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM "User" GROUP BY email, pg_temp.canonical_company("companyCode") HAVING count(*) > 1) THEN
   RAISE EXCEPTION 'Company alias normalization would collide User accounts. Resolve duplicate email/company identities before migration; no rows have been changed.';
 END IF;
END $$;

ALTER TABLE "Account" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "Approval" ADD COLUMN "legacyTargetType" TEXT;
UPDATE "Approval" SET "legacyTargetType" = "targetType"::text;
ALTER TABLE "Approval" ALTER COLUMN "targetType" TYPE "ApprovalType" USING
 (CASE lower("targetType"::text) WHEN 'finance' THEN 'PAYMENT' WHEN 'custom' THEN 'MISC' ELSE upper("targetType"::text) END)::"ApprovalType";

ALTER TABLE "Booking"
 ADD COLUMN "bookingNumber" TEXT,
 ADD COLUMN "contact" TEXT,
 ADD COLUMN "createdBy" TEXT,
 ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'KRW',
 ADD COLUMN "customerName" TEXT,
 ADD COLUMN "days" INTEGER,
 ADD COLUMN "depositAmount" DECIMAL(65,30),
 ADD COLUMN "email" TEXT,
 ADD COLUMN "flightInfo" JSONB,
 ADD COLUMN "hotelInfo" JSONB,
 ADD COLUMN "insuranceInfo" JSONB,
 ADD COLUMN "manager" TEXT,
 ADD COLUMN "memo" TEXT,
 ADD COLUMN "nights" INTEGER,
 ADD COLUMN "paxCount" INTEGER,
 ADD COLUMN "representative" TEXT,
 ADD COLUMN "teamType" TEXT,
 ADD COLUMN "totalPrice" DECIMAL(65,30),
 ADD COLUMN "updatedBy" TEXT,
 ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
 ADD COLUMN "legacyType" TEXT;
UPDATE "Booking" SET "bookingNumber"='LEGACY-' || id, "legacyType"=type::text,
 "teamType"=type::text, "paxCount"="totalPax", "totalPrice"=revenue,
 "createdBy"="userId", "manager"=coordinator,
 "nights"=GREATEST(0, "endDate"::date-"startDate"::date),
 "days"=GREATEST(1, "endDate"::date-"startDate"::date+1);
ALTER TABLE "Booking" ALTER COLUMN "bookingNumber" SET NOT NULL;

ALTER TABLE "BookingHistory"
 ADD COLUMN "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 ADD COLUMN "changedBy" TEXT,
 ADD COLUMN "changedFields" JSONB,
 ADD COLUMN "companyCode" TEXT,
 ADD COLUMN "newValues" JSONB,
 ADD COLUMN "previousValues" JSONB;
-- Legacy columns remain queryable; v2 inserts do not need to populate them.
ALTER TABLE "BookingHistory" ALTER COLUMN "performedById" DROP NOT NULL;
UPDATE "BookingHistory" h SET "changedAt"=h."performedAt", "changedBy"=h."performedById",
 "changedFields"='["legacyChanges"]'::jsonb,
 "newValues"=jsonb_build_object('legacyChanges',h.changes),
 "companyCode"=b."companyCode" FROM "Booking" b WHERE b.id=h."bookingId";
ALTER TABLE "BookingHistory" ALTER COLUMN "changedBy" SET NOT NULL,
 ALTER COLUMN "changedFields" SET NOT NULL, ALTER COLUMN "companyCode" SET NOT NULL;

ALTER TABLE "CalendarEvent" ADD COLUMN "legacyCreatedBy" TEXT, ADD COLUMN "legacyUpdatedBy" TEXT;
UPDATE "CalendarEvent" SET "legacyCreatedBy"="createdBy", "legacyUpdatedBy"="updatedBy";
UPDATE "CalendarEvent" c SET "createdBy"=COALESCE((SELECT u.id FROM "User" u WHERE u.id=c."createdBy"),c."createdById"),
 "updatedBy"=(SELECT u.id FROM "User" u WHERE u.id=c."updatedBy");
ALTER TABLE "Conversation" ADD COLUMN "companyCode" TEXT NOT NULL DEFAULT 'entrip';
ALTER TABLE "FinanceRecord" ADD COLUMN "accountId" TEXT, ADD COLUMN "projectId" TEXT;
UPDATE "FinanceRecord" SET "createdBy"=COALESCE("createdBy","createdById"), "approvedBy"=COALESCE("approvedBy","approvedById");
ALTER TABLE "Message" ADD COLUMN "metadata" JSONB;
UPDATE "Message" SET "metadata"=jsonb_build_object('legacyAttachments',attachments) WHERE attachments IS NOT NULL;
ALTER TABLE "UserPresence" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

UPDATE "Account" SET "role"=upper("role"::text)::"AccountRole" WHERE "role" IS NOT NULL;
UPDATE "Account" SET "status"=upper("status"::text)::"AccountStatus" WHERE "status" IS NOT NULL;
UPDATE "ApprovalStep" SET "action"=upper("action"::text)::"ApprovalAction" WHERE "action" IS NOT NULL;
UPDATE "Approval" SET "status"=upper("status"::text)::"ApprovalStatus" WHERE "status" IS NOT NULL;
UPDATE "CalendarEvent" SET "status"=upper("status"::text)::"CalendarEventStatus" WHERE "status" IS NOT NULL;
UPDATE "Conversation" SET "type"=upper("type"::text)::"ConversationType" WHERE "type" IS NOT NULL;
UPDATE "FinanceRecord" SET "status"=upper("status"::text)::"FinanceStatus" WHERE "status" IS NOT NULL;
UPDATE "FinanceRecord" SET "type"=upper("type"::text)::"FinanceType" WHERE "type" IS NOT NULL;
UPDATE "Message" SET "status"=upper("status"::text)::"MessageStatus" WHERE "status" IS NOT NULL;
UPDATE "Message" SET "type"=upper("type"::text)::"MessageType" WHERE "type" IS NOT NULL;
UPDATE "ConversationParticipant" SET "role"=upper("role"::text)::"ParticipantRole" WHERE "role" IS NOT NULL;
UPDATE "UserPresence" SET "status"=upper("status"::text)::"PresenceStatus" WHERE "status" IS NOT NULL;
UPDATE "Booking" SET status=(CASE lower(status::text) WHEN 'done' THEN 'COMPLETED' ELSE upper(status::text) END)::"BookingStatus";
UPDATE "Booking" SET type=(CASE lower(type::text) WHEN 'incentive' THEN 'INCENTIVE' WHEN 'golf' THEN 'PACKAGE' WHEN 'honeymoon' THEN 'PACKAGE' WHEN 'airtel' THEN 'FIT' WHEN 'etc' THEN 'PACKAGE' ELSE upper(type::text) END)::"BookingType";
UPDATE "User" SET role=(CASE role::text WHEN 'GUIDE' THEN 'USER' ELSE upper(role::text) END)::"UserRole";

ALTER TABLE "Account" ALTER COLUMN "role" SET DEFAULT 'STAFF';
ALTER TABLE "Account" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
ALTER TABLE "Approval" ALTER COLUMN "status" SET DEFAULT 'PENDING';
ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'PENDING';
ALTER TABLE "CalendarEvent" ALTER COLUMN "status" SET DEFAULT 'CONFIRMED';
ALTER TABLE "Conversation" ALTER COLUMN "type" SET DEFAULT 'DIRECT';
ALTER TABLE "ConversationParticipant" ALTER COLUMN "role" SET DEFAULT 'MEMBER';
ALTER TABLE "FinanceRecord" ALTER COLUMN "status" SET DEFAULT 'PENDING';
ALTER TABLE "Message" ALTER COLUMN "type" SET DEFAULT 'TEXT';
ALTER TABLE "Message" ALTER COLUMN "status" SET DEFAULT 'SENT';
ALTER TABLE "UserPresence" ALTER COLUMN "status" SET DEFAULT 'OFFLINE';
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "companyCode" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "holderName" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "openingBalance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "Flight" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "flightNumber" TEXT NOT NULL,
    "airline" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "departureTime" TIMESTAMP(3) NOT NULL,
    "arrivalTime" TIMESTAMP(3) NOT NULL,
    "status" "FlightStatus" NOT NULL DEFAULT 'SCHEDULED',
    "gate" TEXT,
    "terminal" TEXT,
    "seatNumbers" TEXT[],
    "paxCount" INTEGER NOT NULL DEFAULT 1,
    "confirmationNo" TEXT,
    "notes" TEXT,
    "companyCode" TEXT NOT NULL DEFAULT 'entrip',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Flight_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "type" "VehicleType" NOT NULL,
    "licensePlate" TEXT,
    "driverName" TEXT,
    "driverContact" TEXT,
    "pickupLocation" TEXT NOT NULL,
    "dropoffLocation" TEXT NOT NULL,
    "pickupTime" TIMESTAMP(3) NOT NULL,
    "dropoffTime" TIMESTAMP(3),
    "passengerCount" INTEGER NOT NULL DEFAULT 1,
    "status" "VehicleStatus" NOT NULL DEFAULT 'RESERVED',
    "cost" DECIMAL(65,30),
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "notes" TEXT,
    "companyCode" TEXT NOT NULL DEFAULT 'entrip',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "Hotel" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "hotelName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "checkInDate" TIMESTAMP(3) NOT NULL,
    "checkOutDate" TIMESTAMP(3) NOT NULL,
    "roomType" TEXT,
    "roomCount" INTEGER NOT NULL DEFAULT 1,
    "guestCount" INTEGER NOT NULL DEFAULT 1,
    "confirmationNo" TEXT,
    "status" "HotelStatus" NOT NULL DEFAULT 'RESERVED',
    "ratePerNight" DECIMAL(65,30),
    "totalAmount" DECIMAL(65,30),
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "breakfast" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "companyCode" TEXT NOT NULL DEFAULT 'entrip',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Hotel_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "type" "SettlementType" NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "exchangeRate" DECIMAL(65,30),
    "quantity" INTEGER,
    "unitPrice" DECIMAL(65,30),
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "SystemMessage" (
    "id" TEXT NOT NULL,
    "type" "SystemMessageType" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "targetAudience" TEXT[],
    "expiresAt" TIMESTAMP(3),
    "companyCode" TEXT NOT NULL DEFAULT 'entrip',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "SystemMessage_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "ConversationSettings" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "allowFileSharing" BOOLEAN NOT NULL DEFAULT true,
    "allowVoiceMessages" BOOLEAN NOT NULL DEFAULT true,
    "allowReactions" BOOLEAN NOT NULL DEFAULT true,
    "maxFileSize" INTEGER NOT NULL DEFAULT 10485760,
    "messageRetention" INTEGER NOT NULL DEFAULT 365,
    "autoArchiveAfter" INTEGER,
    "defaultNotification" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationSettings_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "transactionNumber" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "exchangeRate" DECIMAL(65,30),
    "description" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "counterparty" TEXT,
    "bookingId" TEXT,
    "userId" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bookingId" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);


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


CREATE TABLE "Outbox" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Outbox_pkey" PRIMARY KEY ("id")
);


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


CREATE TABLE "IntegrationProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "status" "ProviderStatus" NOT NULL DEFAULT 'HEALTHY',
    "lastSuccessAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "circuitOpenUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "IntegrationProvider_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "ExternalCallLog" (
    "id" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER,
    "errorType" TEXT,
    "durationMs" INTEGER NOT NULL,
    "requestHash" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalCallLog_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "FxRateCache" (
    "id" TEXT NOT NULL,
    "base" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "rate" DECIMAL(65,30) NOT NULL,
    "source" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "ttlSec" INTEGER NOT NULL DEFAULT 86400,

    CONSTRAINT "FxRateCache_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "rate" DECIMAL(65,30) NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "FlightStatusCache" (
    "id" TEXT NOT NULL,
    "flightNo" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "ttlSec" INTEGER NOT NULL DEFAULT 300,

    CONSTRAINT "FlightStatusCache_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "IntegrationInbox" (
    "id" TEXT NOT NULL,
    "messageKey" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB,
    "processedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationInbox_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "MessageAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "thumbnailUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageAttachment_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "companyCode" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "linkUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyCode" TEXT NOT NULL,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "bookingNotifications" BOOLEAN NOT NULL DEFAULT true,
    "messageNotifications" BOOLEAN NOT NULL DEFAULT true,
    "approvalNotifications" BOOLEAN NOT NULL DEFAULT true,
    "paymentNotifications" BOOLEAN NOT NULL DEFAULT true,
    "systemNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);


-- Normalize all existing and new company fields, keeping original rows in the snapshot.
DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='companyCode' LOOP
   EXECUTE format('UPDATE %I SET "companyCode"=pg_temp.canonical_company("companyCode")',t.table_name);
 END LOOP;
END $$;
ALTER TABLE "User" ALTER COLUMN "companyCode" SET DEFAULT 'entrip';
ALTER TABLE "Booking" ALTER COLUMN "companyCode" SET DEFAULT 'entrip';
ALTER TABLE "CalendarEvent" ALTER COLUMN "companyCode" SET DEFAULT 'entrip';
ALTER TABLE "FinanceRecord" ALTER COLUMN "companyCode" SET DEFAULT 'entrip';
ALTER TABLE "Approval" ALTER COLUMN "companyCode" SET DEFAULT 'entrip';
ALTER TABLE "Account" ALTER COLUMN "companyCode" SET DEFAULT 'entrip';
ALTER TABLE "Conversation" ALTER COLUMN "companyCode" SET DEFAULT 'entrip';
ALTER TABLE "Flight" ALTER COLUMN "companyCode" SET DEFAULT 'entrip';
ALTER TABLE "Vehicle" ALTER COLUMN "companyCode" SET DEFAULT 'entrip';
ALTER TABLE "Hotel" ALTER COLUMN "companyCode" SET DEFAULT 'entrip';
ALTER TABLE "SystemMessage" ALTER COLUMN "companyCode" SET DEFAULT 'entrip';

-- A legacy room had no tenant field. Include all participants, authors and creator.
-- Missing or conflicting identities are quarantined; never default them into one company.
WITH identities AS (
 SELECT "conversationId", "userId" FROM "ConversationParticipant"
 UNION ALL SELECT "conversationId", "senderId" FROM "Message"
 UNION ALL SELECT id, "createdBy" FROM "Conversation" WHERE "createdBy" IS NOT NULL
), owners AS (
 SELECT i."conversationId", count(DISTINCT u."companyCode") AS companies,
 min(u."companyCode") AS company, bool_or(u.id IS NULL) AS missing
 FROM identities i LEFT JOIN "User" u ON u.id=i."userId" GROUP BY i."conversationId"
)
UPDATE "Conversation" c SET "companyCode"=CASE WHEN o.companies=1 AND NOT o.missing THEN o.company ELSE '__quarantine__:' || c.id END
 FROM (SELECT c2.id, o.* FROM "Conversation" c2 LEFT JOIN owners o ON o."conversationId"=c2.id) o WHERE c.id=o.id;
UPDATE "Conversation" SET "deletedAt"=COALESCE("deletedAt",CURRENT_TIMESTAMP) WHERE strpos("companyCode", '__quarantine__:')=1;
UPDATE "Conversation" c SET "createdBy"=NULL WHERE "createdBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id=c."createdBy");
UPDATE "ConversationParticipant" p SET "invitedBy"=NULL WHERE "invitedBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id=p."invitedBy");

-- Replace only the obsolete global uniqueness index; rows and ordinary legacy indexes stay.
DROP INDEX "Account_email_key";
-- Tighten delete behavior without deleting existing relationships.
ALTER TABLE "ConversationParticipant" DROP CONSTRAINT "ConversationParticipant_userId_fkey";
ALTER TABLE "Message" DROP CONSTRAINT "Message_senderId_fkey";
ALTER TABLE "MessageRead" DROP CONSTRAINT "MessageRead_userId_fkey";
ALTER TABLE "MessageReaction" DROP CONSTRAINT "MessageReaction_userId_fkey";

CREATE INDEX IF NOT EXISTS "BankAccount_companyCode_deletedAt_idx" ON "BankAccount"("companyCode", "deletedAt");


CREATE INDEX IF NOT EXISTS "Flight_bookingId_idx" ON "Flight"("bookingId");


CREATE INDEX IF NOT EXISTS "Flight_flightNumber_idx" ON "Flight"("flightNumber");


CREATE INDEX IF NOT EXISTS "Flight_departureTime_idx" ON "Flight"("departureTime");


CREATE INDEX IF NOT EXISTS "Flight_companyCode_idx" ON "Flight"("companyCode");


CREATE INDEX IF NOT EXISTS "Vehicle_bookingId_idx" ON "Vehicle"("bookingId");


CREATE INDEX IF NOT EXISTS "Vehicle_pickupTime_idx" ON "Vehicle"("pickupTime");


CREATE INDEX IF NOT EXISTS "Vehicle_status_idx" ON "Vehicle"("status");


CREATE INDEX IF NOT EXISTS "Vehicle_companyCode_idx" ON "Vehicle"("companyCode");


CREATE INDEX IF NOT EXISTS "Hotel_bookingId_idx" ON "Hotel"("bookingId");


CREATE INDEX IF NOT EXISTS "Hotel_checkInDate_checkOutDate_idx" ON "Hotel"("checkInDate", "checkOutDate");


CREATE INDEX IF NOT EXISTS "Hotel_status_idx" ON "Hotel"("status");


CREATE INDEX IF NOT EXISTS "Hotel_companyCode_idx" ON "Hotel"("companyCode");


CREATE INDEX IF NOT EXISTS "Settlement_bookingId_idx" ON "Settlement"("bookingId");


CREATE INDEX IF NOT EXISTS "Settlement_type_currency_idx" ON "Settlement"("type", "currency");


CREATE INDEX IF NOT EXISTS "SystemMessage_type_idx" ON "SystemMessage"("type");


CREATE INDEX IF NOT EXISTS "SystemMessage_isActive_idx" ON "SystemMessage"("isActive");


CREATE INDEX IF NOT EXISTS "SystemMessage_expiresAt_idx" ON "SystemMessage"("expiresAt");


CREATE INDEX IF NOT EXISTS "SystemMessage_companyCode_idx" ON "SystemMessage"("companyCode");


CREATE UNIQUE INDEX IF NOT EXISTS "ConversationSettings_conversationId_key" ON "ConversationSettings"("conversationId");


CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_transactionNumber_key" ON "Transaction"("transactionNumber");


CREATE INDEX IF NOT EXISTS "Transaction_accountId_idx" ON "Transaction"("accountId");


CREATE INDEX IF NOT EXISTS "Transaction_bookingId_idx" ON "Transaction"("bookingId");


CREATE INDEX IF NOT EXISTS "Transaction_userId_transactionDate_idx" ON "Transaction"("userId", "transactionDate");


CREATE UNIQUE INDEX IF NOT EXISTS "Document_documentNumber_key" ON "Document"("documentNumber");


CREATE INDEX IF NOT EXISTS "Document_bookingId_idx" ON "Document"("bookingId");


CREATE INDEX IF NOT EXISTS "Document_uploadedBy_idx" ON "Document"("uploadedBy");


CREATE INDEX IF NOT EXISTS "Document_type_idx" ON "Document"("type");


CREATE UNIQUE INDEX IF NOT EXISTS "IdempotencyKey_key_key" ON "IdempotencyKey"("key");


CREATE INDEX IF NOT EXISTS "IdempotencyKey_endpoint_ttl_idx" ON "IdempotencyKey"("endpoint", "ttl");


CREATE INDEX IF NOT EXISTS "IdempotencyKey_createdAt_idx" ON "IdempotencyKey"("createdAt");


CREATE INDEX IF NOT EXISTS "Outbox_topic_deliveredAt_idx" ON "Outbox"("topic", "deliveredAt");


CREATE INDEX IF NOT EXISTS "Outbox_createdAt_idx" ON "Outbox"("createdAt");


CREATE INDEX IF NOT EXISTS "Outbox_attempts_idx" ON "Outbox"("attempts");


CREATE INDEX IF NOT EXISTS "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");


CREATE INDEX IF NOT EXISTS "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");


CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");


CREATE UNIQUE INDEX IF NOT EXISTS "IntegrationProvider_name_key" ON "IntegrationProvider"("name");


CREATE INDEX IF NOT EXISTS "IntegrationProvider_status_circuitOpenUntil_idx" ON "IntegrationProvider"("status", "circuitOpenUntil");


CREATE INDEX IF NOT EXISTS "ExternalCallLog_providerName_occurredAt_idx" ON "ExternalCallLog"("providerName", "occurredAt");


CREATE INDEX IF NOT EXISTS "ExternalCallLog_statusCode_occurredAt_idx" ON "ExternalCallLog"("statusCode", "occurredAt");


CREATE INDEX IF NOT EXISTS "ExternalCallLog_errorType_occurredAt_idx" ON "ExternalCallLog"("errorType", "occurredAt");


CREATE INDEX IF NOT EXISTS "FxRateCache_base_fetchedAt_idx" ON "FxRateCache"("base", "fetchedAt");


CREATE INDEX IF NOT EXISTS "FxRateCache_fetchedAt_ttlSec_idx" ON "FxRateCache"("fetchedAt", "ttlSec");


CREATE UNIQUE INDEX IF NOT EXISTS "FxRateCache_base_quote_key" ON "FxRateCache"("base", "quote");


CREATE INDEX IF NOT EXISTS "ExchangeRate_validFrom_validUntil_idx" ON "ExchangeRate"("validFrom", "validUntil");


CREATE UNIQUE INDEX IF NOT EXISTS "ExchangeRate_fromCurrency_toCurrency_validFrom_key" ON "ExchangeRate"("fromCurrency", "toCurrency", "validFrom");


CREATE INDEX IF NOT EXISTS "FlightStatusCache_flightNo_fetchedAt_idx" ON "FlightStatusCache"("flightNo", "fetchedAt");


CREATE INDEX IF NOT EXISTS "FlightStatusCache_fetchedAt_ttlSec_idx" ON "FlightStatusCache"("fetchedAt", "ttlSec");


CREATE INDEX IF NOT EXISTS "FlightStatusCache_status_idx" ON "FlightStatusCache"("status");


CREATE UNIQUE INDEX IF NOT EXISTS "FlightStatusCache_flightNo_date_key" ON "FlightStatusCache"("flightNo", "date");


CREATE UNIQUE INDEX IF NOT EXISTS "IntegrationInbox_messageKey_key" ON "IntegrationInbox"("messageKey");


CREATE INDEX IF NOT EXISTS "IntegrationInbox_provider_eventType_idx" ON "IntegrationInbox"("provider", "eventType");


CREATE INDEX IF NOT EXISTS "IntegrationInbox_processedAt_idx" ON "IntegrationInbox"("processedAt");


CREATE INDEX IF NOT EXISTS "IntegrationInbox_receivedAt_idx" ON "IntegrationInbox"("receivedAt");


CREATE INDEX IF NOT EXISTS "MessageAttachment_messageId_idx" ON "MessageAttachment"("messageId");


CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");


CREATE INDEX IF NOT EXISTS "Notification_companyCode_idx" ON "Notification"("companyCode");


CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");


CREATE INDEX IF NOT EXISTS "Notification_expiresAt_idx" ON "Notification"("expiresAt");


CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPreference_userId_key" ON "NotificationPreference"("userId");


CREATE INDEX IF NOT EXISTS "NotificationPreference_companyCode_idx" ON "NotificationPreference"("companyCode");


CREATE INDEX IF NOT EXISTS "Account_companyCode_idx" ON "Account"("companyCode");


CREATE UNIQUE INDEX IF NOT EXISTS "Account_email_companyCode_key" ON "Account"("email", "companyCode");


CREATE INDEX IF NOT EXISTS "Approval_targetType_targetId_idx" ON "Approval"("targetType", "targetId");


CREATE INDEX IF NOT EXISTS "Approval_companyCode_status_idx" ON "Approval"("companyCode", "status");


CREATE UNIQUE INDEX IF NOT EXISTS "Booking_bookingNumber_key" ON "Booking"("bookingNumber");


CREATE INDEX IF NOT EXISTS "Booking_bookingNumber_idx" ON "Booking"("bookingNumber");


CREATE INDEX IF NOT EXISTS "Booking_companyCode_status_idx" ON "Booking"("companyCode", "status");


CREATE INDEX IF NOT EXISTS "Booking_companyCode_startDate_idx" ON "Booking"("companyCode", "startDate");


CREATE INDEX IF NOT EXISTS "Booking_customerName_idx" ON "Booking"("customerName");


CREATE INDEX IF NOT EXISTS "Booking_teamName_idx" ON "Booking"("teamName");


CREATE INDEX IF NOT EXISTS "BookingHistory_bookingId_changedAt_idx" ON "BookingHistory"("bookingId", "changedAt");


CREATE INDEX IF NOT EXISTS "BookingHistory_companyCode_idx" ON "BookingHistory"("companyCode");


CREATE INDEX IF NOT EXISTS "CalendarEvent_companyCode_start_idx" ON "CalendarEvent"("companyCode", "start");


CREATE INDEX IF NOT EXISTS "Conversation_companyCode_idx" ON "Conversation"("companyCode");


CREATE INDEX IF NOT EXISTS "MessageReaction_messageId_idx" ON "MessageReaction"("messageId");


CREATE INDEX IF NOT EXISTS "MessageRead_userId_idx" ON "MessageRead"("userId");


CREATE INDEX IF NOT EXISTS "UserPresence_status_idx" ON "UserPresence"("status");

ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "FinanceRecord" ADD CONSTRAINT "FinanceRecord_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "Account" ADD CONSTRAINT "Account_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "BookingHistory" ADD CONSTRAINT "BookingHistory_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "MessageRead" ADD CONSTRAINT "MessageRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "Flight" ADD CONSTRAINT "Flight_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "Hotel" ADD CONSTRAINT "Hotel_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "SystemMessage" ADD CONSTRAINT "SystemMessage_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "ConversationSettings" ADD CONSTRAINT "ConversationSettings_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "Document" ADD CONSTRAINT "Document_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


COMMIT;
