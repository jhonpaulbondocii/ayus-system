import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

// GET /api/courses/[id]/medicine-inventory/[medId]/history
// Ledger + batches ng isang gamot
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; medId: string }> }
) {
  try {
    const { id: courseId, medId } = await params;

    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const med = await prisma.medicineInventory.findFirst({
      where: { id: medId, courseId },
      select: { id: true },
    });
    if (!med) return NextResponse.json({ error: "Medicine not found" }, { status: 404 });

    const [movements, batches] = await Promise.all([
      prisma.medicineStockMovement.findMany({
        where: { medicineId: medId },
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          id: true, type: true, qtyChange: true, balanceAfter: true, reason: true,
          patientRecordId: true, createdAt: true,
          createdBy: { select: { id: true, name: true } },
          batch: { select: { batchNo: true, expiryDate: true } },
        },
      }),
      prisma.medicineBatch.findMany({
        where: { medicineId: medId, qtyRemaining: { gt: 0 } },
        orderBy: [{ expiryDate: { sort: "asc", nulls: "last" } }],
        select: { id: true, batchNo: true, expiryDate: true, qtyRemaining: true, source: true, receivedAt: true },
      }),
    ]);

    return NextResponse.json({ movements, batches });
  } catch (err) {
    console.error("[GET /medicine-inventory/[medId]/history]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}