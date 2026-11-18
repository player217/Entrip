-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "department" TEXT,
    "companyCode" TEXT NOT NULL DEFAULT 'entrip',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingNumber" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "teamType" TEXT,
    "type" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "nights" INTEGER,
    "days" INTEGER,
    "customerName" TEXT,
    "representative" TEXT,
    "contact" TEXT,
    "email" TEXT,
    "totalPax" INTEGER NOT NULL DEFAULT 1,
    "paxCount" INTEGER,
    "coordinator" TEXT NOT NULL,
    "manager" TEXT,
    "revenue" DECIMAL,
    "totalPrice" DECIMAL,
    "depositAmount" DECIMAL,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "flightInfo" JSONB,
    "hotelInfo" JSONB,
    "vehicleInfo" JSONB,
    "insuranceInfo" JSONB,
    "notes" TEXT,
    "memo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "companyCode" TEXT NOT NULL DEFAULT 'entrip',
    "userId" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "start" DATETIME NOT NULL,
    "end" DATETIME NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "companyCode" TEXT NOT NULL DEFAULT 'entrip',
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "CalendarEvent_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CalendarEvent_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyCode" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "holderName" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "openingBalance" DECIMAL NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "FinanceRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT,
    "projectId" TEXT,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "exchangeRate" DECIMAL NOT NULL DEFAULT 1.0,
    "occurredAt" DATETIME NOT NULL,
    "description" TEXT,
    "remarks" TEXT,
    "companyCode" TEXT NOT NULL DEFAULT 'entrip',
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "rejectedBy" TEXT,
    "rejectedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "FinanceRecord_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BankAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FinanceRecord_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FinanceRecord_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FinanceRecord_rejectedBy_fkey" FOREIGN KEY ("rejectedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "amount" DECIMAL,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "requesterId" TEXT NOT NULL,
    "companyCode" TEXT NOT NULL DEFAULT 'entrip',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Approval_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApprovalStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "approvalId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "action" TEXT,
    "comment" TEXT,
    "actedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ApprovalStep_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "Approval" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ApprovalStep_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "companyCode" TEXT NOT NULL DEFAULT 'entrip',
    "createdBy" TEXT,
    "passwordHash" TEXT,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Account_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "type" TEXT NOT NULL DEFAULT 'DIRECT',
    "description" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "allowInvites" BOOLEAN NOT NULL DEFAULT true,
    "companyCode" TEXT NOT NULL DEFAULT 'entrip',
    "lastActivity" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "createdBy" TEXT,
    CONSTRAINT "Conversation_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "nickname" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastReadAt" DATETIME,
    "lastSeenAt" DATETIME,
    "canInvite" BOOLEAN NOT NULL DEFAULT false,
    "canManage" BOOLEAN NOT NULL DEFAULT false,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" DATETIME,
    "invitedBy" TEXT,
    CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ConversationParticipant_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "replyToId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Message" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BookingHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changedFields" JSONB NOT NULL,
    "previousValues" JSONB,
    "newValues" JSONB,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" TEXT NOT NULL,
    "companyCode" TEXT NOT NULL,
    CONSTRAINT "BookingHistory_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BookingHistory_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserPresence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OFFLINE',
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusMessage" TEXT,
    CONSTRAINT "UserPresence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MessageRead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageRead_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MessageRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MessageReaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MessageReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Flight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT,
    "flightNumber" TEXT NOT NULL,
    "airline" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "departureTime" DATETIME NOT NULL,
    "arrivalTime" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "gate" TEXT,
    "terminal" TEXT,
    "seatNumbers" JSONB NOT NULL DEFAULT [],
    "paxCount" INTEGER NOT NULL DEFAULT 1,
    "confirmationNo" TEXT,
    "notes" TEXT,
    "companyCode" TEXT NOT NULL DEFAULT 'entrip',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Flight_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT,
    "type" TEXT NOT NULL,
    "licensePlate" TEXT,
    "driverName" TEXT,
    "driverContact" TEXT,
    "pickupLocation" TEXT NOT NULL,
    "dropoffLocation" TEXT NOT NULL,
    "pickupTime" DATETIME NOT NULL,
    "dropoffTime" DATETIME,
    "passengerCount" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "cost" DECIMAL,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "notes" TEXT,
    "companyCode" TEXT NOT NULL DEFAULT 'entrip',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Vehicle_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Hotel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT,
    "hotelName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "checkInDate" DATETIME NOT NULL,
    "checkOutDate" DATETIME NOT NULL,
    "roomType" TEXT,
    "roomCount" INTEGER NOT NULL DEFAULT 1,
    "guestCount" INTEGER NOT NULL DEFAULT 1,
    "confirmationNo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "ratePerNight" DECIMAL,
    "totalAmount" DECIMAL,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "breakfast" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "companyCode" TEXT NOT NULL DEFAULT 'entrip',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Hotel_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "exchangeRate" DECIMAL,
    "quantity" INTEGER,
    "unitPrice" DECIMAL,
    "memo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "Settlement_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SystemMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "targetAudience" JSONB NOT NULL DEFAULT [],
    "expiresAt" DATETIME,
    "companyCode" TEXT NOT NULL DEFAULT 'entrip',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT,
    CONSTRAINT "SystemMessage_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConversationSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "allowFileSharing" BOOLEAN NOT NULL DEFAULT true,
    "allowVoiceMessages" BOOLEAN NOT NULL DEFAULT true,
    "allowReactions" BOOLEAN NOT NULL DEFAULT true,
    "maxFileSize" INTEGER NOT NULL DEFAULT 10485760,
    "messageRetention" INTEGER NOT NULL DEFAULT 365,
    "autoArchiveAfter" INTEGER,
    "defaultNotification" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ConversationSettings_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transactionNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL,
    "exchangeRate" DECIMAL,
    "description" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "counterparty" TEXT,
    "bookingId" TEXT,
    "userId" TEXT NOT NULL,
    "transactionDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bookingId" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Document_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "responseBody" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ttl" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Outbox" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topic" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" DATETIME,
    "attempts" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "detail" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "IntegrationProvider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'HEALTHY',
    "lastSuccessAt" DATETIME,
    "lastErrorAt" DATETIME,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "circuitOpenUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "ExternalCallLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerName" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER,
    "errorType" TEXT,
    "durationMs" INTEGER NOT NULL,
    "requestHash" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FxRateCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "base" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "rate" DECIMAL NOT NULL,
    "source" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL,
    "ttlSec" INTEGER NOT NULL DEFAULT 86400
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "rate" DECIMAL NOT NULL,
    "validFrom" DATETIME NOT NULL,
    "validUntil" DATETIME NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL'
);

