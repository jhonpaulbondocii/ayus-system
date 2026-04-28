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
  id: string | number;
  label?: string;
  required?: boolean;
  type?: string;
  allowedFileTypes?: string[];
  maxFiles?: number | null;
};

function parseSubmissionEntries(opts: string[]): SubmissionEntry[] | undefined {
  if (!opts || opts.length === 0) return undefined;

  const entries: SubmissionEntry[] = [];

  for (const opt of opts) {
    try {
      const parsed = JSON.parse(opt) as SubmissionEntry;

      if (parsed && typeof parsed === "object" && "id" in parsed) {
        entries.push(parsed);
      }
    } catch {
      return undefined;
    }
  }

  return entries.length > 0 ? entries : undefined;
}

function normalizeSubmissionEntries(entries?: SubmissionEntry[]): string[] {
  if (!Array.isArray(entries)) return [];

  return entries.map((entry) =>
    JSON.stringify({
      id: entry.id,
      label: entry.label ?? "",
      required: entry.required ?? false,
      type: entry.type ?? "File Upload",

      // IMPORTANT: save file restrictions
      allowedFileTypes:
        entry.type === "File Upload" ? entry.allowedFileTypes ?? [] : [],

      maxFiles:
        entry.type === "File Upload" ? entry.maxFiles ?? 1 : null,
    })
  );
}

function normalizeAssignees(assignees: unknown): string[] {
  if (!Array.isArray(assignees)) return [];
  if (assignees.includes("Everyone")) return [];
  return assignees.filter((a): a is string => typeof a === "string" && !!a);
}

function isAssignedToUser(args: {
  assignees: string[];
  userId: string;
  userName: string;
  userEmail: string;
  userSection: string;
  userCourseRole: string;
}) {
  const {
    assignees,
    userId,
    userName,
    userEmail,
    userSection,
    userCourseRole,
  } = args;

  if (!assignees || assignees.length === 0) return true;
  if (assignees.includes("Everyone")) return true;

  return (
    assignees.includes(userId) ||
    (!!userName && assignees.includes(userName)) ||
    (!!userEmail && assignees.includes(userEmail)) ||
    (!!userSection && assignees.includes(userSection)) ||
    (!!userCourseRole && assignees.includes(userCourseRole))
  );
}

