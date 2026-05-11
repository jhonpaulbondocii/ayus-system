import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@/generated/prisma";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

type RouteContext = {
  params: Promise<{ id: string }>;
};

type SubmissionEntryInput = {
  id?: string | number;
  label?: string;
  type?: string;
  required?: boolean;
  allowedFileTypes?: string[];
  maxFiles?: number | null;
};

type SessionUser = {
  id?: string;
  email?: string;
  name?: string;
  image?: string;
};

function getSessionUserId(session: Awaited<ReturnType<typeof getServerSession>>) {
  const user = (session as { user?: SessionUser } | null)?.user;
  return user?.id ?? null;
}

function normalizeFileTypes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.replace(/^\./, "").trim().toLowerCase())
    .filter(Boolean);
}

function serializeSubmissionEntries(
  entries: SubmissionEntryInput[]
): string[] {
  return entries.map((entry, index) => {
    const type = entry.type ?? "File Upload";

    return JSON.stringify({
      id: entry.id ?? index + 1,
      label: entry.label?.trim() || `Submission ${index + 1}`,
      required: entry.required ?? false,
      type,
      allowedFileTypes:
        type === "File Upload"
          ? normalizeFileTypes(entry.allowedFileTypes)
          : [],
      maxFiles: type === "File Upload" ? (entry.maxFiles ?? 1) : null,
    });
  });
}

function parseDateWithTime(
  date: unknown,
  time: unknown,
  fallbackTime: string
): Date | null {
  if (!date) return null;

  const dateStr = String(date);
  const timeStr = time ? String(time) : fallbackTime;
  const parsed = new Date(`${dateStr} ${timeStr}`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id: courseId } = await context.params;

    const session = await getServerSession(authOptions);
    const currentUserId = getSessionUserId(session);

    const assignments = await prisma.assignment.findMany({
      where: { courseId },
      orderBy: { createdAt: "desc" },
    });

    const creatorIds = [
      ...new Set(
        assignments
          .map((a) => a.createdById)
          .filter(
            (id): id is string => typeof id === "string" && id.length > 0
          )
      ),
    ];

    // Fetch users
    const users =
      creatorIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: creatorIds } },
            select: {
              id: true,
              name: true,
              image: true,
            },
          })
        : [];

    // Fetch course-specific enrollments for all creators
    const enrollments =
      creatorIds.length > 0
        ? await prisma.courseEnrollment.findMany({
            where: {
              courseId,
              userId: { in: creatorIds },
            },
            select: {
              userId: true,
              courseRole: true,
            },
          })
        : [];

    const userMap = new Map(users.map((u) => [u.id, u]));
    // Map userId -> courseRole
    const enrollmentMap = new Map(
      enrollments.map((e) => [e.userId, e.courseRole])
    );

    const enriched = assignments.map((a) => {
      const creator = a.createdById ? userMap.get(a.createdById) : null;
      const courseRole = a.createdById
        ? (enrollmentMap.get(a.createdById) ?? null)
        : null;
      const isMine = !!currentUserId && a.createdById === currentUserId;

      return {
        ...a,
        publisherName: creator?.name ?? null,
        publisherImage: creator?.image ?? null,
        publisherRole: courseRole,
        _isMine: isMine,
        isCreator: isMine,
      };
    });

    return NextResponse.json({
      assignments: enriched,
      viewer: {
        currentUserId,
      },
    });
  } catch (error) {
    console.error("ASSIGNMENTS GET ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignments." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id: courseId } = await context.params;

    const session = await getServerSession(authOptions);
    const currentUserId = getSessionUserId(session);

    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json() as Record<string, unknown>;

    const title = String(body?.title ?? "").trim();
    if (!title) {
      return NextResponse.json(
        { error: "Title is required." },
        { status: 400 }
      );
    }

    let onlineEntryOptions: string[] = [];

    if (
      Array.isArray(body?.submissionEntries) &&
      (body.submissionEntries as unknown[]).length > 0
    ) {
      onlineEntryOptions = serializeSubmissionEntries(
        body.submissionEntries as SubmissionEntryInput[]
      );
    } else if (Array.isArray(body?.onlineEntryOptions)) {
      onlineEntryOptions = (body.onlineEntryOptions as unknown[]).filter(
        (item): item is string => typeof item === "string"
      );
    }

    const assignment = await prisma.assignment.create({
      data: {
        courseId,
        title,
        description: body?.description ? String(body.description) : null,
        points: Number(body?.points ?? 0),
        status: body?.status === "PUBLISHED" ? "PUBLISHED" : "UNPUBLISHED",
        assignmentGroup: String(body?.assignmentGroup ?? "Assignments"),
        submissionType: String(body?.submissionType ?? "Online"),
        displayGradeAs: String(body?.displayGradeAs ?? "Points"),
        onlineEntryOptions,
        submissionAttempts: String(body?.submissionAttempts ?? "Unlimited"),
        allowedAttempts: body?.allowedAttempts
          ? Number(body.allowedAttempts)
          : null,
        doNotCount: Boolean(body?.doNotCount ?? false),
        isGroupAssignment: Boolean(body?.isGroupAssignment ?? false),
        groupSetId: body?.groupSetId ? String(body.groupSetId) : null,
        notifyUsers: Boolean(body?.notifyUsers ?? false),
        assignees: Array.isArray(body?.assignees) ? (body.assignees as string[]) : [],
        dueDate: parseDateWithTime(body?.dueDate, body?.dueTime, "11:59 PM"),
        availableFrom: parseDateWithTime(
          body?.availableFrom,
          body?.availableFromTime,
          "12:00 AM"
        ),
        availableUntil: parseDateWithTime(
          body?.availableUntil,
          body?.untilTime,
          "11:59 PM"
        ),
        createdById: currentUserId,
      },
    });

    // Fetch current user info
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: {
        name: true,
        image: true,
      },
    });

    // Fetch course-specific role of the creator
    const currentEnrollment = await prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId: currentUserId,
          courseId,
        },
      },
      select: {
        courseRole: true,
      },
    });

    return NextResponse.json(
      {
        assignment: {
          ...assignment,
          publisherName: currentUser?.name ?? null,
          publisherImage: currentUser?.image ?? null,
          publisherRole: currentEnrollment?.courseRole ?? null,
          _isMine: true,
          isCreator: true,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("ASSIGNMENTS POST ERROR:", error);
    return NextResponse.json(
      { error: "Failed to create assignment." },
      { status: 500 }
    );
  }
}