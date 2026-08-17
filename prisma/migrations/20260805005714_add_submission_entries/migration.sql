-- AlterTable
ALTER TABLE "assignments" ADD COLUMN     "submissionEntries" JSONB NOT NULL DEFAULT '[]';