function isExplicitlyAssignedToUser(args: {
  assignees: string[];
  userId: string;
  userName: string;
  userEmail: string;
  userSection: string;
  userCourseRole: string;
}) {
  const explicitAssignees = (args.assignees ?? []).filter(
    (a) => a && a !== "Everyone"
  );

  if (explicitAssignees.length === 0) return false;

  return isAssignedToUser({
    ...args,
    assignees: explicitAssignees,
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const { id: courseId, assignmentId } = await params;

  const access = await requireCoursePermission(courseId, "view_course");

  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  const userId = access.userId;
  const isAdmin = access.systemRole === "ADMIN";
  const isHead = access.courseRole === "Head";
  const canManage = isAdmin || isHead;

  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      courseId,
      ...(canManage ? {} : { status: "PUBLISHED" }),
    },
  });

  if (!assignment) {
    return NextResponse.json(
      { error: "Assignment not found" },
      { status: 404 }
    );
  }

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
    select: {
      section: true,
      courseRole: true,
    },
  });

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
    },
  });

  const userName = currentUser?.name ?? "";
  const userEmail = currentUser?.email ?? "";
  const userSection = enrollment?.section ?? "";
  const userCourseRole = enrollment?.courseRole ?? access.courseRole ?? "";

  const assignedToYou = isAssignedToUser({
    assignees: assignment.assignees,
    userId,
    userName,
    userEmail,
    userSection,
    userCourseRole,
  });

  if (!canManage && !assignedToYou) {
    return NextResponse.json(
      { error: "Assignment not found" },
      { status: 404 }
    );
  }

  const isCreator = !!assignment.createdById && assignment.createdById === userId;

  const explicitlyAssignedToYou = isExplicitlyAssignedToUser({
    assignees: assignment.assignees,
    userId,
    userName,
    userEmail,
    userSection,
    userCourseRole,
  });

  let assignmentRole: "manager" | "submitter";

  if (isAdmin) {
    assignmentRole = "manager";
  } else if (isCreator) {
    assignmentRole = "manager";
  } else {
    assignmentRole = "submitter";
  }

  const creator = assignment.createdById
    ? await prisma.user.findUnique({
        where: { id: assignment.createdById },
        select: {
          id: true,
          name: true,
          image: true,
          role: true,
        },
      })
    : null;

  const submission = await prisma.submission.findUnique({
    where: {
      userId_assignmentId: {
        userId,
        assignmentId,
      },
    },
    select: {
      id: true,
      status: true,
      grade: true,
      submittedAt: true,
      fileUrl: true,
      feedback: true,
      textEntry: true,
      websiteUrl: true,
      comments: true,
    },
  });

  const attemptCount = await prisma.submission.count({
    where: {
      assignmentId,
      userId,
    },
  });

  const submissionEntries = parseSubmissionEntries(
    assignment.onlineEntryOptions
  );

  return NextResponse.json({
    assignment: {
      ...assignment,
      onlineEntryOptions: submissionEntries
        ? []
        : assignment.onlineEntryOptions,
      ...(submissionEntries ? { submissionEntries } : {}),
      submissions: submission ? [submission] : [],

      isCreator,
      isAssignedToYou: assignedToYou && !isCreator,

      _assignmentRole: assignmentRole,
      _isAssignedToYou: assignedToYou && !isCreator,
      _isExplicitlyAssignedToYou: explicitlyAssignedToYou,

      _publisherId: assignment.createdById ?? null,
      _publisherName: creator?.name ?? null,
      _publisherImage: creator?.image ?? null,
      _publisherRole: creator?.role ?? null,
    },
    attemptCount,
    viewer: {
      systemRole: access.systemRole,
      courseRole: access.courseRole,
      canManageAssignments: canManage,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const { id: courseId, assignmentId } = await params;

  const access = await requireCoursePermission(courseId, "manage_assignments");

  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  const data = (await req.json()) as Record<string, unknown>;

  const existing = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      courseId,
    },
    select: {
      id: true,
      createdById: true,
    },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Assignment not found" },
      { status: 404 }
    );
  }

  let patchedOnlineEntryOptions: string[] | undefined;

  if (
    Array.isArray(data.submissionEntries) &&
    data.submissionEntries.length > 0
  ) {
    patchedOnlineEntryOptions = normalizeSubmissionEntries(
      data.submissionEntries as SubmissionEntry[]
    );
  } else if (Array.isArray(data.onlineEntryOptions)) {
    patchedOnlineEntryOptions = data.onlineEntryOptions as string[];
  }

  const assignment = await prisma.assignment.update({
    where: {
      id: assignmentId,
    },
    data: {
      ...(data.title !== undefined && {
        title: data.title as string,
      }),
      ...(data.description !== undefined && {
        description: data.description as string,
      }),
      ...(data.points !== undefined && {
        points: parseFloat(String(data.points)) || 0,
      }),
      ...(data.status !== undefined && {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: data.status as any,
      }),
      ...(data.submissionType !== undefined && {
        submissionType: data.submissionType as string,
      }),
      ...(data.assignmentGroup !== undefined && {
        assignmentGroup: data.assignmentGroup as string,
      }),
      ...(data.displayGradeAs !== undefined && {
        displayGradeAs: data.displayGradeAs as string,
      }),
      ...(patchedOnlineEntryOptions !== undefined && {
        onlineEntryOptions: patchedOnlineEntryOptions,
      }),
      ...(data.allowedAttempts !== undefined && {
        allowedAttempts:
          data.allowedAttempts === null
            ? null
            : Number(data.allowedAttempts),
      }),
      ...(data.submissionAttempts !== undefined && {
        submissionAttempts: data.submissionAttempts as string,
      }),
      ...(data.doNotCount !== undefined && {
        doNotCount: Boolean(data.doNotCount),
      }),
      ...(data.isGroupAssignment !== undefined && {
        isGroupAssignment: Boolean(data.isGroupAssignment),
      }),
      ...(data.groupSetId !== undefined && {
        groupSetId: data.groupSetId as string | null,
      }),
      ...(data.requirePeerReviews !== undefined && {
        requirePeerReviews: Boolean(data.requirePeerReviews),
      }),
      ...(data.anonymousGrading !== undefined && {
        anonymousGrading: Boolean(data.anonymousGrading),
      }),
      ...(data.peerReviewAssign !== undefined && {
        peerReviewAssign: data.peerReviewAssign as string,
      }),
      ...(data.peerReviewAnonymous !== undefined && {
        peerReviewAnonymous: Boolean(data.peerReviewAnonymous),
      }),
      ...(data.notifyUsers !== undefined && {
        notifyUsers: Boolean(data.notifyUsers),
      }),
      ...(data.dueDate !== undefined && {
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
        assignees: normalizeAssignees(data.assignees),
      }),

      createdById: existing.createdById ?? access.userId,
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const { id: courseId, assignmentId } = await params;

  const access = await requireCoursePermission(courseId, "manage_assignments");

  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  const existing = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      courseId,
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Assignment not found" },
      { status: 404 }
    );
  }

  await prisma.assignment.delete({
    where: {
      id: assignmentId,
    },
  });

  return NextResponse.json({
    success: true,
    viewer: {
      systemRole: access.systemRole,
      courseRole: access.courseRole,
    },
  });
}