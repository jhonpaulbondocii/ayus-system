// src/app/api/courses/[id]/grades/managed/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendGradeEmail } from "@/lib/email";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: courseId } = await params;
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  const isAdmin = user?.role === "ADMIN";

  if (!isAdmin) {
    const enrollment = await prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enrollment) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const roles = enrollment.courseRole.split(",").map((r) => r.trim().toLowerCase());
    const isHead = roles.includes("head");
    if (!isHead) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Fetch all enrollments except current user
  const staffEnrollments = await prisma.courseEnrollment.findMany({
    where: { courseId, userId: { not: userId } },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          position: true,
        },
      },
    },
  });

  // Filter: Staff Only at Both palagi. Kapag Admin, kasama rin ang Head Only.
  const receivingStaff = staffEnrollments.filter((enr) => {
    const roles = enr.courseRole.split(",").map((r) => r.trim().toLowerCase());
    const hasStaff = roles.includes("staff");
    const hasHead = roles.includes("head");
    const isHeadOnly = hasHead && !hasStaff;

    // Admin: lahat — Staff Only, Both, at Head Only
    if (isAdmin) return hasStaff || isHeadOnly;

    // Head (Head Only or Both): Staff Only at Both lang ang nakikita
    // Hindi kasama ang ibang Head Only
    return hasStaff;
  });

  // Fetch assignments created by this head/admin only
  const assignments = await prisma.assignment.findMany({
    where: {
      courseId,
      createdById: userId,
      status: "PUBLISHED",
    },
    orderBy: { dueDate: "asc" },
  });

  // Fetch forms created by this head/admin only
  const forms = await prisma.form.findMany({
    where: { courseId, authorId: userId, published: true },
    orderBy: { dueDate: "asc" },
  });

  const assignmentIds = assignments.map((a) => a.id);
  const formIds = forms.map((f) => f.id);
  const staffIds = receivingStaff.map((e) => e.userId);

  const submissions =
    assignmentIds.length > 0 && staffIds.length > 0
      ? await prisma.submission.findMany({
          where: {
            assignmentId: { in: assignmentIds },
            userId: { in: staffIds },
          },
          select: {
            id: true,
            userId: true,
            assignmentId: true,
            status: true,
            grade: true,
            feedback: true,
            submittedAt: true,
            fileUrl: true,
            textEntry: true,
            websiteUrl: true,
          },
        })
      : [];

  const formSubmissions =
    formIds.length > 0 && staffIds.length > 0
      ? await prisma.formSubmission.findMany({
          where: {
            formId: { in: formIds },
            userId: { in: staffIds },
          },
          select: {
            id: true,
            userId: true,
            formId: true,
            score: true,
            createdAt: true,
          },
        })
      : [];

  const assignmentColumns = assignments.map((a) => ({
    id: a.id,
    title: a.title,
    points: a.points,
    dueDate: a.dueDate ? a.dueDate.toISOString() : null,
    assignmentGroup: a.assignmentGroup,
    doNotCount: a.doNotCount,
    displayGradeAs: a.displayGradeAs ?? "Points",
    type: "assignment" as const,
  }));

  const formColumns = forms.map((f) => ({
    id: f.id,
    title: f.title,
    points: f.points,
    dueDate: f.dueDate ? f.dueDate.toISOString() : null,
    assignmentGroup: f.assignmentGroup,
    doNotCount: false,
    displayGradeAs: "Points",
    type: "form" as const,
  }));

  const staffRows = receivingStaff.map((enr) => {
    const s = enr.user;

    const assignmentGrades = assignments.map((a) => {
      const sub = submissions.find(
        (x) => x.userId === s.id && x.assignmentId === a.id
      );
      return {
        assignmentId: a.id,
        grade: sub?.grade ?? null,
        status: sub?.status ?? "PENDING",
        submittedAt: sub?.submittedAt ? sub.submittedAt.toISOString() : null,
        feedback: sub?.feedback ?? null,
        submissionId: sub?.id ?? null,
        hasSubmission: !!sub,
        fileUrl: sub?.fileUrl ?? null,
        textEntry: sub?.textEntry ?? null,
        websiteUrl: sub?.websiteUrl ?? null,
        displayGradeAs: a.displayGradeAs ?? "Points",
      };
    });

    const formGrades = forms.map((f) => {
      const sub = formSubmissions.find(
        (x) => x.userId === s.id && x.formId === f.id
      );
      return {
        formId: f.id,
        score: sub?.score ?? null,
        submittedAt: sub?.createdAt ? sub.createdAt.toISOString() : null,
        submissionId: sub?.id ?? null,
        hasSubmission: !!sub,
        displayGradeAs: "Points",
      };
    });

    const earnedFromAssignments = assignmentGrades.reduce((sum, g) => {
      const col = assignments.find((a) => a.id === g.assignmentId);
      if (col?.doNotCount) return sum;
      if ((col?.displayGradeAs ?? "Points") === "Not Graded") return sum;
      return sum + (g.grade ?? 0);
    }, 0);

    const earnedFromForms = formGrades.reduce((sum, g) => sum + (g.score ?? 0), 0);
    const totalEarned = earnedFromAssignments + earnedFromForms;

    const totalPossible =
      assignments
        .filter((a) => !a.doNotCount && (a.displayGradeAs ?? "Points") !== "Not Graded")
        .reduce((sum, a) => sum + a.points, 0) +
      forms.reduce((sum, f) => sum + f.points, 0);

    const percentage =
      totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : null;

    return {
      id: s.id,
      name: s.name ?? "",
      email: enr.user.email ?? "",
      image: s.image,
      position: s.position,
      courseRole: enr.courseRole,
      assignmentGrades,
      quizGrades: [],
      formGrades,
      totalEarned,
      totalPossible,
      percentage,
    };
  });

  return NextResponse.json({
    staff: staffRows,
    assignments: assignmentColumns,
    quizzes: [],
    forms: formColumns,
  });
}

