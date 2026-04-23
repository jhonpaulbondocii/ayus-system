-- AlterTable
ALTER TABLE "assignments" ADD COLUMN     "allowedAttempts" INTEGER,
ADD COLUMN     "anonymousGrading" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "doNotCount" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isGroupAssignment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifyUsers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onlineEntryOptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "peerReviewAnonymous" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "peerReviewAssign" TEXT NOT NULL DEFAULT 'manually',
ADD COLUMN     "requirePeerReviews" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "submissionAttempts" TEXT NOT NULL DEFAULT 'Unlimited';
