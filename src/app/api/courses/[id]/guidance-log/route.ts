// src/app/api/courses/[id]/guidance-log/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const { searchParams } = new URL(req.url);
    const search   = searchParams.get("search")?.trim() ?? "";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo   = searchParams.get("dateTo");
    const course_  = searchParams.get("course")?.trim() ?? "";

    const entries = await prisma.guidanceLogEntry.findMany({
      where: {
        courseId,
        ...(course_ ? { department: course_ } : {}),
        ...(dateFrom || dateTo ? {
          visitDate: {
            ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00+08:00`) } : {}),
            ...(dateTo   ? { lte: new Date(`${dateTo}T23:59:59+08:00`)   } : {}),
          },
        } : {}),
        ...(search ? {
          OR: [
            { name:       { contains: search, mode: "insensitive" } },
            { department: { contains: search, mode: "insensitive" } },
          ],
        } : {}),
      },
      orderBy: { visitDate: "desc" },
    });

    return NextResponse.json({ entries });
  } catch (err) {
    console.error("[GET /guidance-log]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const body = await req.json();
    const { name, department, sex, purpose, visitDate, isManual, email, studentId } = body;

    if (!studentId && !name?.trim()) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    // If studentId provided, lookup student from DB
    let resolvedName       = name?.trim();
    let resolvedDept       = department?.trim() || null;
    let resolvedSex        = sex?.trim()        || null;
    let resolvedEmail      = email?.trim()      || null;

    if (studentId) {
      const student = await prisma.student.findUnique({ where: { id: studentId } });
      if (!student) {
        return NextResponse.json({ error: "Student not found." }, { status: 404 });
      }
      resolvedName  = student.name;
      resolvedDept  = student.course  ?? resolvedDept;
      resolvedSex   = student.gender  ?? resolvedSex;
      resolvedEmail = student.email   ?? resolvedEmail;
    }

    const entry = await prisma.guidanceLogEntry.create({
      data: {
        courseId,
        name:       resolvedName,
        department: resolvedDept,
        sex:        resolvedSex,
        email:      resolvedEmail,
        purpose:    purpose?.trim() || "Counseling",
        visitDate:  visitDate ? new Date(visitDate) : new Date(),
        recordedBy: access.userId,
      },
    });

    // Send signature request email if email is available
    let signEmailSentAt: Date | null = null;
    if (resolvedEmail) {
      try {
        const { generateSignToken, signTokenExpiry } = await import("@/lib/sign-token");
        const { sendGuidanceSignatureRequestEmail }   = await import("@/lib/email");

        const signToken = generateSignToken();
        const expiresAt = signTokenExpiry(7);

        await prisma.guidanceLogEntry.update({
          where: { id: entry.id },
          data:  { signToken, signTokenExpiresAt: expiresAt },
        });

        await sendGuidanceSignatureRequestEmail({
          to:        resolvedEmail,
          name:      resolvedName,
          visitDate: (visitDate ? new Date(visitDate) : new Date()).toISOString(),
          purpose:   purpose?.trim() || "Counseling",
          signToken,
        });

        signEmailSentAt = new Date();
        await prisma.guidanceLogEntry.update({
          where: { id: entry.id },
          data:  { signEmailSentAt },
        });
      } catch (emailErr) {
        console.error("[POST /guidance-log] Failed to send signature email:", emailErr);
      }
    }

    return NextResponse.json({ entry: { ...entry, signEmailSentAt } }, { status: 201 });
  } catch (err) {
    console.error("[POST /guidance-log]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const { searchParams } = new URL(req.url);
    const entryId = searchParams.get("entryId");
    if (!entryId) return NextResponse.json({ error: "entryId required." }, { status: 400 });

    await prisma.guidanceLogEntry.delete({ where: { id: entryId, courseId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /guidance-log]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}