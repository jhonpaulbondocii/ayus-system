-- CreateTable
CREATE TABLE "medical_exam_records" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "remarks" TEXT,
    "visitDate" TIMESTAMP(3) NOT NULL,
    "recordedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "signatureUrl" TEXT,
    "signatureMethod" TEXT,
    "signedAt" TIMESTAMP(3),
    "signToken" TEXT,
    "signTokenExpiresAt" TIMESTAMP(3),
    "signEmailSentAt" TIMESTAMP(3),

    CONSTRAINT "medical_exam_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "medical_exam_records_signToken_key" ON "medical_exam_records"("signToken");

-- CreateIndex
CREATE INDEX "medical_exam_records_courseId_idx" ON "medical_exam_records"("courseId");

-- CreateIndex
CREATE INDEX "medical_exam_records_studentId_idx" ON "medical_exam_records"("studentId");

-- CreateIndex
CREATE INDEX "medical_exam_records_courseId_visitDate_idx" ON "medical_exam_records"("courseId", "visitDate");

-- CreateIndex
CREATE INDEX "medical_exam_records_signToken_idx" ON "medical_exam_records"("signToken");

-- AddForeignKey
ALTER TABLE "medical_exam_records" ADD CONSTRAINT "medical_exam_records_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_exam_records" ADD CONSTRAINT "medical_exam_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_exam_records" ADD CONSTRAINT "medical_exam_records_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
