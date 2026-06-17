-- CreateTable
CREATE TABLE "medicine_inventory" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "stockQty" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 10,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicine_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicine_usages" (
    "id" TEXT NOT NULL,
    "patientRecordId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "medicineName" TEXT NOT NULL,
    "quantityUsed" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medicine_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "medicine_inventory_courseId_idx" ON "medicine_inventory"("courseId");

-- CreateIndex
CREATE INDEX "medicine_usages_patientRecordId_idx" ON "medicine_usages"("patientRecordId");

-- CreateIndex
CREATE INDEX "medicine_usages_medicineId_idx" ON "medicine_usages"("medicineId");

-- AddForeignKey
ALTER TABLE "medicine_inventory" ADD CONSTRAINT "medicine_inventory_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_usages" ADD CONSTRAINT "medicine_usages_patientRecordId_fkey" FOREIGN KEY ("patientRecordId") REFERENCES "patient_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_usages" ADD CONSTRAINT "medicine_usages_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicine_inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
