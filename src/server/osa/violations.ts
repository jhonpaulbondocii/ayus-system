import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleSub } from "./violation-extras";
import { requireOsaAccess } from "./access";

const STATUSES = ["OPEN", "UNDER_REVIEW", "SANCTIONED", "RESOLVED", "DISMISSED"];
const SEVERITIES = ["MINOR", "SERIOUS", "VERY_SERIOUS"];
const DATE_FIELDS = ["incidentDate", "noticeToExplainAt", "explanationReceivedAt", "hearingDate",
  "sanctionStart", "sanctionEnd", "decidedAt"];
const STR_FIELDS = ["location", "description", "reportedBy", "reportedByRole", "hearingResult",
  "sanction", "decidedBy", "appealResult"];

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const int = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);

function pick(body: Record<string, unknown>): { data: Record<string, unknown>; error?: string } {
  const data: Record<string, unknown> = {};
  for (const k of STR_FIELDS) if (k in body) data[k] = str(body[k]);
  for (const k of DATE_FIELDS) {
    if (!(k in body)) continue;
    if (!body[k]) { data[k] = null; continue; }
    const d = new Date(String(body[k]));
    if (isNaN(d.getTime())) return { data, error: `Invalid date: ${k}` };
    data[k] = d;
  }
  if ("sanctionDays" in body) data.sanctionDays = int(body.sanctionDays);
  if ("sanctionCompleted" in body) data.sanctionCompleted = !!body.sanctionCompleted;
  if ("appealed" in body) data.appealed = !!body.appealed;
  if ("status" in body) {
    if (!STATUSES.includes(body.status as string)) return { data, error: "Invalid status" };
    data.status = body.status;
    if (body.status === "RESOLVED" || body.status === "DISMISSED") data.resolvedAt = new Date();
    else data.resolvedAt = null;
  }
  return { data };
}

const listInclude = {
  student: { select: { id: true, studentNumber: true, name: true, course: true, yearSection: true } },
  violationType: { select: { id: true, code: true, name: true, severity: true } },
} as const;

// GET /osa/violations?q=&status=&severity=&studentId=   -> listahan
// GET /osa/violations/:id                               -> detalye (+ contacts, notes)
export async function GET(req: NextRequest, courseId: string, rest: string[]) {
  const access = await requireOsaAccess(courseId);
  if (!access.ok) return access.response;
  const isHead = access.isHead;

  if (rest[0]) {
    const violation = await prisma.violation.findFirst({
      where: { id: rest[0], courseId, deletedAt: null },
      include: {
        ...listInclude,
        parentContacts: { where: { deletedAt: null }, orderBy: { contactedAt: "desc" } },
        notes: {
          where: { deletedAt: null, ...(isHead ? {} : { confidential: false }) },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!violation) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ violation });
  }

  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim();
  const status = sp.get("status");
  const severity = sp.get("severity");
  const studentId = sp.get("studentId");

  const violations = await prisma.violation.findMany({
    where: {
      courseId,
      deletedAt: null,
      ...(status && STATUSES.includes(status) ? { status } : {}),
      ...(severity && SEVERITIES.includes(severity) ? { severity } : {}),
      ...(studentId ? { studentId } : {}),
      ...(q
        ? {
            OR: [
              { caseNo: { contains: q, mode: "insensitive" } },
              { student: { name: { contains: q, mode: "insensitive" } } },
              { student: { studentNumber: { contains: q, mode: "insensitive" } } },
              { violationType: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: listInclude,
    orderBy: { incidentDate: "desc" },
    take: 500,
  });
  return NextResponse.json({ violations });
}

async function nextCaseNo(courseId: string, year: number) {
  const prefix = `OSA-${year}-`;
  // kasama pati naka-delete, para hindi mag-duplicate ang caseNo
  const count = await prisma.violation.count({ where: { courseId, caseNo: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

// POST /osa/violations
export async function POST(req: NextRequest, courseId: string, rest: string[]) {
  const access = await requireOsaAccess(courseId);
  if (!access.ok) return access.response;
  const userId = access.userId;

  // Sub-resource routing: violations/:id/contacts or violations/:id/notes
  if (rest.length >= 2) return handleSub(req, courseId, rest, "POST");

  const body = await req.json().catch(() => ({}));
  const { data, error } = pick(body);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const studentId = str(body.studentId);
  const violationTypeId = str(body.violationTypeId);
  if (!studentId || !violationTypeId || !data.incidentDate) {
    return NextResponse.json({ error: "Student, violation type, at incident date ay required" }, { status: 400 });
  }

  const [student, type] = await Promise.all([
    prisma.student.findFirst({ where: { id: studentId, deletedAt: null }, select: { id: true } }),
    prisma.violationType.findFirst({ where: { id: violationTypeId, courseId, deletedAt: null, isActive: true } }),
  ]);
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  if (!type) return NextResponse.json({ error: "Violation type not found" }, { status: 404 });

  // Escalation: ilang beses na ginawa ng student ang parehong offense
  const prior = await prisma.violation.count({
    where: { courseId, studentId, violationTypeId, deletedAt: null, status: { not: "DISMISSED" } },
  });
  let severity = type.severity;
  let escalated = false;
  if (type.escalatesTo && SEVERITIES.includes(type.escalatesTo) && prior + 1 >= type.escalationCount) {
    severity = type.escalatesTo;
    escalated = true;
  }

  const year = (data.incidentDate as Date).getFullYear();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const caseNo = await nextCaseNo(courseId, year + 0);
      const violation = await prisma.violation.create({
        data: {
          ...data,
          incidentDate: data.incidentDate as Date,
          courseId,
          caseNo: attempt === 0 ? caseNo : `${caseNo}-${attempt}`,
          studentId,
          violationTypeId,
          severity,
          status: (data.status as string) ?? "OPEN",
          recordedBy: userId,
        },
        include: listInclude,
      });
      return NextResponse.json({ violation, escalated, priorCount: prior, dismissalOnFirst: type.dismissalOnFirst }, { status: 201 });
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002") throw e; // caseNo conflict -> subukan ulit
    }
  }
  return NextResponse.json({ error: "Hindi makagawa ng case number, subukan ulit." }, { status: 500 });
}

// PATCH /osa/violations/:id  OR  /osa/violations/:id/contacts/:cId|notes/:nId
export async function PATCH(req: NextRequest, courseId: string, rest: string[]) {
  const access = await requireOsaAccess(courseId);
  if (!access.ok) return access.response;

  if (rest.length >= 2) return handleSub(req, courseId, rest, "PATCH");

  const id = rest[0];
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const { data, error } = pick(body);
  if (error) return NextResponse.json({ error }, { status: 400 });
  if ("incidentDate" in data && !data.incidentDate) {
    return NextResponse.json({ error: "Incident date is required" }, { status: 400 });
  }

  const existing = await prisma.violation.findFirst({ where: { id, courseId, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const violation = await prisma.violation.update({ where: { id }, data, include: listInclude });
  return NextResponse.json({ violation });
}

// DELETE /osa/violations/:id  OR  /osa/violations/:id/contacts/:cId|notes/:nId
export async function DELETE(req: NextRequest, courseId: string, rest: string[]) {
  if (rest.length >= 2) return handleSub(req, courseId, rest, "DELETE");

  const access = await requireOsaAccess(courseId, { headOnly: true });
  if (!access.ok) return access.response;
  const userId = (access as { userId?: string }).userId ?? null;

  const id = rest[0];
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const existing = await prisma.violation.findFirst({ where: { id, courseId, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.violation.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: userId } });
  return NextResponse.json({ ok: true });
}