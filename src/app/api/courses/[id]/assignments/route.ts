import { NextRequest, NextResponse } from "next/server";
import { CourseStatus } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

function parseDateWithTime(
  date: string | null | undefined,
  time: string | null | undefined
): Date | null {
  if (!date) return null;
  const parsed = new Date(time ? `${date} ${time}` : date);
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

function normalizeFileTypes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.replace(".", "").trim().toLowerCase())
    .filter(Boolean);
}

function parseSubmissionEntries(opts: string[]): SubmissionEntry[] | undefined {
  if (!opts || opts.length === 0) return undefined;
  const entries: SubmissionEntry[] = [];
  for (const opt of opts) {
    let parsed: unknown;
    try { parsed = JSON.parse(opt); } catch { continue; }
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && "id" in (parsed as object)) {
      const entry = parsed as SubmissionEntry;
      entries.push({
        id: entry.id,
        label: entry.label ?? "",
        required: entry.required ?? false,
        type: entry.type ?? "File Upload",
        allowedFileTypes: normalizeFileTypes(entry.allowedFileTypes),
        maxFiles: entry.type === "File Upload" ? entry.maxFiles ?? 1 : null,
      });
    }
  }
  return entries.length > 0 ? entries : undefined;
}

function normalizeSubmissionEntries(entries?: SubmissionEntry[]): string[] {
  if (!Array.isArray(entries)) return [];
  return entries.map((entry, index) => {
    const type = entry.type ?? "File Upload";
    return JSON.stringify({
      id: entry.id,
      label: entry.label?.trim() || `Submission ${index + 1}`,
      required: entry.required ?? false,
      type,
      allowedFileTypes: type === "File Upload" ? normalizeFileTypes(entry.allowedFileTypes) : [],
      maxFiles: type === "File Upload" ? entry.maxFiles ?? 1 : null,
    });
  });
}

function normalizeAssignees(assignees: unknown): string[] {
  if (!Array.isArray(assignees)) return [];
  if (assignees.includes("Everyone")) return [];
  return assignees.filter((a): a is string => typeof a === "string" && !!a);
}

function normalizeStatus(status: unknown): CourseStatus | undefined {
  if (status === "PUBLISHED") return CourseStatus.PUBLISHED;
  if (status === "UNPUBLISHED") return CourseStatus.UNPUBLISHED;
  return undefined;
}

function isAssignedToUser(args: {
  assignees: string[];
  userId: string;
  userName: string;
  userEmail: string;
  userSection: string;
  userCourseRole: string;
}) {
  const { assignees, userId, userName, userEmail, userSection, userCourseRole } = args;
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
  const explicitAssignees = (args.assignees ?? []).filter((a) => a && a !== "Everyone");
  if (explicitAssignees.length === 0) return false;
  return isAssignedToUser({ ...args, assignees: explicitAssignees });
}

