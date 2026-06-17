-- CreateEnum
CREATE TYPE "PatientAction" AS ENUM ('GIVEN_MEDICINE', 'SENT_HOME', 'FOR_OBSERVATION', 'REFERRED_HOSPITAL', 'REFERRED_GUIDANCE');

-- CreateTable
CREATE TABLE "patient_records" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "complaint" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION,
    "bloodPressure" TEXT,
    "pulseRate" INTEGER,
    "weight" DOUBLE PRECISION,
    "diagnosis" TEXT,
    "medicine" TEXT,
    "action" "PatientAction" NOT NULL,
    "notes" TEXT,
    "visitDate" TIMESTAMP(3) NOT NULL,
    "recordedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patient_records_courseId_idx" ON "patient_records"("courseId");

-- CreateIndex
CREATE INDEX "patient_records_studentId_idx" ON "patient_records"("studentId");

-- CreateIndex
CREATE INDEX "patient_records_courseId_visitDate_idx" ON "patient_records"("courseId", "visitDate");

-- AddForeignKey
ALTER TABLE "patient_records" ADD CONSTRAINT "patient_records_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_records" ADD CONSTRAINT "patient_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_records" ADD CONSTRAINT "patient_records_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
