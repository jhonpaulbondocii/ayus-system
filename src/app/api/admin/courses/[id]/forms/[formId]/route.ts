import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FormQuestionType, FormType } from "@/generated/prisma";

type UpdateFormQuestionInput = {
  question?: string;
  type?: string;
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
};

type UpdateFormBody = {
  title?: string;
  description?: string;
  formType?: string;
  assignmentGroup?: string;
  points?: number;
  shuffleAnswers?: boolean;
  allowMultipleResponses?: boolean;
  responseLimit?: number | null;
  anonymousResponses?: boolean;
  showResultsToRespondents?: boolean;
  showOneAtATime?: boolean;
  lockQuestionsAfterAnswering?: boolean;
  accessCode?: string;
  confirmationMessage?: string;
  assignTo?: string[];
  dueDate?: string | null;
  dueTime?: string | null;
  availableFrom?: string | null;
  availableFromTime?: string | null;
  availableUntil?: string | null;
  availableUntilTime?: string | null;
  published?: boolean;
  questions?: UpdateFormQuestionInput[];
};

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeFormType(value?: string): FormType {
  switch (value) {
    case "EVALUATION":
    case "Evaluation":
      return "EVALUATION";
    case "REGISTRATION_FORM":
    case "Registration Form":
      return "REGISTRATION_FORM";
    case "GRADED_ASSESSMENT":
    case "Graded Assessment":
      return "GRADED_ASSESSMENT";
    case "SURVEY_FEEDBACK":
    case "Survey / Feedback":
    default:
      return "SURVEY_FEEDBACK";
  }
}

function normalizeQuestionType(value?: string): FormQuestionType {
  switch (value) {
    case "MULTIPLE_CHOICE":
    case "multiple_choice":
      return "MULTIPLE_CHOICE";
    case "CHECKBOXES":
    case "checkboxes":
      return "CHECKBOXES";
    case "DROPDOWN":
    case "dropdown":
      return "DROPDOWN";
    case "SHORT_ANSWER":
    case "short_answer":
      return "SHORT_ANSWER";
    case "PARAGRAPH":
    case "paragraph":
      return "PARAGRAPH";
    case "LINEAR_SCALE":
    case "linear_scale":
      return "LINEAR_SCALE";
    case "MC_GRID":
    case "mc_grid":
      return "MC_GRID";
    case "CHECKBOX_GRID":
    case "checkbox_grid":
      return "CHECKBOX_GRID";
    case "DATE":
    case "date":
      return "DATE";
    case "TIME":
    case "time":
      return "TIME";
    case "FILE_UPLOAD":
    case "file_upload":
      return "FILE_UPLOAD";
    case "SECTION":
    case "section":
      return "SECTION";
    default:
      return "SHORT_ANSWER";
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; formId: string }> }
) {
  try {
    const { id: courseId, formId } = await params;

    const form = await prisma.form.findFirst({
      where: {
        id: formId,
        courseId,
      },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    return NextResponse.json({ form });
  } catch (error) {
    console.error("GET /api/admin/courses/[id]/forms/[formId] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch form" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; formId: string }> }
) {
  try {
    const { id: courseId, formId } = await params;
    const body = (await req.json()) as UpdateFormBody;

    const existingForm = await prisma.form.findFirst({
      where: {
        id: formId,
        courseId,
      },
      select: { id: true },
    });

    if (!existingForm) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const questions = Array.isArray(body.questions) ? body.questions : [];

    await prisma.formQuestion.deleteMany({
      where: { formId },
    });

    const form = await prisma.form.update({
      where: { id: formId },
      data: {
        title: body.title?.trim() || "Untitled Form",
        description: body.description?.trim() || null,
        formType: normalizeFormType(body.formType),
        assignmentGroup: body.assignmentGroup?.trim() || "Assignments",
        points: typeof body.points === "number" ? body.points : 0,
        shuffleAnswers: Boolean(body.shuffleAnswers),
        allowMultipleResponses: Boolean(body.allowMultipleResponses),
        responseLimit:
          typeof body.responseLimit === "number" ? body.responseLimit : null,
        anonymousResponses: Boolean(body.anonymousResponses),
        showResultsToRespondents: Boolean(body.showResultsToRespondents),
        showOneAtATime: Boolean(body.showOneAtATime),
        lockQuestionsAfterAnswering: Boolean(body.lockQuestionsAfterAnswering),
        accessCode: body.accessCode?.trim() || null,
        confirmationMessage: body.confirmationMessage?.trim() || null,
        assignTo: Array.isArray(body.assignTo) ? body.assignTo : [],
        dueDate: parseDate(body.dueDate),
        dueTime: body.dueTime || null,
        availableFrom: parseDate(body.availableFrom),
        availableFromTime: body.availableFromTime || null,
        availableUntil: parseDate(body.availableUntil),
        availableUntilTime: body.availableUntilTime || null,
        published: Boolean(body.published),
        questions: {
          create: questions.map((q: UpdateFormQuestionInput, i: number) => ({
            question: q.question?.trim() || "",
            type: normalizeQuestionType(q.type),
            description: q.description?.trim() || null,
            points: typeof q.points === "number" ? q.points : 0,
            required: Boolean(q.required),
            image: q.image || null,
            options: Array.isArray(q.options) ? q.options : [],
            correctAnswer: q.correctAnswer || null,
            scaleMin: typeof q.scaleMin === "number" ? q.scaleMin : null,
            scaleMax: typeof q.scaleMax === "number" ? q.scaleMax : null,
            scaleMinLabel: q.scaleMinLabel || null,
            scaleMaxLabel: q.scaleMaxLabel || null,
            rows: Array.isArray(q.rows) ? q.rows : [],
            columns: Array.isArray(q.columns) ? q.columns : [],
            sectionTitle: q.sectionTitle || null,
            sectionDescription: q.sectionDescription || null,
            order: i,
          })),
        },
      },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json({ form });
  } catch (error) {
    console.error("PUT /api/admin/courses/[id]/forms/[formId] error:", error);
    return NextResponse.json(
      { error: "Failed to update form" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; formId: string }> }
) {
  try {
    const { id: courseId, formId } = await params;
    const body = (await req.json()) as { published?: boolean };

    const existingForm = await prisma.form.findFirst({
      where: {
        id: formId,
        courseId,
      },
      select: { id: true },
    });

    if (!existingForm) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const form = await prisma.form.update({
      where: { id: formId },
      data: {
        published:
          typeof body.published === "boolean" ? body.published : undefined,
      },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json({ form });
  } catch (error) {
    console.error("PATCH /api/admin/courses/[id]/forms/[formId] error:", error);
    return NextResponse.json(
      { error: "Failed to update publish status" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; formId: string }> }
) {
  try {
    const { id: courseId, formId } = await params;

    const existingForm = await prisma.form.findFirst({
      where: {
        id: formId,
        courseId,
      },
      select: { id: true },
    });

    if (!existingForm) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    await prisma.form.delete({
      where: { id: formId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "DELETE /api/admin/courses/[id]/forms/[formId] error:",
      error
    );
    return NextResponse.json(
      { error: "Failed to delete form" },
      { status: 500 }
    );
  }
}