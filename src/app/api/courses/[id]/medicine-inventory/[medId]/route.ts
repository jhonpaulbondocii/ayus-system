// src/app/api/courses/[id]/medicine-inventory/[medId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/courses/[id]/medicine-inventory/[medId]
// Edit an existing medicine in inventory
// ─────────────────────────────────────────────────────────────────────────────
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; medId: string }> }
) {
  try {
    const { id: courseId, medId } = await params;

    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (access.systemRole === "ADMIN") {
      return NextResponse.json(
        { error: "Admins can view but not manage medicine inventory" },
        { status: 403 }
      );
    }

    // Verify clinic office
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { officeType: true },
    });

    if (course?.officeType !== "CLINIC") {
      return NextResponse.json({ error: "Not a clinic office" }, { status: 403 });
    }

    // Verify medicine belongs to this course
    const existing = await prisma.medicineInventory.findUnique({
      where: { id: medId },
      select: { id: true, courseId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Medicine not found" }, { status: 404 });
    }
    if (existing.courseId !== courseId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json() as {
      name?:               string;
      unit?:               string;
      lowStockThreshold?:  number;
      notes?:              string | null;
      genericName?:        string | null;
      brandName?:          string | null;
      strength?:           string | null;
      dosageForm?:         string | null;
      category?:           string | null;
      location?:           string | null;
      supplier?:           string | null;
      isPrescriptionOnly?: boolean;
      packaging?:          string;
      piecesPerPack?:      number;
      parLevel?:           number | null;
      packCost?:           number | null;
      defaultDispenseQty?: number | null;
      archived?:           boolean;
    };

    // Ang stockQty ay hindi na direktang ine-edit dito. Gamitin ang Restock/Adjust.
    if (body.piecesPerPack !== undefined && (!Number.isInteger(body.piecesPerPack) || body.piecesPerPack < 1)) {
      return NextResponse.json({ error: "Pieces per pack must be at least 1" }, { status: 400 });
    }

    if (body.name !== undefined && !body.name.trim()) {
      return NextResponse.json({ error: "Medicine name cannot be empty" }, { status: 400 });
    }
    if (body.unit !== undefined && !body.unit.trim()) {
      return NextResponse.json({ error: "Unit cannot be empty" }, { status: 400 });
    }
    if (body.lowStockThreshold !== undefined && body.lowStockThreshold < 0) {
      return NextResponse.json({ error: "Low stock threshold cannot be negative" }, { status: 400 });
    }

    // Check for duplicate name (exclude self)
    if (body.name) {
      const duplicate = await prisma.medicineInventory.findFirst({
        where: {
          courseId,
          name: { equals: body.name.trim(), mode: "insensitive" },
          NOT: { id: medId },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "A medicine with this name already exists in inventory" },
          { status: 409 }
        );
      }
    }

    const t = (v: string | null | undefined) => (v?.trim() ? v.trim() : null);

    const medicine = await prisma.medicineInventory.update({
      where: { id: medId },
      data: {
        ...(body.name               !== undefined ? { name:               body.name.trim() } : {}),
        ...(body.unit               !== undefined ? { unit:               body.unit.trim() } : {}),
        ...(body.lowStockThreshold  !== undefined ? { lowStockThreshold:  body.lowStockThreshold } : {}),
        ...(body.notes              !== undefined ? { notes:              t(body.notes) } : {}),
        ...(body.genericName        !== undefined ? { genericName:        t(body.genericName) } : {}),
        ...(body.brandName          !== undefined ? { brandName:          t(body.brandName) } : {}),
        ...(body.strength           !== undefined ? { strength:           t(body.strength) } : {}),
        ...(body.dosageForm         !== undefined ? { dosageForm:         t(body.dosageForm) } : {}),
        ...(body.category           !== undefined ? { category:           t(body.category) } : {}),
        ...(body.location           !== undefined ? { location:           t(body.location) } : {}),
        ...(body.supplier           !== undefined ? { supplier:           t(body.supplier) } : {}),
        ...(body.isPrescriptionOnly !== undefined ? { isPrescriptionOnly: body.isPrescriptionOnly } : {}),
        ...(body.packaging          !== undefined ? { packaging:          t(body.packaging) ?? "piece" } : {}),
        ...(body.piecesPerPack      !== undefined ? { piecesPerPack:      body.piecesPerPack } : {}),
        ...(body.parLevel           !== undefined ? { parLevel:           body.parLevel } : {}),
        ...(body.packCost           !== undefined ? { packCost:           body.packCost } : {}),
        ...(body.defaultDispenseQty !== undefined ? { defaultDispenseQty: body.defaultDispenseQty } : {}),
        ...(body.archived           !== undefined ? { archivedAt:         body.archived ? new Date() : null } : {}),
      },
    });

    return NextResponse.json({ medicine });
  } catch (err) {
    console.error("[PUT /medicine-inventory/[medId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/courses/[id]/medicine-inventory/[medId]
// Delete a medicine from inventory (blocked if it has existing usage records)
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; medId: string }> }
) {
  try {
    const { id: courseId, medId } = await params;

    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (access.systemRole === "ADMIN") {
      return NextResponse.json(
        { error: "Admins can view but not manage medicine inventory" },
        { status: 403 }
      );
    }

    // Verify clinic office
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { officeType: true },
    });

    if (course?.officeType !== "CLINIC") {
      return NextResponse.json({ error: "Not a clinic office" }, { status: 403 });
    }

    // Verify medicine belongs to this course
    const existing = await prisma.medicineInventory.findUnique({
      where: { id: medId },
      select: { id: true, courseId: true, name: true, _count: { select: { usages: true, movements: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Medicine not found" }, { status: 404 });
    }
    if (existing.courseId !== courseId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Block delete if medicine has been used in any patient record
    // (onDelete: Restrict in schema also enforces this at DB level)
    if (existing._count.usages > 0 || existing._count.movements > 0) {
      // May history: i-archive sa halip na burahin
      await prisma.medicineInventory.update({
        where: { id: medId },
        data:  { archivedAt: new Date() },
      });
      return NextResponse.json({ success: true, archived: true });
    }

    await prisma.medicineInventory.delete({ where: { id: medId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /medicine-inventory/[medId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}