-- CreateTable
CREATE TABLE "FlightStatusCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flightNo" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL,
    "ttlSec" INTEGER NOT NULL DEFAULT 300
);

-- CreateTable
CREATE TABLE "IntegrationInbox" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageKey" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB,
    "processedAt" DATETIME,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MessageAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "thumbnailUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyCode" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" DATETIME,
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "linkUrl" TEXT,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "User_companyCode_idx" ON "User"("companyCode");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_companyCode_key" ON "User"("email", "companyCode");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_bookingNumber_key" ON "Booking"("bookingNumber");

-- CreateIndex
CREATE INDEX "Booking_bookingNumber_idx" ON "Booking"("bookingNumber");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_startDate_endDate_idx" ON "Booking"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "Booking_createdAt_idx" ON "Booking"("createdAt");

-- CreateIndex
CREATE INDEX "Booking_companyCode_status_idx" ON "Booking"("companyCode", "status");

-- CreateIndex
CREATE INDEX "Booking_companyCode_startDate_idx" ON "Booking"("companyCode", "startDate");

-- CreateIndex
CREATE INDEX "Booking_customerName_idx" ON "Booking"("customerName");

-- CreateIndex
CREATE INDEX "Booking_teamName_idx" ON "Booking"("teamName");

-- CreateIndex
CREATE INDEX "CalendarEvent_start_end_idx" ON "CalendarEvent"("start", "end");

-- CreateIndex
CREATE INDEX "CalendarEvent_status_idx" ON "CalendarEvent"("status");

-- CreateIndex
CREATE INDEX "CalendarEvent_createdAt_idx" ON "CalendarEvent"("createdAt");

-- CreateIndex
CREATE INDEX "CalendarEvent_companyCode_start_idx" ON "CalendarEvent"("companyCode", "start");

-- CreateIndex
CREATE INDEX "BankAccount_companyCode_deletedAt_idx" ON "BankAccount"("companyCode", "deletedAt");

-- CreateIndex
CREATE INDEX "FinanceRecord_type_status_idx" ON "FinanceRecord"("type", "status");

-- CreateIndex
CREATE INDEX "FinanceRecord_occurredAt_idx" ON "FinanceRecord"("occurredAt");

-- CreateIndex
CREATE INDEX "FinanceRecord_status_idx" ON "FinanceRecord"("status");

-- CreateIndex
CREATE INDEX "FinanceRecord_createdAt_idx" ON "FinanceRecord"("createdAt");

-- CreateIndex
CREATE INDEX "FinanceRecord_companyCode_type_idx" ON "FinanceRecord"("companyCode", "type");

-- CreateIndex
CREATE INDEX "Approval_status_idx" ON "Approval"("status");

-- CreateIndex
CREATE INDEX "Approval_requesterId_idx" ON "Approval"("requesterId");

-- CreateIndex
CREATE INDEX "Approval_targetType_targetId_idx" ON "Approval"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "Approval_createdAt_idx" ON "Approval"("createdAt");