/* ── PATCH — Head saves a grade for a staff member ── */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: courseId } = await params;
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  const isAdmin = user?.role === "ADMIN";

  if (!isAdmin) {
    const enrollment = await prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enrollment) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const roles = enrollment.courseRole.split(",").map((r) => r.trim().toLowerCase());
    if (!roles.includes("head")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await req.json();
  const { staffId, assignmentId, formId, grade, feedback, score, status, daysLate } = body as {
    staffId: string;
    assignmentId?: string;
    formId?: string;
    grade?: number | null;
    feedback?: string;
    score?: number | null;
    status?: string;
    daysLate?: number | null;
  };

  if (staffId === userId) {
    return NextResponse.json({ error: "Cannot grade yourself" }, { status: 400 });
  }

  // ── Form score update ────────────────────────────────────────────────────
  if (formId) {
    const form = await prisma.form.findFirst({
      where: { id: formId, courseId, authorId: userId },
      select: { id: true },
    });
    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const updated = await prisma.formSubmission.upsert({
      where: { formId_userId: { formId, userId: staffId } },
      update: { score: score ?? 0 },
      create: { formId, userId: staffId, score: score ?? 0, answers: {} },
    });

    return NextResponse.json({ submission: updated });
  }

  // ── Assignment grade update ──────────────────────────────────────────────
  if (!assignmentId) {
    return NextResponse.json({ error: "assignmentId or formId required" }, { status: 400 });
  }

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, courseId, createdById: userId },
    select: { id: true, title: true, points: true },
  });
  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const resolvedStatus = status ?? (grade !== null && grade !== undefined ? "GRADED" : "PENDING");

  const updated = await prisma.submission.upsert({
    where: { userId_assignmentId: { userId: staffId, assignmentId } },
    update: {
      grade: grade ?? null,
      feedback: feedback ?? null,
      status: resolvedStatus as never,
      daysLate: daysLate ?? null,
      updatedAt: new Date(),
    },
    create: {
      userId: staffId,
      assignmentId,
      grade: grade ?? null,
      feedback: feedback ?? null,
      status: resolvedStatus as never,
      daysLate: daysLate ?? null,
    },
  });

  if (grade !== null && grade !== undefined) {
    try {
      const [staffUser, course] = await Promise.all([
        prisma.user.findUnique({
          where: { id: staffId },
          select: { name: true, email: true },
        }),
        prisma.course.findUnique({
          where: { id: courseId },
          select: { name: true },
        }),
      ]);

      if (staffUser?.email && course?.name) {
        await sendGradeEmail({
          to: staffUser.email,
          name: staffUser.name ?? "Staff",
          courseName: course.name,
          assignmentTitle: assignment.title,
          score: grade,
          maxPoints: assignment.points,
          feedback: feedback ?? null,
        });
      }
    } catch (emailErr) {
      console.error("[grade-email] failed:", emailErr);
    }
  }

  return NextResponse.json({ submission: updated });
} 