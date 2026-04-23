// src/app/api/courses/[id]/assignments/route.ts

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

function parseSubmissionEntries(opts: string[]): {
  id: string; label: string; required: boolean; type: string;
}[] | undefined {
  if (!opts || opts.length === 0) return undefined;
  try {
    const first = JSON.parse(opts[0]);
    if (first && typeof first === "object" && "id" in first) {
      return opts.map(o => {
        try { return JSON.parse(o) as { id: string; label: string; required: boolean; type: string }; }
        catch { return null; }
      }).filter((x): x is { id: string; label: string; required: boolean; type: string } => x !== null);
    }
  } catch { /* plain strings — legacy */ }
  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET  /api/courses/[id]/assignments
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: courseId } = await params;

  const access = await requireCoursePermission(courseId, "view_course");
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const userId = access.userId;
  const canManage =
    access.systemRole === "ADMIN" || access.courseRole === "Head";

  const allAssignments = await prisma.assignment.findMany({
    where: {
      courseId,
      // Use plain string — Prisma accepts it for String-backed enums at runtime
      ...(canManage ? {} : { status: "PUBLISHED" }),
    },
    select: {
      id: true,
      title: true,
      description: true,
      dueDate: true,
      availableFrom: true,
      availableUntil: true,
      points: true,
      status: true,
      submissionType: true,
      assignmentGroup: true,
      onlineEntryOptions: true,
      allowedAttempts: true,
      submissionAttempts: true,
      assignees: true,
      submissions: {
        where: { userId },
        select: {
          id: true,
          status: true,
          grade: true,
          submittedAt: true,
          fileUrl: true,
        },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  let userDisplayName = "";
  let userSection = "";
  let userCourseRole = access.courseRole ?? "";

  if (!canManage) {
    const enrollment = await prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { section: true, courseRole: true },
    });
    userSection    = enrollment?.section    ?? "";
    userCourseRole = enrollment?.courseRole ?? userCourseRole;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    userDisplayName = user?.name ?? "";
  }

  const assignments = canManage
    ? allAssignments
    : allAssignments.filter(a => {
        const assignees = a.assignees ?? [];
        if (assignees.length === 0 || assignees.includes("Everyone")) return true;
        if (userDisplayName && assignees.includes(userDisplayName))    return true;
        if (userSection      && assignees.includes(userSection))        return true;
        if (userCourseRole   && assignees.includes(userCourseRole))     return true;
        if (assignees.includes(userId))                                 return true;
        return false;
      });

  const sanitized = assignments.map(({ assignees: _assignees, onlineEntryOptions, ...rest }) => {
    const entries = parseSubmissionEntries(onlineEntryOptions);
    return {
      ...rest,
      onlineEntryOptions: entries ? [] : onlineEntryOptions,
      ...(entries ? { submissionEntries: entries } : {}),
    };
  });

  return NextResponse.json({
    assignments: sanitized,
    viewer: {
      systemRole: access.systemRole,
      courseRole: access.courseRole,
      canManageAssignments: canManage,
      canSubmitAssignments:
        access.systemRole === "ADMIN" ||
        access.courseRole === "Head"  ||
        access.courseRole === "Staff",
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST  /api/courses/[id]/assignments
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;

    const access = await requireCoursePermission(courseId, "manage_assignments");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json() as {
      title?: string;
      description?: string;
      points?: number | string;
      submissionType?: string;
      assignmentGroup?: string;
      displayGradeAs?: string;
      onlineEntryOptions?: string[];
      submissionEntries?: {
        id: string;
        label: string;
        required: boolean;
        type: string;
      }[];
      allowedAttempts?: number | null;
      submissionAttempts?: string;
      doNotCount?: boolean;
      isGroupAssignment?: boolean;
      groupSetId?: string | null;
      notifyUsers?: boolean;
      dueDate?: string;
      dueTime?: string;
      availableFrom?: string;
      availableFromTime?: string;
      availableUntil?: string;
      untilTime?: string;
      assignees?: string[];
      // status is a plain string from the client ("PUBLISHED" | "UNPUBLISHED")
      status?: string;
    };

    const {
      title,
      description,
      points,
      submissionType,
      assignmentGroup,
      displayGradeAs,
      submissionEntries,
      allowedAttempts,
      submissionAttempts,
      doNotCount,
      isGroupAssignment,
      groupSetId,
      notifyUsers,
      dueDate,
      dueTime,
      availableFrom,
      availableFromTime,
      availableUntil,
      untilTime,
      assignees,
      status,
    } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (submissionType === "Online") {
      const hasEntries    = Array.isArray(submissionEntries)        && submissionEntries.length > 0;
      const hasLegacyOpts = Array.isArray(body.onlineEntryOptions)  && body.onlineEntryOptions.length > 0;
      if (!hasEntries && !hasLegacyOpts) {
        return NextResponse.json(
          { error: "At least one submission entry is required" },
          { status: 400 }
        );
      }
    }

    let resolvedOnlineEntryOptions: string[] = [];

    if (Array.isArray(submissionEntries) && submissionEntries.length > 0) {
      resolvedOnlineEntryOptions = submissionEntries.map(e => JSON.stringify({
        id:       e.id,
        label:    e.label    ?? "",
        required: e.required ?? false,
        type:     e.type     ?? "File Upload",
      }));
    } else if (Array.isArray(body.onlineEntryOptions)) {
      resolvedOnlineEntryOptions = body.onlineEntryOptions;
    }

    const resolvedAssignees: string[] =
      !assignees ||
      !Array.isArray(assignees) ||
      assignees.length === 0 ||
      assignees.includes("Everyone")
        ? []
        : assignees;

    const assignment = await prisma.assignment.create({
      data: {
        courseId,
        title:              title.trim(),
        description:        description        ?? null,
        points:             parseFloat(String(points)) || 0,
        submissionType:     submissionType     ?? "Online",
        assignmentGroup:    assignmentGroup    ?? "Assignments",
        displayGradeAs:     displayGradeAs     ?? "Points",
        onlineEntryOptions: resolvedOnlineEntryOptions,
        allowedAttempts:    allowedAttempts    ?? null,
        submissionAttempts: submissionAttempts ?? "Unlimited",
        doNotCount:         doNotCount         ?? false,
        isGroupAssignment:  isGroupAssignment  ?? false,
        groupSetId:         groupSetId         ?? null,
        notifyUsers:        notifyUsers        ?? false,
        // Cast to any to satisfy Prisma's enum type — the value is always a valid
        // CourseStatus string ("PUBLISHED" | "UNPUBLISHED") from the client.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status:             (status ?? "UNPUBLISHED") as any,
        dueDate:            parseDateWithTime(dueDate, dueTime),
        availableFrom:      parseDateWithTime(availableFrom, availableFromTime),
        availableUntil:     parseDateWithTime(availableUntil, untilTime),
        assignees:          resolvedAssignees,
      },
    });

    return NextResponse.json({
      assignment,
      viewer: {
        systemRole: access.systemRole,
        courseRole: access.courseRole,
      },
    });
  } catch (err) {
    console.error("[POST /api/courses/[id]/assignments]", err);
    return NextResponse.json(
      { error: "Failed to create assignment" },
      { status: 500 }
    );
  }
}