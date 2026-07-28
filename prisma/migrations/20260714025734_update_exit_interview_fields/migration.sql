/*
  Warnings:

  - You are about to drop the column `address` on the `exit_interviews` table. All the data in the column will be lost.
  - You are about to drop the column `clearedDSA` on the `exit_interviews` table. All the data in the column will be lost.
  - You are about to drop the column `clearedDean` on the `exit_interviews` table. All the data in the column will be lost.
  - You are about to drop the column `clearedFinance` on the `exit_interviews` table. All the data in the column will be lost.
  - You are about to drop the column `clearedGuidance` on the `exit_interviews` table. All the data in the column will be lost.
  - You are about to drop the column `clearedLibrary` on the `exit_interviews` table. All the data in the column will be lost.
  - You are about to drop the column `clearedRegistrar` on the `exit_interviews` table. All the data in the column will be lost.
  - You are about to drop the column `courseProgram` on the `exit_interviews` table. All the data in the column will be lost.
  - You are about to drop the column `lastDayOfAttendance` on the `exit_interviews` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `exit_interviews` table. All the data in the column will be lost.
  - You are about to drop the column `otherReason` on the `exit_interviews` table. All the data in the column will be lost.
  - You are about to drop the column `reasonForLeaving` on the `exit_interviews` table. All the data in the column will be lost.
  - You are about to drop the column `signatureUrl` on the `exit_interviews` table. All the data in the column will be lost.
  - You are about to drop the column `signedAt` on the `exit_interviews` table. All the data in the column will be lost.
  - You are about to drop the column `transferCourse` on the `exit_interviews` table. All the data in the column will be lost.
  - You are about to drop the column `transferSchool` on the `exit_interviews` table. All the data in the column will be lost.
  - You are about to drop the column `yearSection` on the `exit_interviews` table. All the data in the column will be lost.
  - Added the required column `firstName` to the `exit_interviews` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `exit_interviews` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "exit_interviews_courseId_studentNo_key";

-- DropIndex
DROP INDEX "guidance_info_sheets_courseId_studentNo_key";

-- AlterTable
ALTER TABLE "exit_interviews" DROP COLUMN "address",
DROP COLUMN "clearedDSA",
DROP COLUMN "clearedDean",
DROP COLUMN "clearedFinance",
DROP COLUMN "clearedGuidance",
DROP COLUMN "clearedLibrary",
DROP COLUMN "clearedRegistrar",
DROP COLUMN "courseProgram",
DROP COLUMN "lastDayOfAttendance",
DROP COLUMN "name",
DROP COLUMN "otherReason",
DROP COLUMN "reasonForLeaving",
DROP COLUMN "signatureUrl",
DROP COLUMN "signedAt",
DROP COLUMN "transferCourse",
DROP COLUMN "transferSchool",
DROP COLUMN "yearSection",
ADD COLUMN     "campus" TEXT,
ADD COLUMN     "counselorName" TEXT,
ADD COLUMN     "feelChallenged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "feelExcited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "feelHappy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "feelNervous" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "feelOthers" TEXT,
ADD COLUMN     "feelSad" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "graduationMonth" TEXT,
ADD COLUMN     "homeAddress" TEXT,
ADD COLUMN     "honorianValues" TEXT,
ADD COLUMN     "influenceClassmate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "influenceFamily" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "influenceFriends" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "influenceOthers" TEXT,
ADD COLUMN     "influenceProfessor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "likedLeast" TEXT,
ADD COLUMN     "likedMost" TEXT,
ADD COLUMN     "middleName" TEXT,
ADD COLUMN     "planBoardExam" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "planFindJob" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "planGradStudies" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "planOthers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pressingProblemDetails" JSONB DEFAULT '{}',
ADD COLUMN     "programSection" TEXT,
ADD COLUMN     "recommend" TEXT,
ADD COLUMN     "studentSignatureUrl" TEXT,
ADD COLUMN     "studentSignedAt" TIMESTAMP(3),
ADD COLUMN     "suggestions" TEXT,
ALTER COLUMN "studentNo" DROP NOT NULL;
