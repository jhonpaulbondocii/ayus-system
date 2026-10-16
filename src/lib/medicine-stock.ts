// src/lib/medicine-stock.ts
// Lahat ng galaw ng stock ay dumadaan dito para laging tugma ang
// medicine_inventory.stockQty, ang batches, at ang ledger.

import { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export class StockError extends Error {
  status: number;
  constructor(message: string, status = 409) {
    super(message);
    this.status = status;
  }
}

// ── Lock ang row ng gamot para walang race condition ──────────────────────────
async function lockMedicine(tx: Tx, medicineId: string, courseId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM medicine_inventory
    WHERE id = ${medicineId} AND "courseId" = ${courseId}
    FOR UPDATE
  `;
  if (rows.length === 0) throw new StockError("Medicine not found", 404);
}

async function currentBalance(tx: Tx, medicineId: string): Promise<number> {
  const m = await tx.medicineInventory.findUniqueOrThrow({
    where: { id: medicineId },
    select: { stockQty: true },
  });
  return m.stockQty;
}

// ── RESTOCK: magdagdag ng batch ───────────────────────────────────────────────
export async function restock(
  tx: Tx,
  p: {
    medicineId: string;
    courseId: string;
    qty: number; // sa pinakamaliit na unit
    batchNo?: string | null;
    expiryDate?: Date | null;
    source?: string;
    reason?: string | null;
    userId: string;
  }
) {
  if (!Number.isInteger(p.qty) || p.qty <= 0) throw new StockError("Quantity must be a positive whole number", 400);
  await lockMedicine(tx, p.medicineId, p.courseId);

  const batch = await tx.medicineBatch.create({
    data: {
      medicineId: p.medicineId,
      batchNo: p.batchNo ?? null,
      expiryDate: p.expiryDate ?? null,
      qtyReceived: p.qty,
      qtyRemaining: p.qty,
      source: p.source ?? "PURCHASE",
    },
  });

  const updated = await tx.medicineInventory.update({
    where: { id: p.medicineId },
    data: { stockQty: { increment: p.qty } },
    select: { stockQty: true },
  });

  await tx.medicineStockMovement.create({
    data: {
      medicineId: p.medicineId,
      batchId: batch.id,
      type: "RESTOCK",
      qtyChange: p.qty,
      balanceAfter: updated.stockQty,
      reason: p.reason ?? "Restock",
      createdById: p.userId,
    },
  });

  return { batch, balance: updated.stockQty };
}

// ── DEDUCT (FEFO): kunin muna sa pinakamalapit mag-expire ─────────────────────
// allowExpired = false para sa USAGE. Para sa write-off, true.
async function deductFefo(
  tx: Tx,
  p: {
    medicineId: string;
    qty: number;
    type: string;
    reason?: string | null;
    patientRecordId?: string | null;
    userId: string;
    allowExpired: boolean;
    medicineName: string;
  }
) {
  const now = new Date();
  const batches = await tx.medicineBatch.findMany({
    where: {
      medicineId: p.medicineId,
      qtyRemaining: { gt: 0 },
      ...(p.allowExpired ? {} : { OR: [{ expiryDate: null }, { expiryDate: { gt: now } }] }),
    },
    // null expiry ang huli (nulls last), pinakamalapit na expiry ang una
    orderBy: [{ expiryDate: { sort: "asc", nulls: "last" } }, { receivedAt: "asc" }],
  });

  const available = batches.reduce((s, b) => s + b.qtyRemaining, 0);
  if (available < p.qty) {
    throw new StockError(
      `Not enough stock for "${p.medicineName}". Available: ${available}, requested: ${p.qty}` +
        (p.allowExpired ? "" : " (expired batches are excluded)")
    );
  }

  let remaining = p.qty;
  let balance = await currentBalance(tx, p.medicineId);

  for (const b of batches) {
    if (remaining <= 0) break;
    const take = Math.min(b.qtyRemaining, remaining);

    await tx.medicineBatch.update({
      where: { id: b.id },
      data: { qtyRemaining: { decrement: take } },
    });
    balance -= take;

    await tx.medicineStockMovement.create({
      data: {
        medicineId: p.medicineId,
        batchId: b.id,
        type: p.type,
        qtyChange: -take,
        balanceAfter: balance,
        reason: p.reason ?? null,
        patientRecordId: p.patientRecordId ?? null,
        createdById: p.userId,
      },
    });
    remaining -= take;
  }

  await tx.medicineInventory.update({
    where: { id: p.medicineId },
    data: { stockQty: { decrement: p.qty } },
  });
}

// ── USAGE sa patient visit ────────────────────────────────────────────────────
export async function dispenseForVisit(
  tx: Tx,
  p: {
    medicineId: string;
    courseId: string;
    qty: number;
    patientRecordId: string;
    userId: string;
  }
) {
  await lockMedicine(tx, p.medicineId, p.courseId);
  const med = await tx.medicineInventory.findUniqueOrThrow({
    where: { id: p.medicineId },
    select: { name: true, archivedAt: true },
  });
  if (med.archivedAt) throw new StockError(`"${med.name}" is archived and cannot be dispensed`, 400);

  await deductFefo(tx, {
    medicineId: p.medicineId,
    qty: p.qty,
    type: "USAGE",
    reason: "Patient visit",
    patientRecordId: p.patientRecordId,
    userId: p.userId,
    allowExpired: false,
    medicineName: med.name,
  });
}

// ── REVERSAL: ibalik ang stock ng isang visit (edit/delete) ───────────────────
// Ibinabalik sa mismong batch na pinagkunan, ayon sa ledger.
export async function reverseVisitUsage(
  tx: Tx,
  p: { patientRecordId: string; courseId: string; userId: string; reason: string }
) {
  const moves = await tx.medicineStockMovement.findMany({
    where: { patientRecordId: p.patientRecordId, type: "USAGE" },
    select: { id: true, medicineId: true, batchId: true, qtyChange: true },
  });
  if (moves.length === 0) return;

  // Alin ang nai-reverse na (para hindi madoble)
  const reversed = await tx.medicineStockMovement.count({
    where: { patientRecordId: p.patientRecordId, type: "USAGE_REVERSAL" },
  });
  const usageTotal = moves.length;
  if (reversed >= usageTotal) return;

  const medicineIds = [...new Set(moves.map((m) => m.medicineId))].sort();
  for (const id of medicineIds) await lockMedicine(tx, id, p.courseId);

  for (const m of moves) {
    const qty = -m.qtyChange; // positibo
    if (m.batchId) {
      await tx.medicineBatch
        .update({ where: { id: m.batchId }, data: { qtyRemaining: { increment: qty } } })
        .catch(() => {});
    }
    const updated = await tx.medicineInventory.update({
      where: { id: m.medicineId },
      data: { stockQty: { increment: qty } },
      select: { stockQty: true },
    });
    await tx.medicineStockMovement.create({
      data: {
        medicineId: m.medicineId,
        batchId: m.batchId,
        type: "USAGE_REVERSAL",
        qtyChange: qty,
        balanceAfter: updated.stockQty,
        reason: p.reason,
        patientRecordId: p.patientRecordId,
        createdById: p.userId,
      },
    });
  }
}

// ── ADJUST / WRITE-OFF ────────────────────────────────────────────────────────
// delta > 0: dagdag (nakitang sobra) | delta < 0: bawas (FEFO)
export async function adjust(
  tx: Tx,
  p: {
    medicineId: string;
    courseId: string;
    delta: number;
    type: "ADJUST" | "EXPIRED" | "DAMAGED" | "COUNT";
    reason: string;
    userId: string;
  }
) {
  if (!Number.isInteger(p.delta) || p.delta === 0) throw new StockError("Change must be a non-zero whole number", 400);
  if (!p.reason?.trim()) throw new StockError("Reason is required", 400);

  await lockMedicine(tx, p.medicineId, p.courseId);
  const med = await tx.medicineInventory.findUniqueOrThrow({
    where: { id: p.medicineId },
    select: { name: true },
  });

  if (p.delta > 0) {
    const batch = await tx.medicineBatch.create({
      data: {
        medicineId: p.medicineId,
        qtyReceived: p.delta,
        qtyRemaining: p.delta,
        source: "ADJUSTMENT",
      },
    });
    const updated = await tx.medicineInventory.update({
      where: { id: p.medicineId },
      data: { stockQty: { increment: p.delta } },
      select: { stockQty: true },
    });
    await tx.medicineStockMovement.create({
      data: {
        medicineId: p.medicineId,
        batchId: batch.id,
        type: p.type,
        qtyChange: p.delta,
        balanceAfter: updated.stockQty,
        reason: p.reason.trim(),
        createdById: p.userId,
      },
    });
    return;
  }

  await deductFefo(tx, {
    medicineId: p.medicineId,
    qty: -p.delta,
    type: p.type,
    reason: p.reason.trim(),
    userId: p.userId,
    allowExpired: true, // pwedeng i-write-off ang expired
    medicineName: med.name,
  });
}