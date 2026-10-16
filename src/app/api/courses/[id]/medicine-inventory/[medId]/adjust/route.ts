import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";
import { adjust, StockError } from "@/lib/medicine-stock";

// POST /api/courses/[id]/medicine-inventory/[medId]/adjust
// body: { delta: number (+/- sa pinakamaliit na unit), type, reason }
// Bawas (negatibo) ay Head lang.
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

    const body = (await req.json()) as { delta: number; type?: string; reason?: string };
    const delta = Number(body.delta);
    const allowedTypes = ["ADJUST", "EXPIRED", "DAMAGED", "COUNT"] as const;
    const type = (allowedTypes as readonly string[]).includes(body.type ?? "")
      ? (body.type as (typeof allowedTypes)[number])
      : "ADJUST";

    const isHead = !!access.courseRole?.includes("Head");
    if (delta < 0 && !isHead) {
      return NextResponse.json({ error: "Only the Head can reduce stock" }, { status: 403 });
    }

    await prisma.$transaction((tx) =>
      adjust(tx, {
        medicineId: medId,
        courseId,
        delta,
        type,
        reason: body.reason ?? "",
        userId: access.userId,
      })
    );

    const med = await prisma.medicineInventory.findUnique({ where: { id: medId }, select: { stockQty: true } });
    return NextResponse.json({ ok: true, balance: med?.stockQty ?? 0 });
  } catch (err) {
    if (err instanceof StockError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[POST /medicine-inventory/[medId]/adjust]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}