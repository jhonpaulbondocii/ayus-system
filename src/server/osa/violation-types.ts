import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOsaAccess } from "./access";
import { VIOLATION_TYPE_ROWS } from "./violation-types-data";

const SEVERITIES = ["MINOR", "SERIOUS", "VERY_SERIOUS"];

// write=true => Head/Admin lang. write=false => Head, Admin o Staff.
async function authorize(courseId: string, write: boolean): Promise<Response | null> {
  const access = await requireOsaAccess(courseId, { headOnly: write });
  return access.ok ? null : access.response;
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const int = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);

function pick(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  if ("code" in body) data.code = str(body.code);
  if ("name" in body) data.name = str(body.name);
  if ("description" in body) data.description = str(body.description);
  if ("severity" in body) data.severity = body.severity;
  if ("category" in body) data.category = str(body.category);
  if ("dismissalOnFirst" in body) data.dismissalOnFirst = !!body.dismissalOnFirst;
  if ("defaultSanction" in body) data.defaultSanction = str(body.defaultSanction);
  if ("sanctionMinDays" in body) data.sanctionMinDays = int(body.sanctionMinDays);
  if ("sanctionMaxDays" in body) data.sanctionMaxDays = int(body.sanctionMaxDays);
  if ("maxSanction" in body) data.maxSanction = str(body.maxSanction);
  if ("escalationCount" in body) data.escalationCount = int(body.escalationCount) ?? 3;
  if ("escalatesTo" in body) data.escalatesTo = str(body.escalatesTo);
  if ("manualRef" in body) data.manualRef = str(body.manualRef);
  if ("isActive" in body) data.isActive = !!body.isActive;
  return data;
}

// GET /api/courses/:id/osa/violation-types            -> listahan
// GET /api/courses/:id/osa/violation-types?all=1      -> kasama ang inactive (Head view)
export async function GET(req: NextRequest, courseId: string, _rest: string[]) {
  const denied = await authorize(courseId, false);
  if (denied) return denied;

  const all = req.nextUrl.searchParams.get("all") === "1";
  const items = await prisma.violationType.findMany({
    where: { courseId, deletedAt: null, ...(all ? {} : { isActive: true }) },
    orderBy: [{ order: "asc" }, { code: "asc" }],
  });
  return NextResponse.json({ items });
}

// POST /api/courses/:id/osa/violation-types           -> bagong type
// POST /api/courses/:id/osa/violation-types/seed      -> i-load ang DHVSU defaults (hindi ino-overwrite ang existing)
export async function POST(req: NextRequest, courseId: string, rest: string[]) {
  const denied = await authorize(courseId, true);
  if (denied) return denied;

  if (rest[0] === "seed") {
    const result = await prisma.violationType.createMany({
      data: VIOLATION_TYPE_ROWS.map((r) => ({ ...r, courseId })),
      skipDuplicates: true,
    });
    return NextResponse.json({ created: result.count });
  }

  const body = await req.json().catch(() => ({}));
  const data = pick(body);
  if (!data.code || !data.name) {
    return NextResponse.json({ error: "Code at name ay required" }, { status: 400 });
  }
  if (data.severity && !SEVERITIES.includes(data.severity as string)) {
    return NextResponse.json({ error: "Invalid severity" }, { status: 400 });
  }
  try {
    const last = await prisma.violationType.aggregate({ where: { courseId }, _max: { order: true } });
    const item = await prisma.violationType.create({
      data: {
        ...(data as { code: string; name: string }),
        severity: (data.severity as string) ?? "MINOR",
        courseId,
        order: (last._max.order ?? -1) + 1,
      },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "May ganitong code na (baka naka-delete pero nasa database pa)" }, { status: 409 });
    }
    throw e;
  }
}

// PATCH /api/courses/:id/osa/violation-types/:typeId
export async function PATCH(req: NextRequest, courseId: string, rest: string[]) {
  const denied = await authorize(courseId, true);
  if (denied) return denied;

  const typeId = rest[0];
  if (!typeId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const data = pick(body);
  if ("code" in data && !data.code) return NextResponse.json({ error: "Code is required" }, { status: 400 });
  if ("name" in data && !data.name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (data.severity && !SEVERITIES.includes(data.severity as string)) {
    return NextResponse.json({ error: "Invalid severity" }, { status: 400 });
  }

  const existing = await prisma.violationType.findFirst({ where: { id: typeId, courseId, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const item = await prisma.violationType.update({ where: { id: typeId }, data });
    return NextResponse.json({ item });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "May ganitong code na" }, { status: 409 });
    }
    throw e;
  }
}

// DELETE /api/courses/:id/osa/violation-types/:typeId  (soft delete, para hindi masira ang lumang violation records)
export async function DELETE(_req: NextRequest, courseId: string, rest: string[]) {
  const denied = await authorize(courseId, true);
  if (denied) return denied;

  const typeId = rest[0];
  if (!typeId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const existing = await prisma.violationType.findFirst({ where: { id: typeId, courseId, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.violationType.update({
    where: { id: typeId },
    data: { deletedAt: new Date(), isActive: false },
  });
  return NextResponse.json({ ok: true });
}