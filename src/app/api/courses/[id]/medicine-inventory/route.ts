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

    const medicines = await prisma.medicineInventory.findMany({
      where: {
        courseId,
        ...(search
          ? { name: { contains: search, mode: "insensitive" } }
          : {}),
      },
      select: {
        id:                true,
        name:              true,
        unit:              true,
        stockQty:          true,
        lowStockThreshold: true,
        notes:             true,
        createdAt:         true,
        updatedAt:         true,
      },
      orderBy: { name: "asc" },
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
      name:               string;
      unit:               string;
      stockQty?:          number;
      lowStockThreshold?: number;
      notes?:             string | null;
    };

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

    const medicine = await prisma.medicineInventory.create({
      data: {
        courseId,
        name:              body.name.trim(),
        unit:              body.unit.trim(),
        stockQty:          body.stockQty          ?? 0,
        lowStockThreshold: body.lowStockThreshold ?? 10,
        notes:             body.notes?.trim()     ?? null,
      },
      select: {
        id:                true,
        name:              true,
        unit:              true,
        stockQty:          true,
        lowStockThreshold: true,
        notes:             true,
        createdAt:         true,
        updatedAt:         true,
      },
    });

    return NextResponse.json({ medicine }, { status: 201 });
  } catch (err) {
    console.error("[POST /medicine-inventory]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}