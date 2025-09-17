-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'USER');

-- CreateEnum
CREATE TYPE "PresenceStatus" AS ENUM ('online', 'away', 'busy', 'offline');

-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('incentive', 'golf', 'honeymoon', 'airtel', 'etc');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('pending', 'confirmed', 'done', 'cancelled');

-- CreateEnum
CREATE TYPE "CalendarEventStatus" AS ENUM ('pending', 'confirmed', 'cancelled');

-- CreateEnum
CREATE TYPE "FinanceType" AS ENUM ('income', 'expense');

-- CreateEnum
CREATE TYPE "FinanceStatus" AS ENUM ('pending', 'approved', 'rejected', 'deleted');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "ApprovalTargetType" AS ENUM ('finance', 'custom');

-- CreateEnum
CREATE TYPE "ApprovalAction" AS ENUM ('approve', 'reject');

-- CreateEnum
CREATE TYPE "AccountRole" AS ENUM ('admin', 'approver', 'staff', 'viewer');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('active', 'suspended', 'deleted');

-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('direct', 'group', 'channel');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('text', 'image', 'file', 'system');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('sent', 'delivered', 'read', 'deleted');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('owner', 'admin', 'member', 'viewer');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "department" TEXT,
    "companyCode" TEXT NOT NULL DEFAULT 'ENTRIP_MAIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "type" "BookingType" NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalPax" INTEGER NOT NULL DEFAULT 1,
    "coordinator" TEXT NOT NULL,
    "revenue" DECIMAL(65,30),
    "notes" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'pending',
    "companyCode" TEXT NOT NULL DEFAULT 'ENTRIP_MAIN',
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    "status" "CalendarEventStatus" NOT NULL DEFAULT 'confirmed',
    "companyCode" TEXT NOT NULL DEFAULT 'ENTRIP_MAIN',
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceRecord" (
    "id" TEXT NOT NULL,
    "type" "FinanceType" NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "exchangeRate" DECIMAL(65,30) NOT NULL DEFAULT 1.0,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "remarks" TEXT,
    "companyCode" TEXT NOT NULL DEFAULT 'ENTRIP_MAIN',
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "status" "FinanceStatus" NOT NULL DEFAULT 'pending',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FinanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "targetType" "ApprovalTargetType" NOT NULL,
    "targetId" TEXT,
    "amount" DECIMAL(65,30),
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "requesterId" TEXT NOT NULL,
    "companyCode" TEXT NOT NULL DEFAULT 'ENTRIP_MAIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalStep" (
    "id" TEXT NOT NULL,
    "approvalId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "action" "ApprovalAction",
    "comment" TEXT,
    "actedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" "AccountRole" NOT NULL DEFAULT 'staff',
    "status" "AccountStatus" NOT NULL DEFAULT 'active',
    "companyCode" TEXT NOT NULL DEFAULT 'ENTRIP_MAIN',
    "createdBy" TEXT,
    "passwordHash" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "type" "ConversationType" NOT NULL DEFAULT 'direct',
    "description" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "allowInvites" BOOLEAN NOT NULL DEFAULT true,
    "companyCode" TEXT NOT NULL DEFAULT 'ENTRIP_MAIN',
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ParticipantRole" NOT NULL DEFAULT 'member',
    "nickname" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastReadAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "canInvite" BOOLEAN NOT NULL DEFAULT false,
    "canManage" BOOLEAN NOT NULL DEFAULT false,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "invitedBy" TEXT,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'text',
    "content" TEXT NOT NULL,
    "attachments" JSONB,
    "replyToId" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'sent',
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingHistory" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changedFields" JSONB NOT NULL,
    "previousValues" JSONB,
    "newValues" JSONB,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" TEXT NOT NULL,
    "companyCode" TEXT NOT NULL,

    CONSTRAINT "BookingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPresence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "PresenceStatus" NOT NULL DEFAULT 'offline',
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusMessage" TEXT,

    CONSTRAINT "UserPresence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageRead" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageReaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageReaction_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "CalendarEvent_start_end_idx" ON "CalendarEvent"("start", "end");

-- CreateIndex
CREATE INDEX "CalendarEvent_status_idx" ON "CalendarEvent"("status");

-- CreateIndex
CREATE INDEX "CalendarEvent_createdAt_idx" ON "CalendarEvent"("createdAt");

-- CreateIndex
CREATE INDEX "CalendarEvent_companyCode_start_idx" ON "CalendarEvent"("companyCode", "start");

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

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceRecord" ADD CONSTRAINT "FinanceRecord_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceRecord" ADD CONSTRAINT "FinanceRecord_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceRecord" ADD CONSTRAINT "FinanceRecord_rejectedBy_fkey" FOREIGN KEY ("rejectedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "Approval"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingHistory" ADD CONSTRAINT "BookingHistory_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingHistory" ADD CONSTRAINT "BookingHistory_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPresence" ADD CONSTRAINT "UserPresence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageRead" ADD CONSTRAINT "MessageRead_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageRead" ADD CONSTRAINT "MessageRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

