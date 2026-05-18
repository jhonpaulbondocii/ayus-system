-- AlterTable
ALTER TABLE "submissions" ADD COLUMN     "gradedAt" TIMESTAMP(3),
ADD COLUMN     "gradedById" TEXT;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_gradedById_fkey" FOREIGN KEY ("gradedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
