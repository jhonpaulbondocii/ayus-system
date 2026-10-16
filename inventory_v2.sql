-- AlterTable
ALTER TABLE "medicine_inventory" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "brandName" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "defaultDispenseQty" INTEGER,
ADD COLUMN     "dosageForm" TEXT,
ADD COLUMN     "genericName" TEXT,
ADD COLUMN     "isPrescriptionOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "packCost" DOUBLE PRECISION,
ADD COLUMN     "packaging" TEXT NOT NULL DEFAULT 'piece',
ADD COLUMN     "parLevel" INTEGER,
ADD COLUMN     "piecesPerPack" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "strength" TEXT,
ADD COLUMN     "supplier" TEXT;

-- CreateTable
CREATE TABLE "medicine_batches" (
    "id" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "batchNo" TEXT,
    "expiryDate" TIMESTAMP(3),
    "qtyReceived" INTEGER NOT NULL,
    "qtyRemaining" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'PURCHASE',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medicine_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicine_stock_movements" (
    "id" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "batchId" TEXT,
    "type" TEXT NOT NULL,
    "qtyChange" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT,
    "patientRecordId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medicine_stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "medicine_batches_medicineId_expiryDate_idx" ON "medicine_batches"("medicineId", "expiryDate");

-- CreateIndex
CREATE INDEX "medicine_batches_expiryDate_idx" ON "medicine_batches"("expiryDate");

-- CreateIndex
CREATE INDEX "medicine_stock_movements_medicineId_createdAt_idx" ON "medicine_stock_movements"("medicineId", "createdAt");

-- CreateIndex
CREATE INDEX "medicine_stock_movements_patientRecordId_idx" ON "medicine_stock_movements"("patientRecordId");

-- CreateIndex
CREATE INDEX "medicine_inventory_courseId_archivedAt_idx" ON "medicine_inventory"("courseId", "archivedAt");

-- AddForeignKey
ALTER TABLE "medicine_batches" ADD CONSTRAINT "medicine_batches_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicine_inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_stock_movements" ADD CONSTRAINT "medicine_stock_movements_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicine_inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_stock_movements" ADD CONSTRAINT "medicine_stock_movements_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "medicine_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_stock_movements" ADD CONSTRAINT "medicine_stock_movements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
