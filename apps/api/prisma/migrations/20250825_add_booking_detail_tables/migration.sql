-- Add new columns to Booking table
ALTER TABLE "Booking" 
ADD COLUMN IF NOT EXISTS "teamType" TEXT,
ADD COLUMN IF NOT EXISTS "origin" TEXT,
ADD COLUMN IF NOT EXISTS "manager" TEXT,
ADD COLUMN IF NOT EXISTS "representative" TEXT,
ADD COLUMN IF NOT EXISTS "contact" TEXT,
ADD COLUMN IF NOT EXISTS "email" TEXT,
ADD COLUMN IF NOT EXISTS "memo" TEXT;

-- Update existing rows with default values for required fields
UPDATE "Booking" 
SET "teamType" = 'GROUP' 
WHERE "teamType" IS NULL;

UPDATE "Booking" 
SET "origin" = 'Seoul' 
WHERE "origin" IS NULL;

UPDATE "Booking" 
SET "manager" = 'System' 
WHERE "manager" IS NULL;

-- Now make required fields NOT NULL
ALTER TABLE "Booking" 
ALTER COLUMN "teamType" SET NOT NULL,
ALTER COLUMN "origin" SET NOT NULL,
ALTER COLUMN "manager" SET NOT NULL;

-- Add index for manager column
CREATE INDEX IF NOT EXISTS "Booking_manager_idx" ON "Booking"("manager");

-- Create SettlementType enum
DO $$ BEGIN
    CREATE TYPE "SettlementType" AS ENUM ('income', 'expense');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Flight table
CREATE TABLE IF NOT EXISTS "Flight" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "airline" TEXT NOT NULL,
    "flightNo" TEXT,
    "departDate" TEXT,
    "departureTime" TEXT NOT NULL,
    "arriveDate" TEXT,
    "arrivalTime" TEXT NOT NULL,
    "from" TEXT,
    "to" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Flight_pkey" PRIMARY KEY ("id")
);

-- Create Vehicle table
CREATE TABLE IF NOT EXISTS "Vehicle" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "vendor" TEXT,
    "type" TEXT NOT NULL,
    "count" INTEGER,
    "passengers" INTEGER NOT NULL,
    "duration" TEXT NOT NULL,
    "route" TEXT,
    "pickupDate" TEXT,
    "pickupTime" TEXT,
    "returnDate" TEXT,
    "returnTime" TEXT,
    "driver" TEXT,
    "phone" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- Create Hotel table
CREATE TABLE IF NOT EXISTS "Hotel" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roomType" TEXT NOT NULL,
    "checkIn" TEXT NOT NULL,
    "checkOut" TEXT NOT NULL,
    "nights" INTEGER,
    "breakfast" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hotel_pkey" PRIMARY KEY ("id")
);

-- Create Settlement table
CREATE TABLE IF NOT EXISTS "Settlement" (
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

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- Create indexes for Flight table
CREATE INDEX IF NOT EXISTS "Flight_bookingId_idx" ON "Flight"("bookingId");
CREATE INDEX IF NOT EXISTS "Flight_departDate_departureTime_idx" ON "Flight"("departDate", "departureTime");

-- Create indexes for Vehicle table
CREATE INDEX IF NOT EXISTS "Vehicle_bookingId_idx" ON "Vehicle"("bookingId");
CREATE INDEX IF NOT EXISTS "Vehicle_pickupDate_pickupTime_idx" ON "Vehicle"("pickupDate", "pickupTime");

-- Create indexes for Hotel table
CREATE INDEX IF NOT EXISTS "Hotel_bookingId_idx" ON "Hotel"("bookingId");
CREATE INDEX IF NOT EXISTS "Hotel_checkIn_checkOut_idx" ON "Hotel"("checkIn", "checkOut");

-- Create indexes for Settlement table
CREATE INDEX IF NOT EXISTS "Settlement_bookingId_idx" ON "Settlement"("bookingId");
CREATE INDEX IF NOT EXISTS "Settlement_type_currency_idx" ON "Settlement"("type", "currency");

-- Add foreign key constraints
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_bookingId_fkey" 
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_bookingId_fkey" 
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Hotel" ADD CONSTRAINT "Hotel_bookingId_fkey" 
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_bookingId_fkey" 
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;