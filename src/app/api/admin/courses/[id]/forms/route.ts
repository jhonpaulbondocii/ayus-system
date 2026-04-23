// src/app/api/admin/courses/[id]/forms/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

type Props = { params: Promise<{ id: string }> };

interface IncomingFormQuestion {
  type?: string;
  question?: string;
  description?: string;
  points?: number;
  required?: boolean;
  image?: string;
  options?: string[];
  correctAnswer?: string;
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  rows?: string[];
  columns?: string[];
  sectionTitle?: string;
  sectionDescription?: string;
  order?: number;
}

// ✅ GET — fetch all forms with author info
export async function GET(_req: NextRequest, { params }: Props) {
  try {
    const { id: courseId } = await params;

    const access = await requireCoursePermission(courseId, "manage_assignments");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const forms = await prisma.form.findMany({
      where: { courseId },
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, name: true, role: true, image: true } },
        questions: { orderBy: { order: "asc" } },
      },
    });

    const data = forms.map((f) => ({
      id: f.id,
      courseId: f.courseId,
      title: f.title,
      description: f.description ?? "",
      formType: f.formType,
      assignmentGroup: f.assignmentGroup,
      points: Number(f.points),
      shuffleAnswers: f.shuffleAnswers,
      allowMultipleResponses: f.allowMultipleResponses,
      responseLimit: f.responseLimit,
      anonymousResponses: f.anonymousResponses,
      showResultsToRespondents: f.showResultsToRespondents,
      showOneAtATime: f.showOneAtATime,
      lockQuestionsAfterAnswering: f.lockQuestionsAfterAnswering,
      accessCode: f.accessCode ?? "",
      confirmationMessage: f.confirmationMessage ?? "",
      assignTo: f.assignTo,
      dueDate: f.dueDate ? f.dueDate.toISOString().split("T")[0] : "",
      dueTime: f.dueTime ?? "",
      availableFrom: f.availableFrom ? f.availableFrom.toISOString().split("T")[0] : "",
      availableFromTime: f.availableFromTime ?? "",
      availableUntil: f.availableUntil ? f.availableUntil.toISOString().split("T")[0] : "",
      availableUntilTime: f.availableUntilTime ?? "",
      published: f.published,
      createdAt: f.createdAt.toISOString(),
      createdAtLabel: f.createdAt.toLocaleDateString(),
      // ── Author info ──
      authorId: f.authorId,
      authorName: f.author?.name ?? f.authorName ?? "Admin",
      authorRole: f.authorRole ?? "Admin",
      authorImage: f.author?.image ?? null,
      questions: f.questions,
    }));

    return NextResponse.json({ forms: data });
  } catch (error) {
    console.error("ADMIN FORMS GET ERROR:", error);
    return NextResponse.json({ error: "Failed to fetch forms." }, { status: 500 });
  }
}

