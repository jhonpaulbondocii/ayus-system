-- CreateTable
CREATE TABLE "guidance_info_sheets" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentNo" TEXT NOT NULL,
    "courseProgram" TEXT,
    "yearSection" TEXT,
    "name" TEXT NOT NULL,
    "nickname" TEXT,
    "age" INTEGER,
    "dateOfBirth" TEXT,
    "placeOfBirth" TEXT,
    "birthOrder" TEXT,
    "mobileNo" TEXT,
    "email" TEXT,
    "sex" TEXT,
    "religion" TEXT,
    "completeAddress" TEXT,
    "fatherName" TEXT,
    "fatherDOB" TEXT,
    "fatherAddress" TEXT,
    "fatherContact" TEXT,
    "fatherEduc" TEXT,
    "fatherOccupation" TEXT,
    "fatherIncome" TEXT,
    "fatherLanguage" TEXT,
    "fatherReligion" TEXT,
    "fatherOFW" TEXT,
    "fatherYearsAbroad" TEXT,
    "motherName" TEXT,
    "motherDOB" TEXT,
    "motherAddress" TEXT,
    "motherContact" TEXT,
    "motherEduc" TEXT,
    "motherOccupation" TEXT,
    "motherIncome" TEXT,
    "motherLanguage" TEXT,
    "motherReligion" TEXT,
    "motherOFW" TEXT,
    "motherYearsAbroad" TEXT,
    "maritalStatus" TEXT,
    "siblings" JSONB DEFAULT '[]',
    "guardianName" TEXT,
    "guardianContact" TEXT,
    "guardianAddress" TEXT,
    "emergencyPerson" TEXT,
    "emergencyContact" TEXT,
    "educBackground" JSONB DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "allowResubmit" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guidance_info_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guidance_info_sheets_courseId_idx" ON "guidance_info_sheets"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "guidance_info_sheets_courseId_studentNo_key" ON "guidance_info_sheets"("courseId", "studentNo");

-- AddForeignKey
ALTER TABLE "guidance_info_sheets" ADD CONSTRAINT "guidance_info_sheets_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
