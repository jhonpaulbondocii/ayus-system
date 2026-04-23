// src/app/api/courses/[id]/assignments/[assignmentId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

function parseDateWithTime(
  date: string | null | undefined,
  time: string | null | undefined
): Date | null {
  if (!date) return null;
  const combined = time ? `${date} ${time}` : date;
  const parsed = new Date(combined);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const fallback = new Date(date);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

type SubmissionEntry = {
  id:       string;
  label:    string;
  required: boolean;
  type:     string;
};

function parseSubmissionEntries(opts: string[]): SubmissionEntry[] | undefined {
  if (!opts || opts.length === 0) return undefined;
  try {
    const first = JSON.parse(opts[0]) as unknown;
    if (first && typeof first === "object" && "id" in (first as object)) {
      const results: SubmissionEntry[] = [];
      for (const o of opts) {
        try { results.push(JSON.parse(o) as SubmissionEntry); }
        catch { /* skip malformed */ }
      }
      return results.length > 0 ? results : undefined;
    }
  } catch { /* plain strings */ }
  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET  /api/courses/[id]/assignments/[assignmentId]
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const { id: courseId, assignmentId } = await params;

  // ── Use requireCoursePermission consistently (fixes Head role detection) ──
  const access = await requireCoursePermission(courseId, "view_course");
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const userId   = access.userId;
  const canManage =
    access.systemRole === "ADMIN" || access.courseRole === "Head";

  // ── Fetch assignment ───────────────────────────────────────────────────────
  // Heads/Admins can see PUBLISHED + UNPUBLISHED; Staff only PUBLISHED
  const assignment = await prisma.assignment.findFirst({
    where: {
      id:       assignmentId,
      courseId,
      // Staff can only see published assignments
      ...(canManage ? {} : { status: "PUBLISHED" }),
    },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  // ── For Staff: check assignees field ──────────────────────────────────────
  if (!canManage) {
    const assignees = assignment.assignees ?? [];

    if (assignees.length > 0 && !assignees.includes("Everyone")) {
      // Resolve user details for section / role matching
      const enrollment = await prisma.courseEnrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
        select: { section: true, courseRole: true },
      });
      const user = await prisma.user.findUnique({
        where:  { id: userId },
        select: { name: true },
      });

      const displayName  = user?.name            ?? "";
      const section      = enrollment?.section   ?? "";
      const courseRole   = enrollment?.courseRole ?? "";

      const allowed =
        assignees.includes(userId)       ||
        (displayName && assignees.includes(displayName)) ||
        (section     && assignees.includes(section))     ||
        (courseRole  && assignees.includes(courseRole));

      if (!allowed) {
        return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
      }
    }
  }

  // ── Fetch submission ───────────────────────────────────────────────────────
  const submission = await prisma.submission.findUnique({
    where: { userId_assignmentId: { userId, assignmentId } },
    select: {
      id:          true,
      status:      true,
      grade:       true,
      submittedAt: true,
      fileUrl:     true,
      feedback:    true,
      textEntry:   true,
      websiteUrl:  true,
      comments:    true,
    },
  });

  const attemptCount = await prisma.submission.count({
    where: { assignmentId, userId },
  });

  const submissionEntries = parseSubmissionEntries(assignment.onlineEntryOptions);

  return NextResponse.json({
    assignment: {
      ...assignment,
      onlineEntryOptions: submissionEntries ? [] : assignment.onlineEntryOptions,
      ...(submissionEntries ? { submissionEntries } : {}),
      submissions: submission ? [submission] : [],
    },
    attemptCount,
    viewer: {
      systemRole:           access.systemRole,
      courseRole:           access.courseRole,
      canManageAssignments: canManage,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH  /api/courses/[id]/assignments/[assignmentId]
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const { id: courseId, assignmentId } = await params;

  const access = await requireCoursePermission(courseId, "manage_assignments");
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const data = await req.json() as Record<string, unknown>;

  const existing = await prisma.assignment.findFirst({
    where: { id: assignmentId, courseId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  let patchedOnlineEntryOptions: string[] | undefined;
  if (
    Array.isArray(data.submissionEntries) &&
    (data.submissionEntries as unknown[]).length > 0
  ) {
    patchedOnlineEntryOptions = (data.submissionEntries as SubmissionEntry[]).map(e =>
      JSON.stringify({
        id:       e.id,
        label:    e.label    ?? "",
        required: e.required ?? false,
        type:     e.type     ?? "File Upload",
      })
    );
  } else if (Array.isArray(data.onlineEntryOptions)) {
    patchedOnlineEntryOptions = data.onlineEntryOptions as string[];
  }

  const assignment = await prisma.assignment.update({
    where: { id: assignmentId },
    data: {
      ...(data.title              !== undefined && { title:              data.title as string }),
      ...(data.description        !== undefined && { description:        data.description as string }),
      ...(data.points             !== undefined && { points:             data.points as number }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(data.status             !== undefined && { status:             data.status as any }),
      ...(data.submissionType     !== undefined && { submissionType:     data.submissionType as string }),
      ...(data.assignmentGroup    !== undefined && { assignmentGroup:    data.assignmentGroup as string }),
      ...(data.displayGradeAs     !== undefined && { displayGradeAs:     data.displayGradeAs as string }),
      ...(patchedOnlineEntryOptions              && { onlineEntryOptions: patchedOnlineEntryOptions }),
      ...(data.allowedAttempts    !== undefined && { allowedAttempts:    data.allowedAttempts as number }),
      ...(data.submissionAttempts !== undefined && { submissionAttempts: data.submissionAttempts as string }),
      ...(data.doNotCount         !== undefined && { doNotCount:         data.doNotCount as boolean }),
      ...(data.isGroupAssignment  !== undefined && { isGroupAssignment:  data.isGroupAssignment as boolean }),
      ...(data.notifyUsers        !== undefined && { notifyUsers:        data.notifyUsers as boolean }),
      ...(data.dueDate            !== undefined && {
        dueDate: parseDateWithTime(
          data.dueDate as string,
          (data.dueTime as string) ?? null
        ),
      }),
      ...(data.availableFrom !== undefined && {
        availableFrom: parseDateWithTime(
          data.availableFrom as string,
          (data.availableFromTime as string) ?? null
        ),
      }),
      ...(data.availableUntil !== undefined && {
        availableUntil: parseDateWithTime(
          data.availableUntil as string,
          (data.untilTime as string) ?? null
        ),
      }),
      ...(data.assignees !== undefined && {
        assignees: Array.isArray(data.assignees)
          ? (data.assignees as string[]).includes("Everyone")
            ? []
            : (data.assignees as string[])
          : [],
      }),
    },
  });

  return NextResponse.json({
    assignment,
    viewer: {
      systemRole: access.systemRole,
      courseRole: access.courseRole,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE  /api/courses/[id]/assignments/[assignmentId]
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const { id: courseId, assignmentId } = await params;

  const access = await requireCoursePermission(courseId, "manage_assignments");
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const existing = await prisma.assignment.findFirst({
    where: { id: assignmentId, courseId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  await prisma.assignment.delete({ where: { id: assignmentId } });

  return NextResponse.json({
    success: true,
    viewer: {
      systemRole: access.systemRole,
      courseRole: access.courseRole,
    },
  });
}