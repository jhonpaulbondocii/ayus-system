-- AlterTable
ALTER TABLE "patient_records" ADD COLUMN     "medicalConditionId" TEXT;

-- CreateTable
CREATE TABLE "body_systems" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "body_systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_conditions" (
    "id" TEXT NOT NULL,
    "bodySystemId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "body_systems_courseId_idx" ON "body_systems"("courseId");

-- CreateIndex
CREATE INDEX "medical_conditions_courseId_idx" ON "medical_conditions"("courseId");

-- CreateIndex
CREATE INDEX "medical_conditions_bodySystemId_idx" ON "medical_conditions"("bodySystemId");

-- AddForeignKey
ALTER TABLE "patient_records" ADD CONSTRAINT "patient_records_medicalConditionId_fkey" FOREIGN KEY ("medicalConditionId") REFERENCES "medical_conditions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "body_systems" ADD CONSTRAINT "body_systems_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_conditions" ADD CONSTRAINT "medical_conditions_bodySystemId_fkey" FOREIGN KEY ("bodySystemId") REFERENCES "body_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_conditions" ADD CONSTRAINT "medical_conditions_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
