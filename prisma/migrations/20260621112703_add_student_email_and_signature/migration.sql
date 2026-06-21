/*
  Warnings:

  - A unique constraint covering the columns `[signToken]` on the table `patient_records` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "patient_records" ADD COLUMN     "signEmailSentAt" TIMESTAMP(3),
ADD COLUMN     "signToken" TEXT,
ADD COLUMN     "signTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "signatureMethod" TEXT,
ADD COLUMN     "signatureUrl" TEXT,
ADD COLUMN     "signedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "email" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "patient_records_signToken_key" ON "patient_records"("signToken");

-- CreateIndex
CREATE INDEX "patient_records_signToken_idx" ON "patient_records"("signToken");
