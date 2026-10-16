// src/app/api/courses/[id]/medicine-inventory/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/courses/[id]/medicine-inventory
// Returns all medicines in inventory for this clinic office
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;

    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    // Verify clinic office
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { officeType: true },
    });

    if (course?.officeType !== "CLINIC") {
      return NextResponse.json({ error: "Not a clinic office" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() ?? "";

    const includeArchived = searchParams.get("archived") === "1";
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);

    const rows = await prisma.medicineInventory.findMany({
      where: {
        courseId,
        ...(includeArchived ? {} : { archivedAt: null }),
        ...(search
          ? {
              OR: [
                { name:        { contains: search, mode: "insensitive" } },
                { genericName: { contains: search, mode: "insensitive" } },
                { brandName:   { contains: search, mode: "insensitive" } },
                { category:    { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id:                 true,
        name:               true,
        unit:               true,
        stockQty:           true,
        lowStockThreshold:  true,
        notes:              true,
        genericName:        true,
        brandName:          true,
        strength:           true,
        dosageForm:         true,
        category:           true,
        location:           true,
        supplier:           true,
        isPrescriptionOnly: true,
        packaging:          true,
        piecesPerPack:      true,
        parLevel:           true,
        packCost:           true,
        defaultDispenseQty: true,
        archivedAt:         true,
        createdAt:          true,
        updatedAt:          true,
        batches: {
          where:   { qtyRemaining: { gt: 0 }, expiryDate: { not: null } },
          orderBy: { expiryDate: "asc" },
          select:  { expiryDate: true, qtyRemaining: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const now = new Date();
    const medicines = rows.map(({ batches, ...m }) => {
      const expired      = batches.filter(b => b.expiryDate! <= now);
      const expiringSoon = batches.filter(b => b.expiryDate! > now && b.expiryDate! <= soon);
      return {
        ...m,
        nextExpiry:      batches.find(b => b.expiryDate! > now)?.expiryDate ?? null,
        expiredQty:      expired.reduce((s, b) => s + b.qtyRemaining, 0),
        expiringSoonQty: expiringSoon.reduce((s, b) => s + b.qtyRemaining, 0),
      };
    });

    return NextResponse.json({ medicines });
  } catch (err) {
    console.error("[GET /medicine-inventory]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/courses/[id]/medicine-inventory
// Add a new medicine to inventory
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;

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

    const body = await req.json() as {
      name:                string;
      unit:                string;
      stockQty?:           number; // sa pinakamaliit na unit
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
      expiryDate?:         string | null; // para sa opening stock
      batchNo?:            string | null;
    };

    const piecesPerPack = body.piecesPerPack ?? 1;
    if (!Number.isInteger(piecesPerPack) || piecesPerPack < 1) {
      return NextResponse.json({ error: "Pieces per pack must be at least 1" }, { status: 400 });
    }

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Medicine name is required" }, { status: 400 });
    }
    if (!body.unit?.trim()) {
      return NextResponse.json({ error: "Unit is required" }, { status: 400 });
    }
    if (body.stockQty !== undefined && body.stockQty < 0) {
      return NextResponse.json({ error: "Stock quantity cannot be negative" }, { status: 400 });
    }
    if (body.lowStockThreshold !== undefined && body.lowStockThreshold < 0) {
      return NextResponse.json({ error: "Low stock threshold cannot be negative" }, { status: 400 });
    }

    // Prevent duplicate medicine name within the same clinic
    const existing = await prisma.medicineInventory.findFirst({
      where: {
        courseId,
        name: { equals: body.name.trim(), mode: "insensitive" },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A medicine with this name already exists in inventory" },
        { status: 409 }
      );
    }

    const openingQty = body.stockQty ?? 0;
    let openingExpiry: Date | null = null;
    if (body.expiryDate) {
      openingExpiry = new Date(body.expiryDate);
      if (isNaN(openingExpiry.getTime())) {
        return NextResponse.json({ error: "Invalid expiry date" }, { status: 400 });
      }
    }

    const medicine = await prisma.$transaction(async (tx) => {
      const created = await tx.medicineInventory.create({
        data: {
          courseId,
          name:               body.name.trim(),
          unit:               body.unit.trim(),
          stockQty:           openingQty,
          lowStockThreshold:  body.lowStockThreshold ?? 10,
          notes:              body.notes?.trim() || null,
          genericName:        body.genericName?.trim() || null,
          brandName:          body.brandName?.trim() || null,
          strength:           body.strength?.trim() || null,
          dosageForm:         body.dosageForm?.trim() || null,
          category:           body.category?.trim() || null,
          location:           body.location?.trim() || null,
          supplier:           body.supplier?.trim() || null,
          isPrescriptionOnly: body.isPrescriptionOnly ?? false,
          packaging:          body.packaging?.trim() || "piece",
          piecesPerPack,
          parLevel:           body.parLevel ?? null,
          packCost:           body.packCost ?? null,
          defaultDispenseQty: body.defaultDispenseQty ?? null,
        },
      });

      if (openingQty > 0) {
        const batch = await tx.medicineBatch.create({
          data: {
            medicineId:   created.id,
            batchNo:      body.batchNo?.trim() || null,
            expiryDate:   openingExpiry,
            qtyReceived:  openingQty,
            qtyRemaining: openingQty,
            source:       "OPENING",
          },
        });
        await tx.medicineStockMovement.create({
          data: {
            medicineId:   created.id,
            batchId:      batch.id,
            type:         "OPENING",
            qtyChange:    openingQty,
            balanceAfter: openingQty,
            reason:       "Opening stock",
            createdById:  access.userId,
          },
        });
      }
      return created;
    }, { timeout: 15000 });

    return NextResponse.json({ medicine }, { status: 201 });
  } catch (err) {
    console.error("[POST /medicine-inventory]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}