-- CreateIndex
CREATE INDEX "Approval_companyCode_status_idx" ON "Approval"("companyCode", "status");

-- CreateIndex
CREATE INDEX "ApprovalStep_approvalId_order_idx" ON "ApprovalStep"("approvalId", "order");

-- CreateIndex
CREATE INDEX "ApprovalStep_approverId_idx" ON "ApprovalStep"("approverId");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalStep_approvalId_order_key" ON "ApprovalStep"("approvalId", "order");

-- CreateIndex
CREATE INDEX "Account_role_idx" ON "Account"("role");

-- CreateIndex
CREATE INDEX "Account_status_idx" ON "Account"("status");

-- CreateIndex
CREATE INDEX "Account_createdAt_idx" ON "Account"("createdAt");

-- CreateIndex
CREATE INDEX "Account_companyCode_idx" ON "Account"("companyCode");

-- CreateIndex
CREATE UNIQUE INDEX "Account_email_companyCode_key" ON "Account"("email", "companyCode");

-- CreateIndex
CREATE INDEX "Conversation_type_idx" ON "Conversation"("type");

-- CreateIndex
CREATE INDEX "Conversation_lastActivity_idx" ON "Conversation"("lastActivity");

-- CreateIndex
CREATE INDEX "Conversation_createdAt_idx" ON "Conversation"("createdAt");

-- CreateIndex
CREATE INDEX "Conversation_createdBy_idx" ON "Conversation"("createdBy");

-- CreateIndex
CREATE INDEX "Conversation_companyCode_idx" ON "Conversation"("companyCode");

