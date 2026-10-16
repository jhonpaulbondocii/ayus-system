import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";
import { restock, StockError } from "@/lib/medicine-stock";

// POST /api/courses/[id]/medicine-inventory/[medId]/restock
// body: { packs?: number, pieces?: number, batchNo?, expiryDate?, source?, reason? }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; medId: string }> }
) {
  try {
    const { id: courseId, medId } = await params;

    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    if (access.systemRole === "ADMIN") {
      return NextResponse.json({ error: "Admins can view but not manage medicine inventory" }, { status: 403 });
    }

    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { officeType: true } });
    if (course?.officeType !== "CLINIC") {
      return NextResponse.json({ error: "Not a clinic office" }, { status: 403 });
    }

    const med = await prisma.medicineInventory.findFirst({
      where: { id: medId, courseId },
      select: { piecesPerPack: true },
    });
    if (!med) return NextResponse.json({ error: "Medicine not found" }, { status: 404 });

    const body = (await req.json()) as {
      packs?: number;
      pieces?: number;
      batchNo?: string | null;
      expiryDate?: string | null;
      source?: string;
      reason?: string | null;
    };

    const packs = Number(body.packs ?? 0);
    const pieces = Number(body.pieces ?? 0);
    const qty = packs * med.piecesPerPack + pieces;

    if (!Number.isInteger(qty) || qty <= 0) {
      return NextResponse.json({ error: "Enter a quantity greater than 0" }, { status: 400 });
    }

    let expiryDate: Date | null = null;
    if (body.expiryDate) {
      expiryDate = new Date(body.expiryDate);
      if (isNaN(expiryDate.getTime())) {
        return NextResponse.json({ error: "Invalid expiry date" }, { status: 400 });
      }
    }

    const allowedSources = ["PURCHASE", "DONATION", "TRANSFER"];
    const source = allowedSources.includes(body.source ?? "") ? body.source! : "PURCHASE";

    const result = await prisma.$transaction((tx) =>
      restock(tx, {
        medicineId: medId,
        courseId,
        qty,
        batchNo: body.batchNo?.trim() || null,
        expiryDate,
        source,
        reason: body.reason?.trim() || null,
        userId: access.userId,
      })
    );

    return NextResponse.json({ ok: true, added: qty, balance: result.balance }, { status: 201 });
  } catch (err) {
    if (err instanceof StockError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[POST /medicine-inventory/[medId]/restock]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}