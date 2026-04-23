-- AlterTable
ALTER TABLE "assignments" ADD COLUMN     "assignees" TEXT[] DEFAULT ARRAY[]::TEXT[];
