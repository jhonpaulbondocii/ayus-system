/*
  Warnings:

  - A unique constraint covering the columns `[signToken]` on the table `guidance_log_entries` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "guidance_log_entries" ADD COLUMN     "email" TEXT,
ADD COLUMN     "signEmailSentAt" TIMESTAMP(3),
ADD COLUMN     "signToken" TEXT,
ADD COLUMN     "signTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "signatureMethod" TEXT,
ADD COLUMN     "signedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "guidance_log_entries_signToken_key" ON "guidance_log_entries"("signToken");

-- CreateIndex
CREATE INDEX "guidance_log_entries_signToken_idx" ON "guidance_log_entries"("signToken");
