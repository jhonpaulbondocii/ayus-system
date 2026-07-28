-- CreateTable
CREATE TABLE "exit_interviews" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "courseProgram" TEXT,
    "yearSection" TEXT,
    "email" TEXT,
    "mobileNo" TEXT,
    "sex" TEXT,
    "age" INTEGER,
    "dateOfBirth" TEXT,
    "address" TEXT,
    "lastDayOfAttendance" TEXT,
    "reasonForLeaving" TEXT,
    "transferSchool" TEXT,
    "transferCourse" TEXT,
    "otherReason" TEXT,
    "clearedRegistrar" BOOLEAN NOT NULL DEFAULT false,
    "clearedLibrary" BOOLEAN NOT NULL DEFAULT false,
    "clearedFinance" BOOLEAN NOT NULL DEFAULT false,
    "clearedDean" BOOLEAN NOT NULL DEFAULT false,
    "clearedGuidance" BOOLEAN NOT NULL DEFAULT false,
    "clearedDSA" BOOLEAN NOT NULL DEFAULT false,
    "counselorNotes" TEXT,
    "counselorSignatureUrl" TEXT,
    "counselorSignedAt" TIMESTAMP(3),
    "counselorId" TEXT,
    "signatureUrl" TEXT,
    "signedAt" TIMESTAMP(3),
    "photoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exit_interviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exit_interviews_courseId_idx" ON "exit_interviews"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "exit_interviews_courseId_studentNo_key" ON "exit_interviews"("courseId", "studentNo");

-- AddForeignKey
ALTER TABLE "exit_interviews" ADD CONSTRAINT "exit_interviews_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exit_interviews" ADD CONSTRAINT "exit_interviews_counselorId_fkey" FOREIGN KEY ("counselorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
