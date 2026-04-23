-- AlterTable
ALTER TABLE "announcements" ADD COLUMN     "authorId" TEXT;

-- AlterTable
ALTER TABLE "course_enrollments" ADD COLUMN     "section" TEXT;

-- AlterTable
ALTER TABLE "forms" ADD COLUMN     "authorId" TEXT,
ADD COLUMN     "authorName" TEXT NOT NULL DEFAULT 'Admin',
ADD COLUMN     "authorRole" TEXT NOT NULL DEFAULT 'Admin';

-- AlterTable
ALTER TABLE "quizzes" ADD COLUMN     "authorId" TEXT,
ADD COLUMN     "authorName" TEXT NOT NULL DEFAULT 'Admin',
ADD COLUMN     "authorRole" TEXT NOT NULL DEFAULT 'Admin';

-- CreateTable
CREATE TABLE "form_submissions" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "form_submissions_formId_userId_key" ON "form_submissions"("formId", "userId");

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forms" ADD CONSTRAINT "forms_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_formId_fkey" FOREIGN KEY ("formId") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