function getRoleType(courseRole: string): "headOnly" | "both" | "staffOnly" {
  const roles = courseRole.split(",").map((r) => r.trim().toLowerCase());
  const hasHead = roles.includes("head");
  const hasStaff = roles.includes("staff");
  if (hasHead && hasStaff) return "both";
  if (hasHead) return "headOnly";
  return "staffOnly";
}

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
  const isAdmin = access.systemRole === "ADMIN";

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { section: true, courseRole: true },
  });

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  const userName = currentUser?.name ?? "";
  const userEmail = currentUser?.email ?? "";
  const userSection = enrollment?.section ?? "";
  const userCourseRole = enrollment?.courseRole ?? access.courseRole ?? "";

  const roleType = isAdmin ? "admin" : getRoleType(userCourseRole);
  const isHead = roleType === "headOnly" || roleType === "both";

  const allAssignments = await prisma.assignment.findMany({
    where: {
      courseId,
      ...(isAdmin || isHead ? {} : { status: CourseStatus.PUBLISHED }),
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

  const creators =
    creatorIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: creatorIds } },
          select: { id: true, name: true, image: true, role: true },
        })
      : [];

  const creatorMap = new Map(creators.map((c) => [c.id, c]));

  const creatorEnrollments =
    creatorIds.length > 0
      ? await prisma.courseEnrollment.findMany({
          where: { courseId, userId: { in: creatorIds } },
          select: { userId: true, courseRole: true },
        })
      : [];

  const creatorCourseRoleMap = new Map(
    creatorEnrollments.map((e) => [e.userId, e.courseRole])
  );

  const assignments = allAssignments
    .filter((assignment) => {
      const isCreator = assignment.createdById === userId;
      const assignedToYou = isAssignedToUser({
        assignees: assignment.assignees,
        userId,
        userName,
        userEmail,
        userSection,
        userCourseRole,
      });

      // Check if the creator is a system Admin
      const creatorInfo = assignment.createdById
        ? creatorMap.get(assignment.createdById)
        : null;
      const creatorIsAdmin = creatorInfo?.role === "ADMIN";

      if (roleType === "admin") return true;

      if (roleType === "headOnly") {
        // Head Only: sees assignments they created + assignments FROM ADMIN assigned to them
        return isCreator || (creatorIsAdmin && assignedToYou);
      }

      if (roleType === "both") {
        // Both: sees assignments they created + assignments assigned to them (from Head or Admin)
        return isCreator || assignedToYou;
      }

      // Staff Only: only assignments assigned to them
      return assignedToYou;
    })
    .map((assignment) => {
      const { onlineEntryOptions, createdById, assignees, ...rest } = assignment;

      const submissionEntries = parseSubmissionEntries(onlineEntryOptions);
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

      const assignmentRole: "manager" | "submitter" =
        isAdmin || isCreator ? "manager" : "submitter";

      const creator = createdById ? creatorMap.get(createdById) : null;
      const publisherCourseRole = createdById
        ? (creatorCourseRoleMap.get(createdById) ?? null)
        : null;

      return {
        ...rest,
        createdById,
        assignees,
        onlineEntryOptions: submissionEntries ? [] : onlineEntryOptions,
        ...(submissionEntries ? { submissionEntries } : {}),
        isCreator,
        isAssignedToYou: assignedToYou && !isCreator,
        _assignmentRole: assignmentRole,
        _isAssignedToYou: assignedToYou && !isCreator,
        _isExplicitlyAssignedToYou: explicitlyAssignedToYou,
        _publisherId: createdById ?? null,
        _publisherName: creator?.name ?? null,
        _publisherImage: creator?.image ?? null,
        _publisherRole: publisherCourseRole,
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
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = (await req.json()) as {
      title?: string;
      description?: string | null;
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
      dueDate?: string | null;
      dueTime?: string | null;
      availableFrom?: string | null;
      availableFromTime?: string | null;
      availableUntil?: string | null;
      untilTime?: string | null;
      assignees?: string[];
      status?: string;
    };

    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    let onlineEntryOptions: string[] = [];
    if (Array.isArray(body.submissionEntries) && body.submissionEntries.length > 0) {
      onlineEntryOptions = normalizeSubmissionEntries(body.submissionEntries);
    } else if (Array.isArray(body.onlineEntryOptions)) {
      onlineEntryOptions = body.onlineEntryOptions.filter(
        (item): item is string => typeof item === "string"
      );
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
        onlineEntryOptions,
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
        assignees: normalizeAssignees(body.assignees),
        createdById: access.userId,
        status: normalizeStatus(body.status) ?? CourseStatus.UNPUBLISHED,
        dueDate: parseDateWithTime(body.dueDate, body.dueTime),
        availableFrom: parseDateWithTime(body.availableFrom, body.availableFromTime),
        availableUntil: parseDateWithTime(body.availableUntil, body.untilTime),
      },
    });

    // Auto-create repository for this assignment
    await prisma.repository.create({
      data: {
        name: assignment.title,
        assignmentId: assignment.id,
        courseId: courseId,
      },
    });

    const submissionEntries = parseSubmissionEntries(assignment.onlineEntryOptions);

    const creatorEnrollment = await prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId: access.userId, courseId } },
      select: { courseRole: true },
    });

    return NextResponse.json({
      assignment: {
        ...assignment,
        onlineEntryOptions: submissionEntries ? [] : assignment.onlineEntryOptions,
        ...(submissionEntries ? { submissionEntries } : {}),
        isCreator: true,
        isAssignedToYou: false,
        _assignmentRole: "manager",
        _isAssignedToYou: false,
        _isExplicitlyAssignedToYou: false,
        _publisherId: access.userId,
        _publisherRole: creatorEnrollment?.courseRole ?? null,
      },
      viewer: {
        systemRole: access.systemRole,
        courseRole: access.courseRole,
      },
    });
  } catch (error) {
    console.error("[POST /api/courses/[id]/assignments]", error);
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
  }
}