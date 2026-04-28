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

function normalizeAssignees(assignees?: string[]): string[] {
  if (!Array.isArray(assignees)) return [];
  if (assignees.includes("Everyone")) return [];
  return assignees.filter(Boolean);
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: courseId } = await params;

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

  const allAssignments = await prisma.assignment.findMany({
    where: {
      courseId,
      ...(isAdmin || isHead ? {} : { status: "PUBLISHED" }),
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
      displayGradeAs: true,
      onlineEntryOptions: true,
      allowedAttempts: true,
      submissionAttempts: true,
      doNotCount: true,
      isGroupAssignment: true,
      groupSetId: true,
      requirePeerReviews: true,
      anonymousGrading: true,
      peerReviewAssign: true,
      peerReviewAnonymous: true,
      notifyUsers: true,
      assignees: true,
      createdById: true,
      createdAt: true,
      updatedAt: true,
      submissions: {
        where: { userId },
        select: {
          id: true,
          status: true,
          grade: true,
          submittedAt: true,
          fileUrl: true,
          textEntry: true,
          websiteUrl: true,
          comments: true,
          feedback: true,
        },
      },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });

  const creatorIds = Array.from(
    new Set(
      allAssignments
        .map((a) => a.createdById)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  );

  const creators = creatorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: creatorIds } },
        select: {
          id: true,
          name: true,
          image: true,
          role: true,
        },
      })
    : [];

  const creatorMap = new Map(creators.map((u) => [u.id, u]));

  const assignments = allAssignments
    .filter((assignment) => {
      const assignedToCurrentUser = isAssignedToUser({
        assignees: assignment.assignees,
        userId,
        userName,
        userEmail,
        userSection,
        userCourseRole,
      });

      if (isAdmin || isHead) return true;

      return assignedToCurrentUser;
    })
    .map((assignment) => {
      const { assignees, onlineEntryOptions, createdById, ...rest } =
        assignment;

      const entries = parseSubmissionEntries(onlineEntryOptions);

      const isCreator = !!createdById && createdById === userId;

      const assignedToYou = isAssignedToUser({
        assignees,
        userId,
        userName,
        userEmail,
        userSection,
        userCourseRole,
      });

      const explicitlyAssignedToYou = isExplicitlyAssignedToUser({
        assignees,
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

      const creator = createdById ? creatorMap.get(createdById) : null;

      return {
        ...rest,
        createdById,
        assignees,

        onlineEntryOptions: entries ? [] : onlineEntryOptions,
        ...(entries ? { submissionEntries: entries } : {}),

        isCreator,
        isAssignedToYou: assignedToYou && !isCreator,

        _assignmentRole: assignmentRole,
        _isAssignedToYou: assignedToYou && !isCreator,
        _isExplicitlyAssignedToYou: explicitlyAssignedToYou,

        _publisherId: createdById ?? null,
        _publisherName: creator?.name ?? null,
        _publisherImage: creator?.image ?? null,
        _publisherRole: creator?.role ?? null,
      };
    });

  return NextResponse.json({
    assignments,
    viewer: {
      systemRole: access.systemRole,
      courseRole: access.courseRole,
      canManageAssignments: isAdmin || isHead,
      canSubmitAssignments: true,
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;

    const access = await requireCoursePermission(courseId, "manage_assignments");

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const body = (await req.json()) as {
      title?: string;
      description?: string;
      points?: number | string;
      submissionType?: string;
      assignmentGroup?: string;
      displayGradeAs?: string;
      onlineEntryOptions?: string[];
      submissionEntries?: SubmissionEntry[];
      allowedAttempts?: number | null;
      submissionAttempts?: string;
      doNotCount?: boolean;
      isGroupAssignment?: boolean;
      groupSetId?: string | null;
      requirePeerReviews?: boolean;
      anonymousGrading?: boolean;
      peerReviewAssign?: string;
      peerReviewAnonymous?: boolean;
      notifyUsers?: boolean;
      dueDate?: string;
      dueTime?: string;
      availableFrom?: string;
      availableFromTime?: string;
      availableUntil?: string;
      untilTime?: string;
      assignees?: string[];
      status?: string;
    };

    if (!body.title?.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    let resolvedOnlineEntryOptions: string[] = [];

    if (
      Array.isArray(body.submissionEntries) &&
      body.submissionEntries.length > 0
    ) {
      resolvedOnlineEntryOptions = normalizeSubmissionEntries(
        body.submissionEntries
      );
    } else if (Array.isArray(body.onlineEntryOptions)) {
      resolvedOnlineEntryOptions = body.onlineEntryOptions;
    }

    const assignment = await prisma.assignment.create({
      data: {
        courseId,
        title: body.title.trim(),
        description: body.description ?? null,
        points: parseFloat(String(body.points ?? 0)) || 0,
        submissionType: body.submissionType ?? "Online",
        assignmentGroup: body.assignmentGroup ?? "Assignments",
        displayGradeAs: body.displayGradeAs ?? "Points",
        onlineEntryOptions: resolvedOnlineEntryOptions,
        allowedAttempts: body.allowedAttempts ?? null,
        submissionAttempts: body.submissionAttempts ?? "Unlimited",
        doNotCount: body.doNotCount ?? false,
        isGroupAssignment: body.isGroupAssignment ?? false,
        groupSetId: body.groupSetId ?? null,
        requirePeerReviews: body.requirePeerReviews ?? false,
        anonymousGrading: body.anonymousGrading ?? false,
        peerReviewAssign: body.peerReviewAssign ?? "manually",
        peerReviewAnonymous: body.peerReviewAnonymous ?? false,
        notifyUsers: body.notifyUsers ?? false,
        createdById: access.userId,
        assignees: normalizeAssignees(body.assignees),

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: (body.status ?? "UNPUBLISHED") as any,
        dueDate: parseDateWithTime(body.dueDate, body.dueTime),
        availableFrom: parseDateWithTime(
          body.availableFrom,
          body.availableFromTime
        ),
        availableUntil: parseDateWithTime(
          body.availableUntil,
          body.untilTime
        ),
      },
    });

    return NextResponse.json({
      assignment: {
        ...assignment,
        isCreator: true,
        isAssignedToYou: false,
        _assignmentRole: "manager",
        _isAssignedToYou: false,
        _isExplicitlyAssignedToYou: false,
        _publisherId: access.userId,
      },
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