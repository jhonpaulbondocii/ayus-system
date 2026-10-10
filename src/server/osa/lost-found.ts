import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

const VALID_CATEGORIES = ["Electronics", "Clothing", "ID", "Bag", "Books", "Others"];
const VALID_STATUSES   = ["UNCLAIMED", "CLAIMED", "TURNED_OVER"];

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/courses/[id]/osa/lost-found
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest, courseId: string) {
  const access = await requireCoursePermission(courseId, "view_course");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { searchParams } = new URL(req.url);
  const q        = searchParams.get("q")?.trim()        ?? "";
  const status   = searchParams.get("status")?.trim()   ?? "";
  const category = searchParams.get("category")?.trim() ?? "";
  const dateFrom = searchParams.get("dateFrom")?.trim() ?? "";
  const dateTo   = searchParams.get("dateTo")?.trim()   ?? "";

  const items = await prisma.lostFoundItem.findMany({
    where: {
      courseId,
      ...(status   ? { status }   : {}),
      ...(category ? { category } : {}),
      ...(dateFrom || dateTo ? {
        dateFound: {
          ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00+08:00`) } : {}),
          ...(dateTo   ? { lte: new Date(`${dateTo}T23:59:59+08:00`)   } : {}),
        },
      } : {}),
      ...(q ? {
        OR: [
          { itemName:      { contains: q, mode: "insensitive" } },
          { description:   { contains: q, mode: "insensitive" } },
          { foundBy:       { contains: q, mode: "insensitive" } },
          { locationFound: { contains: q, mode: "insensitive" } },
          { claimerName:   { contains: q, mode: "insensitive" } },
        ],
      } : {}),
    },
    select: {
      id:            true,
      itemName:      true,
      description:   true,
      category:      true,
      dateFound:     true,
      locationFound: true,
      foundBy:       true,
      status:        true,
      claimerName:   true,
      claimedAt:     true,
      photoUrl:      true,
      createdAt:     true,
      recordedByUser: {
        select: { id: true, name: true },
      },
    },
    orderBy: { dateFound: "desc" },
  });

  return NextResponse.json({ items });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/courses/[id]/osa/lost-found
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest, courseId: string) {
  const access = await requireCoursePermission(courseId, "view_course");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json() as {
    itemName:      string;
    description?:  string | null;
    category?:     string;
    dateFound:     string;
    locationFound?: string | null;
    foundBy?:      string | null;
    photoUrl?:     string | null;
  };

  if (!body.itemName?.trim())
    return NextResponse.json({ error: "Item name is required" }, { status: 400 });
  if (!body.dateFound)
    return NextResponse.json({ error: "Date found is required" }, { status: 400 });

  const category = VALID_CATEGORIES.includes(body.category ?? "")
    ? body.category!
    : "Others";

  const item = await prisma.lostFoundItem.create({
    data: {
      courseId,
      itemName:      body.itemName.trim(),
      description:   body.description?.trim()   ?? null,
      category,
      dateFound:     new Date(body.dateFound),
      locationFound: body.locationFound?.trim() ?? null,
      foundBy:       body.foundBy?.trim()       ?? null,
      photoUrl:      body.photoUrl?.trim()       ?? null,
      status:        "UNCLAIMED",
      recordedBy:    access.userId,
    },
    select: {
      id:            true,
      itemName:      true,
      description:   true,
      category:      true,
      dateFound:     true,
      locationFound: true,
      foundBy:       true,
      status:        true,
      claimerName:   true,
      claimedAt:     true,
      photoUrl:      true,
      createdAt:     true,
      recordedByUser: {
        select: { id: true, name: true },
      },
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/courses/[id]/osa/lost-found/[itemId]
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, courseId: string, rest: string[]) {
  const itemId = rest[0];
  if (!itemId) return NextResponse.json({ error: "Item ID required" }, { status: 400 });

  const access = await requireCoursePermission(courseId, "view_course");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const existing = await prisma.lostFoundItem.findFirst({
    where: { id: itemId, courseId },
  });
  if (!existing) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const body = await req.json() as {
    itemName?:      string;
    description?:   string | null;
    category?:      string;
    dateFound?:     string;
    locationFound?: string | null;
    foundBy?:       string | null;
    photoUrl?:      string | null;
    status?:        string;
    claimerName?:   string | null;
    claimedAt?:     string | null;
  };

  // Validate status
  if (body.status && !VALID_STATUSES.includes(body.status))
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  // If marking as CLAIMED, claimerName is required
  if (body.status === "CLAIMED" && !body.claimerName?.trim() && !existing.claimerName)
    return NextResponse.json({ error: "Claimer name is required when marking as claimed" }, { status: 400 });

  const updated = await prisma.lostFoundItem.update({
    where: { id: itemId },
    data: {
      ...(body.itemName      !== undefined ? { itemName:      body.itemName.trim()          } : {}),
      ...(body.description   !== undefined ? { description:   body.description?.trim()       ?? null } : {}),
      ...(body.category      !== undefined ? { category:      VALID_CATEGORIES.includes(body.category) ? body.category : "Others" } : {}),
      ...(body.dateFound     !== undefined ? { dateFound:     new Date(body.dateFound)       } : {}),
      ...(body.locationFound !== undefined ? { locationFound: body.locationFound?.trim()     ?? null } : {}),
      ...(body.foundBy       !== undefined ? { foundBy:       body.foundBy?.trim()           ?? null } : {}),
      ...(body.photoUrl      !== undefined ? { photoUrl:      body.photoUrl?.trim()          ?? null } : {}),
      ...(body.status        !== undefined ? { status:        body.status                   } : {}),
      ...(body.claimerName   !== undefined ? { claimerName:   body.claimerName?.trim()      ?? null } : {}),
      ...(body.claimedAt     !== undefined ? { claimedAt:     body.claimedAt ? new Date(body.claimedAt) : null } : {}),
      // Auto-set claimedAt kapag CLAIMED at walang claimedAt
      ...(body.status === "CLAIMED" && !body.claimedAt && !existing.claimedAt
        ? { claimedAt: new Date() }
        : {}),
    },
    select: {
      id:            true,
      itemName:      true,
      description:   true,
      category:      true,
      dateFound:     true,
      locationFound: true,
      foundBy:       true,
      status:        true,
      claimerName:   true,
      claimedAt:     true,
      photoUrl:      true,
      createdAt:     true,
      recordedByUser: {
        select: { id: true, name: true },
      },
    },
  });

  return NextResponse.json({ item: updated });
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/courses/[id]/osa/lost-found/[itemId]
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest, courseId: string, rest: string[]) {
  const itemId = rest[0];
  if (!itemId) return NextResponse.json({ error: "Item ID required" }, { status: 400 });

  const access = await requireCoursePermission(courseId, "view_course");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const existing = await prisma.lostFoundItem.findFirst({
    where: { id: itemId, courseId },
  });
  if (!existing) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  await prisma.lostFoundItem.delete({ where: { id: itemId } });

  return NextResponse.json({ ok: true });
}