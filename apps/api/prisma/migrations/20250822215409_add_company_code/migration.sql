/*
  Warnings:

  - Added the required column `companyCode` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "companyCode" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Booking_companyCode_idx" ON "Booking"("companyCode");
