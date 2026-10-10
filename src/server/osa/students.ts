import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOsaAccess } from "./access";

const STANDINGS = ["GOOD_STANDING", "ON_PROBATION", "SUSPENDED"];

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const int = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);

function pick(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  for (const k of ["studentNumber", "name", "gender", "department", "course", "email", "address",
    "yearSection", "mobileNo", "guardianName", "guardianContact"]) {
    if (k in body) data[k] = str(body[k]);
  }
  if ("age" in body) data.age = int(body.age);
  if ("birthDate" in body) data.birthDate = body.birthDate ? new Date(String(body.birthDate)) : null;
  if ("standing" in body) data.standing = body.standing;
  if ("clearanceHold" in body) data.clearanceHold = !!body.clearanceHold;
  return data;
}

function validate(data: Record<string, unknown>): string | null {
  if (data.birthDate && isNaN((data.birthDate as Date).getTime())) return "Invalid birth date";
  if (data.standing && !STANDINGS.includes(data.standing as string)) return "Invalid standing";
  return null;
}

export async function GET(req: NextRequest, courseId: string, rest: string[]) {
  const access = await requireOsaAccess(courseId);
  if (!access.ok) return access.response;

  if (rest[0]) {
    const student = await prisma.student.findFirst({ where: { id: rest[0], deletedAt: null } });
    if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ student });
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const students = await prisma.student.findMany({
    where: {
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { studentNumber: { contains: q, mode: "insensitive" } },
              { course: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    take: 1000,
  });
  return NextResponse.json({ students });
}

export async function POST(req: NextRequest, courseId: string, _rest: string[]) {
  const access = await requireOsaAccess(courseId);
  if (!access.ok) return access.response;

  const data = pick(await req.json().catch(() => ({})));
  if (!data.studentNumber || !data.name) {
    return NextResponse.json({ error: "Student number at name ay required" }, { status: 400 });
  }
  const bad = validate(data);
  if (bad) return NextResponse.json({ error: bad }, { status: 400 });

  try {
    const student = await prisma.student.create({ data: data as { studentNumber: string; name: string } });
    return NextResponse.json({ student }, { status: 201 });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "May ganitong student number na (baka naka-delete pero nasa database pa)" }, { status: 409 });
    }
    throw e;
  }
}

export async function PATCH(req: NextRequest, courseId: string, rest: string[]) {
  const access = await requireOsaAccess(courseId);
  if (!access.ok) return access.response;

  const studentId = rest[0];
  if (!studentId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const data = pick(await req.json().catch(() => ({})));
  if ("studentNumber" in data && !data.studentNumber) return NextResponse.json({ error: "Student number is required" }, { status: 400 });
  if ("name" in data && !data.name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  const bad = validate(data);
  if (bad) return NextResponse.json({ error: bad }, { status: 400 });

  const existing = await prisma.student.findFirst({ where: { id: studentId, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const student = await prisma.student.update({ where: { id: studentId }, data });
    return NextResponse.json({ student });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "May ganitong student number na" }, { status: 409 });
    }
    throw e;
  }
}

// Soft delete (Head/Admin lang). Bawal kung may violation records.
export async function DELETE(_req: NextRequest, courseId: string, rest: string[]) {
  const access = await requireOsaAccess(courseId, { headOnly: true });
  if (!access.ok) return access.response;

  const studentId = rest[0];
  if (!studentId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const existing = await prisma.student.findFirst({ where: { id: studentId, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const count = await prisma.violation.count({ where: { studentId, deletedAt: null } });
  if (count > 0) {
    return NextResponse.json({ error: `May ${count} violation record(s) ang student na ito, hindi pwedeng i-delete.` }, { status: 409 });
  }
  await prisma.student.update({ where: { id: studentId }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}