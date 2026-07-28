-- CreateTable
CREATE TABLE "guidance_log_entries" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "sex" TEXT,
    "purpose" TEXT NOT NULL DEFAULT 'Counseling',
    "signatureUrl" TEXT,
    "visitDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guidance_log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guidance_log_entries_courseId_idx" ON "guidance_log_entries"("courseId");

-- CreateIndex
CREATE INDEX "guidance_log_entries_courseId_visitDate_idx" ON "guidance_log_entries"("courseId", "visitDate");

-- AddForeignKey
ALTER TABLE "guidance_log_entries" ADD CONSTRAINT "guidance_log_entries_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guidance_log_entries" ADD CONSTRAINT "guidance_log_entries_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