-- CreateIndex
CREATE INDEX "ConversationParticipant_conversationId_idx" ON "ConversationParticipant"("conversationId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_lastReadAt_idx" ON "ConversationParticipant"("lastReadAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key" ON "ConversationParticipant"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Message_type_idx" ON "Message"("type");

-- CreateIndex
CREATE INDEX "Message_status_idx" ON "Message"("status");

-- CreateIndex
CREATE INDEX "Message_replyToId_idx" ON "Message"("replyToId");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

-- CreateIndex
CREATE INDEX "BookingHistory_bookingId_changedAt_idx" ON "BookingHistory"("bookingId", "changedAt");

-- CreateIndex
CREATE INDEX "BookingHistory_companyCode_idx" ON "BookingHistory"("companyCode");

-- CreateIndex
CREATE UNIQUE INDEX "UserPresence_userId_key" ON "UserPresence"("userId");

-- CreateIndex
CREATE INDEX "UserPresence_status_idx" ON "UserPresence"("status");

-- CreateIndex
CREATE INDEX "MessageRead_userId_idx" ON "MessageRead"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageRead_messageId_userId_key" ON "MessageRead"("messageId", "userId");

-- CreateIndex
CREATE INDEX "MessageReaction_messageId_idx" ON "MessageReaction"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageReaction_messageId_userId_emoji_key" ON "MessageReaction"("messageId", "userId", "emoji");

-- CreateIndex
CREATE INDEX "Flight_bookingId_idx" ON "Flight"("bookingId");

-- CreateIndex
CREATE INDEX "Flight_flightNumber_idx" ON "Flight"("flightNumber");

-- CreateIndex
CREATE INDEX "Flight_departureTime_idx" ON "Flight"("departureTime");

-- CreateIndex
CREATE INDEX "Flight_companyCode_idx" ON "Flight"("companyCode");

-- CreateIndex
CREATE INDEX "Vehicle_bookingId_idx" ON "Vehicle"("bookingId");

-- CreateIndex
CREATE INDEX "Vehicle_pickupTime_idx" ON "Vehicle"("pickupTime");

-- CreateIndex
CREATE INDEX "Vehicle_status_idx" ON "Vehicle"("status");

-- CreateIndex
CREATE INDEX "Vehicle_companyCode_idx" ON "Vehicle"("companyCode");

-- CreateIndex
CREATE INDEX "Hotel_bookingId_idx" ON "Hotel"("bookingId");

-- CreateIndex
CREATE INDEX "Hotel_checkInDate_checkOutDate_idx" ON "Hotel"("checkInDate", "checkOutDate");

-- CreateIndex
CREATE INDEX "Hotel_status_idx" ON "Hotel"("status");

-- CreateIndex
CREATE INDEX "Hotel_companyCode_idx" ON "Hotel"("companyCode");

-- CreateIndex
CREATE INDEX "Settlement_bookingId_idx" ON "Settlement"("bookingId");

-- CreateIndex
CREATE INDEX "Settlement_type_currency_idx" ON "Settlement"("type", "currency");

-- CreateIndex
CREATE INDEX "SystemMessage_type_idx" ON "SystemMessage"("type");

-- CreateIndex
CREATE INDEX "SystemMessage_isActive_idx" ON "SystemMessage"("isActive");

-- CreateIndex
CREATE INDEX "SystemMessage_expiresAt_idx" ON "SystemMessage"("expiresAt");

-- CreateIndex
CREATE INDEX "SystemMessage_companyCode_idx" ON "SystemMessage"("companyCode");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationSettings_conversationId_key" ON "ConversationSettings"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_transactionNumber_key" ON "Transaction"("transactionNumber");

-- CreateIndex
CREATE INDEX "Transaction_accountId_idx" ON "Transaction"("accountId");

-- CreateIndex
CREATE INDEX "Transaction_bookingId_idx" ON "Transaction"("bookingId");

-- CreateIndex
CREATE INDEX "Transaction_userId_transactionDate_idx" ON "Transaction"("userId", "transactionDate");

-- CreateIndex
CREATE UNIQUE INDEX "Document_documentNumber_key" ON "Document"("documentNumber");

-- CreateIndex
CREATE INDEX "Document_bookingId_idx" ON "Document"("bookingId");

-- CreateIndex
CREATE INDEX "Document_uploadedBy_idx" ON "Document"("uploadedBy");

-- CreateIndex
CREATE INDEX "Document_type_idx" ON "Document"("type");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_key_key" ON "IdempotencyKey"("key");

-- CreateIndex
CREATE INDEX "IdempotencyKey_endpoint_ttl_idx" ON "IdempotencyKey"("endpoint", "ttl");

-- CreateIndex
CREATE INDEX "IdempotencyKey_createdAt_idx" ON "IdempotencyKey"("createdAt");

-- CreateIndex
CREATE INDEX "Outbox_topic_deliveredAt_idx" ON "Outbox"("topic", "deliveredAt");

-- CreateIndex
CREATE INDEX "Outbox_createdAt_idx" ON "Outbox"("createdAt");

-- CreateIndex
CREATE INDEX "Outbox_attempts_idx" ON "Outbox"("attempts");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationProvider_name_key" ON "IntegrationProvider"("name");

-- CreateIndex
CREATE INDEX "IntegrationProvider_status_circuitOpenUntil_idx" ON "IntegrationProvider"("status", "circuitOpenUntil");

-- CreateIndex
CREATE INDEX "ExternalCallLog_providerName_occurredAt_idx" ON "ExternalCallLog"("providerName", "occurredAt");

-- CreateIndex
CREATE INDEX "ExternalCallLog_statusCode_occurredAt_idx" ON "ExternalCallLog"("statusCode", "occurredAt");

-- CreateIndex
CREATE INDEX "ExternalCallLog_errorType_occurredAt_idx" ON "ExternalCallLog"("errorType", "occurredAt");

-- CreateIndex
CREATE INDEX "FxRateCache_base_fetchedAt_idx" ON "FxRateCache"("base", "fetchedAt");

-- CreateIndex
CREATE INDEX "FxRateCache_fetchedAt_ttlSec_idx" ON "FxRateCache"("fetchedAt", "ttlSec");

-- CreateIndex
CREATE UNIQUE INDEX "FxRateCache_base_quote_key" ON "FxRateCache"("base", "quote");

-- CreateIndex
CREATE INDEX "ExchangeRate_validFrom_validUntil_idx" ON "ExchangeRate"("validFrom", "validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_fromCurrency_toCurrency_validFrom_key" ON "ExchangeRate"("fromCurrency", "toCurrency", "validFrom");

-- CreateIndex
CREATE INDEX "FlightStatusCache_flightNo_fetchedAt_idx" ON "FlightStatusCache"("flightNo", "fetchedAt");

-- CreateIndex
CREATE INDEX "FlightStatusCache_fetchedAt_ttlSec_idx" ON "FlightStatusCache"("fetchedAt", "ttlSec");

-- CreateIndex
CREATE INDEX "FlightStatusCache_status_idx" ON "FlightStatusCache"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FlightStatusCache_flightNo_date_key" ON "FlightStatusCache"("flightNo", "date");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationInbox_messageKey_key" ON "IntegrationInbox"("messageKey");

-- CreateIndex
CREATE INDEX "IntegrationInbox_provider_eventType_idx" ON "IntegrationInbox"("provider", "eventType");

-- CreateIndex
CREATE INDEX "IntegrationInbox_processedAt_idx" ON "IntegrationInbox"("processedAt");

-- CreateIndex
CREATE INDEX "IntegrationInbox_receivedAt_idx" ON "IntegrationInbox"("receivedAt");

-- CreateIndex
CREATE INDEX "MessageAttachment_messageId_idx" ON "MessageAttachment"("messageId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_companyCode_idx" ON "Notification"("companyCode");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_expiresAt_idx" ON "Notification"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "NotificationPreference_companyCode_idx" ON "NotificationPreference"("companyCode");
