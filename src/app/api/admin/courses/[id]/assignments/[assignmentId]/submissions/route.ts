// src/app/api/admin/courses/[id]/assignments/[assignmentId]/submissions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ── Helper: parse stored fileUrl (may be JSON v2 or plain URL) ────────────────
export type ParsedEntry = {
  entryId:    string;
  label:      string;
  type:       string;
  fileUrl:    string | null;
  fileName:   string | null;
  textEntry:  string | null;
  websiteUrl: string | null;
  required:   boolean;
};

export function parseStoredFileUrl(raw: string | null): {
  isMulti: boolean;
  entries: ParsedEntry[];
  fileUrl: string | null;
} {
  if (!raw) return { isMulti: false, entries: [], fileUrl: null };

  if (raw.trimStart().startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as { version?: number; entries?: ParsedEntry[] };
      if (parsed.version === 2 && Array.isArray(parsed.entries)) {
        return { isMulti: true, entries: parsed.entries, fileUrl: null };
      }
    } catch { /* not JSON */ }
  }

  return { isMulti: false, entries: [], fileUrl: raw };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: courseId, assignmentId } = await params;

  // ── 1. Fetch assignment so we can compute late client-side ──────────────────
  const assignment = await prisma.assignment.findUnique({
  where: { id: assignmentId },
  select: { dueDate: true, createdById: true },  // ← dagdag ang createdById
});

  // ── 2. Fetch actual submissions ─────────────────────────────────────────────
  const submissions = await prisma.submission.findMany({
    where: { assignmentId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  // ── 3. Fetch all enrolled users for "missing" rows ──────────────────────────
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { courseId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  // ── 4. Build submission map keyed by userId ──────────────────────────────────
  const submissionByUserId = new Map(submissions.map(s => [s.userId, s]));

  // ── 5. Build submitted rows ──────────────────────────────────────────────────
  const submittedRows = submissions.map(s => {
    const { isMulti, entries, fileUrl } = parseStoredFileUrl(s.fileUrl);

    // Late = submitted after dueDate (your enum has no LATE value, so derive it)
    const isLate = !!(
      s.submittedAt &&
      assignment?.dueDate &&
      new Date(s.submittedAt) > new Date(assignment.dueDate)
    );

    // Days late (positive integer, or null if not late)
    const daysLate = isLate && s.submittedAt && assignment?.dueDate
      ? Math.ceil(
          (new Date(s.submittedAt).getTime() - new Date(assignment.dueDate).getTime()) /
          (1000 * 60 * 60 * 24)
        )
      : null;

    return {
      id:          s.id,
      userId:      s.userId,
      userName:    s.user.name,
      userEmail:   s.user.email,
      courseRole:  null as string | null,
      // Expose the real DB enum value AND a virtual late/missing status
      status: (s.status as string) === "LATE" || (s.status as string) === "EXCUSED" || (s.status as string) === "MISSING" || (s.status as string) === "GRADED"
        ? (s.status as string)
        : isLate ? "LATE" : (s.status as string),
      grade:       s.grade,
      feedback:    s.feedback,
      submittedAt: s.submittedAt?.toISOString() ?? null,
      textEntry:   s.textEntry,
      websiteUrl:  s.websiteUrl,
      comments:    s.comments,
      daysLate,
      isLate,
      isMissing:   false,
      isMulti,
      entries,
      fileUrl: isMulti ? (entries.find(e => e.fileUrl)?.fileUrl ?? null) : fileUrl,
      allFileUrls: isMulti
        ? entries.filter(e => e.fileUrl).map(e => ({ label: e.label, url: e.fileUrl! }))
        : s.fileUrl ? [{ label: "Submission", url: s.fileUrl }] : [],
    };
  });

  // ── 6. Missing rows — enrolled users with no submission record ───────────────
  const missingRows = enrollments
  .filter(e =>
    !submissionByUserId.has(e.userId) &&
    e.userId !== assignment?.createdById
  )
  .map(e => ({
    id:          null,
    userId:      e.user.id,
    userName:    e.user.name,
    userEmail:   e.user.email,
    courseRole:  e.courseRole,
    status:      "MISSING",
    grade:       null,
    feedback:    null,
    submittedAt: null,
    textEntry:   null,
    websiteUrl:  null,
    comments:    null,
    daysLate:    null,
    isLate:      false,
    isMissing:   true,
    isMulti:     false,
    entries:     [],
    fileUrl:     null,
    allFileUrls: [],
  }));

  return NextResponse.json({
    submissions: [...submittedRows, ...missingRows],
  });
}

export async function PATCH(
  req: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    submissionId: string;
    grade?: number;
    feedback?: string;
    status?: string;
    daysLate?: number;
  };

  // Map virtual statuses back to valid DB enum values before saving
  const dbStatusMap: Record<string, string> = {
    LATE:      "LATE",
    MISSING:   "MISSING",
    GRADED:    "GRADED",
    EXCUSED:   "EXCUSED",
    SUBMITTED: "SUBMITTED",
    PENDING:   "PENDING",
    OVERDUE:   "OVERDUE",
    // SpeedGrader sends these
    "None":    "SUBMITTED",
  };

  const dbStatus = body.status ? (dbStatusMap[body.status] ?? "SUBMITTED") : undefined;

  const submission = await prisma.submission.update({
  where: { id: body.submissionId },
  data: {
    ...(body.grade    !== undefined && { grade:    body.grade }),
    ...(body.feedback !== undefined && { feedback: body.feedback }),
    ...(dbStatus      !== undefined && { status:   dbStatus as never }),
    ...(body.daysLate !== undefined && body.daysLate !== null && { daysLate: body.daysLate }),
  },
  select: {
    id:       true,
    grade:    true,
    feedback: true,
    status:   true,
    daysLate: true,
  },
});

  return NextResponse.json({ submission });
}