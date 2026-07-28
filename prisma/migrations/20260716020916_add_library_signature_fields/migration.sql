-- AlterTable
ALTER TABLE "library_card_requests" ADD COLUMN     "corIdUrl" TEXT,
ADD COLUMN     "directorName" TEXT,
ADD COLUMN     "directorSignatureUrl" TEXT,
ADD COLUMN     "directorSignedAt" TIMESTAMP(3),
ADD COLUMN     "recipientSignatureUrl" TEXT,
ADD COLUMN     "recipientSignedAt" TIMESTAMP(3);
