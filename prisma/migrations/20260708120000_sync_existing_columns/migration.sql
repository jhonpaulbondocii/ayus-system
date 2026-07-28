-- Baseline: itong mga columns na ito, nasa database mo na (dating na-apply na
-- pero hindi na-record nang tama sa migration history). "IF NOT EXISTS" para
-- ligtas kahit paulit-ulit patakbuhin.

ALTER TABLE "medical_exam_records"
  ADD COLUMN IF NOT EXISTS "height" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "weight" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "heartRate" TEXT,
  ADD COLUMN IF NOT EXISTS "bloodPressure" TEXT,
  ADD COLUMN IF NOT EXISTS "temperature" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "respiratoryRate" TEXT,
  ADD COLUMN IF NOT EXISTS "placeOfBirth" TEXT,
  ADD COLUMN IF NOT EXISTS "physicalSigns" JSONB,
  ADD COLUMN IF NOT EXISTS "isPregnant" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "lastMenstrualPeriod" TEXT,
  ADD COLUMN IF NOT EXISTS "civilStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "fitnessStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "fitnessFor" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "clearanceRemarks" TEXT,
  ADD COLUMN IF NOT EXISTS "clearanceIssuedAt" TIMESTAMP(3);