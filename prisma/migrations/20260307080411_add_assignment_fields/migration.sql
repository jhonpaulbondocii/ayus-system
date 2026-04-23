-- AlterTable
ALTER TABLE "assignments" ADD COLUMN     "assignmentGroup" TEXT NOT NULL DEFAULT 'Assignments',
ADD COLUMN     "availableFrom" TIMESTAMP(3),
ADD COLUMN     "availableUntil" TIMESTAMP(3),
ADD COLUMN     "displayGradeAs" TEXT NOT NULL DEFAULT 'Points',
ADD COLUMN     "points" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "status" "CourseStatus" NOT NULL DEFAULT 'UNPUBLISHED',
ADD COLUMN     "submissionType" TEXT NOT NULL DEFAULT 'Online',
ALTER COLUMN "dueDate" DROP NOT NULL;
