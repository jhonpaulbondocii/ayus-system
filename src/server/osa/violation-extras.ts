import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOsaAccess } from "./access";

const METHODS = ["CALL", "SMS", "LETTER", "PERSONAL"];
const ATTENDANCE = ["YES", "NO", "NO_RESPONSE"];

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

function date(v: unknown): Date | null | undefined {
  if (!v) return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? undefined : d; // undefined = invalid
}

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function handleSub(
  req: NextRequest,
  courseId: string,
  rest: string[], // [violationId, "contacts" | "notes", itemId?]
  method: "POST" | "PATCH" | "DELETE"
): Promise<Response> {
  const access = await requireOsaAccess(courseId);
  if (!access.ok) return access.response;

  const [violationId, kind, itemId] = rest;
  if (kind !== "contacts" && kind !== "notes") return bad("Not found", 404);

  const violation = await prisma.violation.findFirst({
    where: { id: violationId, courseId, deletedAt: null },
    select: { id: true },
  });
  if (!violation) return bad("Violation not found", 404);

  const body = method === "DELETE" ? {} : await req.json().catch(() => ({}));

  // ---------------- PARENT CONTACTS ----------------
  if (kind === "contacts") {
    if (method === "POST") {
      const r = contactData(body);
      if ("error" in r) return bad(r.error);
      const attemptNo = (await prisma.parentContact.count({ where: { violationId } })) + 1;
      const contact = await prisma.parentContact.create({
        data: { ...r.data, violationId, attemptNo, recordedBy: access.userId },
      });
      return NextResponse.json({ contact }, { status: 201 });
    }

    if (!itemId) return bad("Missing id");
    const existing = await prisma.parentContact.findFirst({ where: { id: itemId, violationId, deletedAt: null } });
    if (!existing) return bad("Not found", 404);

    if (method === "PATCH") {
      const r = contactData(body);
      if ("error" in r) return bad(r.error);
      const contact = await prisma.parentContact.update({ where: { id: itemId }, data: r.data });
      return NextResponse.json({ contact });
    }
    await prisma.parentContact.update({ where: { id: itemId }, data: { deletedAt: new Date() } });
    return NextResponse.json({ ok: true });
  }

  // ---------------- NOTES ----------------
  if (method === "POST") {
    const text = str(body.body);
    if (!text) return bad("Walang laman ang note");
    // Staff: hindi pwedeng mag-confidential (hindi nila ito makikita pagkatapos)
    const confidential = access.isHead ? body.confidential !== false : false;
    const note = await prisma.violationNote.create({
      data: { violationId, body: text, confidential, authorId: access.userId },
    });
    return NextResponse.json({ note }, { status: 201 });
  }

  if (!itemId) return bad("Missing id");
  const note = await prisma.violationNote.findFirst({ where: { id: itemId, violationId, deletedAt: null } });
  if (!note) return bad("Not found", 404);
  if (!access.isHead && note.authorId !== access.userId) return bad("Forbidden", 403);
  if (!access.isHead && note.confidential) return bad("Forbidden", 403);

  if (method === "PATCH") {
    const text = str(body.body);
    if (!text) return bad("Walang laman ang note");
    const updated = await prisma.violationNote.update({ where: { id: itemId }, data: { body: text } });
    return NextResponse.json({ note: updated });
  }
  await prisma.violationNote.update({ where: { id: itemId }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}

// Typed so that writing a field that is not a ParentContact column fails at
// compile time instead of as a Prisma error at runtime.
type ContactFields = Partial<
  Pick<Prisma.ParentContactUncheckedCreateInput,
    "method" | "attendance" | "contactPerson" | "relationship" | "contactedBy" | "contactedAt">
>;

function contactData(
  body: Record<string, unknown>
): { data: ContactFields } | { error: string } {
  const data: ContactFields = {};
  if ("method" in body) {
    if (!METHODS.includes(body.method as string)) return { error: "Invalid method" };
    data.method = body.method as string;
  }
  if ("attendance" in body) {
    if (!ATTENDANCE.includes(body.attendance as string)) return { error: "Invalid attendance" };
    data.attendance = body.attendance as string;
  }
  // remarks, complianceStatus, compliedAt and complianceDeadline are not
  // columns on ParentContact, so they are not written (Prisma would reject them).
  if ("contactPerson" in body) data.contactPerson = str(body.contactPerson);
  if ("relationship" in body) data.relationship = str(body.relationship);
  if ("contactedBy" in body) data.contactedBy = str(body.contactedBy);
  if ("contactedAt" in body) {
    const d = date(body.contactedAt);
    if (d === undefined) return { error: "Invalid date: contactedAt" };
    if (d !== null) data.contactedAt = d; // may default na sa DB
  }
  return { data };
}