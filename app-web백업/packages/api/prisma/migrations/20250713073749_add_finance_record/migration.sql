-- CreateTable
CREATE TABLE "FinanceRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "exchangeRate" DECIMAL NOT NULL DEFAULT 1.0,
    "occurredAt" DATETIME NOT NULL,
    "description" TEXT,
    "remarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "rejectedBy" TEXT,
    "rejectedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "createdBy" TEXT,
    "updatedBy" TEXT
);

-- CreateIndex
CREATE INDEX "FinanceRecord_type_status_idx" ON "FinanceRecord"("type", "status");

-- CreateIndex
CREATE INDEX "FinanceRecord_occurredAt_idx" ON "FinanceRecord"("occurredAt");

-- CreateIndex
CREATE INDEX "FinanceRecord_status_idx" ON "FinanceRecord"("status");

-- CreateIndex
CREATE INDEX "FinanceRecord_createdAt_idx" ON "FinanceRecord"("createdAt");