// ✅ POST — create a form, saving author info
export async function POST(req: NextRequest, { params }: Props) {
  try {
    const { id: courseId } = await params;

    const access = await requireCoursePermission(courseId, "manage_assignments");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json() as {
      title?: string;
      description?: string;
      formType?: string;
      assignmentGroup?: string;
      points?: number;
      shuffleAnswers?: boolean;
      allowMultipleResponses?: boolean;
      responseLimit?: number;
      anonymousResponses?: boolean;
      showResultsToRespondents?: boolean;
      showOneAtATime?: boolean;
      lockQuestionsAfterAnswering?: boolean;
      accessCode?: string;
      confirmationMessage?: string;
      assignTo?: string[];
      dueDate?: string;
      dueTime?: string;
      availableFrom?: string;
      availableFromTime?: string;
      availableUntil?: string;
      availableUntilTime?: string;
      published?: boolean;
      questions?: IncomingFormQuestion[];
    };

    const {
      title, description, formType = "SURVEY_FEEDBACK", assignmentGroup = "Assignments",
      points = 0, shuffleAnswers = false, allowMultipleResponses = false,
      responseLimit, anonymousResponses = false, showResultsToRespondents = false,
      showOneAtATime = false, lockQuestionsAfterAnswering = false, accessCode,
      confirmationMessage, assignTo = [], dueDate, dueTime, availableFrom,
      availableFromTime, availableUntil, availableUntilTime, published = false,
      questions = [],
    } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    // ── Resolve author ──
    const authorId = access.userId ?? null;
    const authorSystemRole = access.systemRole ?? "STAFF";
    const authorCourseRole = access.courseRole ?? null;

    let authorRole = "Staff";
    if (authorSystemRole === "ADMIN") authorRole = "Admin";
    else if (authorCourseRole?.toLowerCase() === "head") authorRole = "Head";

    let authorName = "Admin";
    if (authorId) {
      const user = await prisma.user.findUnique({
        where: { id: authorId },
        select: { name: true },
      });
      if (user?.name) authorName = user.name;
    }

    // Normalize formType: handle both "Survey / Feedback" and "SURVEY_FEEDBACK"
    const formTypeMap: Record<string, string> = {
      "Survey / Feedback": "SURVEY_FEEDBACK",
      "Evaluation": "EVALUATION",
      "Registration Form": "REGISTRATION_FORM",
      "Graded Assessment": "GRADED_ASSESSMENT",
    };
    const normalizedFormType = formTypeMap[formType] ?? formType;

    const form = await prisma.form.create({
      data: {
        courseId,
        authorId,
        authorName,
        authorRole,
        title: String(title).trim(),
        description: description ?? null,
        formType: normalizedFormType as Parameters<typeof prisma.form.create>[0]["data"]["formType"],
        assignmentGroup,
        points: Number(points) || 0,
        shuffleAnswers: Boolean(shuffleAnswers),
        allowMultipleResponses: Boolean(allowMultipleResponses),
        responseLimit: responseLimit ? Number(responseLimit) : null,
        anonymousResponses: Boolean(anonymousResponses),
        showResultsToRespondents: Boolean(showResultsToRespondents),
        showOneAtATime: Boolean(showOneAtATime),
        lockQuestionsAfterAnswering: Boolean(lockQuestionsAfterAnswering),
        accessCode: accessCode ? String(accessCode) : null,
        confirmationMessage: confirmationMessage ?? null,
        assignTo: Array.isArray(assignTo) ? assignTo : [],
        dueDate: dueDate ? new Date(dueDate) : null,
        dueTime: dueTime ?? null,
        availableFrom: availableFrom ? new Date(availableFrom) : null,
        availableFromTime: availableFromTime ?? null,
        availableUntil: availableUntil ? new Date(availableUntil) : null,
        availableUntilTime: availableUntilTime ?? null,
        published: Boolean(published),
        questions: {
          create: questions.map((q: IncomingFormQuestion, idx: number) => ({
            type: (q.type?.toUpperCase() ?? "SHORT_ANSWER") as Parameters<typeof prisma.formQuestion.create>[0]["data"]["type"],
            question: q.question ?? "",
            description: q.description ?? null,
            points: Number(q.points) || 0,
            required: Boolean(q.required),
            image: q.image ?? null,
            options: Array.isArray(q.options) ? q.options : [],
            correctAnswer: q.correctAnswer ?? null,
            scaleMin: q.scaleMin ?? null,
            scaleMax: q.scaleMax ?? null,
            scaleMinLabel: q.scaleMinLabel ?? null,
            scaleMaxLabel: q.scaleMaxLabel ?? null,
            rows: Array.isArray(q.rows) ? q.rows : [],
            columns: Array.isArray(q.columns) ? q.columns : [],
            sectionTitle: q.sectionTitle ?? null,
            sectionDescription: q.sectionDescription ?? null,
            order: q.order ?? idx,
          })),
        },
      },
      include: {
        author: { select: { id: true, name: true, role: true, image: true } },
        questions: { orderBy: { order: "asc" } },
      },
    });

    return NextResponse.json({
      form: {
        ...form,
        authorName: form.author?.name ?? form.authorName,
        authorRole: form.authorRole,
        authorImage: form.author?.image ?? null,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("ADMIN FORMS POST ERROR:", error);
    return NextResponse.json({ error: "Failed to create form." }, { status: 500 });
  }
}