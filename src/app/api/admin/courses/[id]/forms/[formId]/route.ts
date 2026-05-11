// src/app/api/admin/courses/[id]/forms/[formId]/route.ts

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

// ── FIXED: Parse date+time strings as Philippine local time (UTC+8) ───────────
function parseDatePh(
  date: string | null | undefined,
  time: string | null | undefined
): Date | null {
  if (!date) return null;

  const datePart = date.includes("T") ? date.split("T")[0] : date;

  let hours = 0;
  let minutes = 0;
  if (time) {
    const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      hours = parseInt(match[1], 10);
      minutes = parseInt(match[2], 10);
      const period = match[3].toUpperCase();
      if (period === "AM" && hours === 12) hours = 0;
      if (period === "PM" && hours !== 12) hours += 12;
    }
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const [year, month, day] = datePart.split("-").map(Number);
  const isoString = `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00+08:00`;
  const parsed = new Date(isoString);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// ── Convert stored UTC DateTime back to PH local date string (YYYY-MM-DD) ────
function toPhDateString(dt: Date | null | undefined): string {
  if (!dt) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dt));
}

// ── Convert stored UTC DateTime back to PH local time string (H:MM AM/PM) ────
function toPhTimeString(dt: Date | null | undefined): string {
  if (!dt) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(dt));
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

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; formId: string }> }
) {
  try {
    const { id: courseId, formId } = await params;

    const form = await prisma.form.findFirst({
      where: { id: formId, courseId },
      include: { questions: { orderBy: { order: "asc" } } },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    return NextResponse.json({
      form: {
        ...form,
        dueDate:            toPhDateString(form.dueDate),
        dueTime:            toPhTimeString(form.dueDate),
        availableFrom:      toPhDateString(form.availableFrom),
        availableFromTime:  toPhTimeString(form.availableFrom),
        availableUntil:     toPhDateString(form.availableUntil),
        availableUntilTime: toPhTimeString(form.availableUntil),
      },
    });
  } catch (error) {
    console.error("GET /api/admin/courses/[id]/forms/[formId] error:", error);
    return NextResponse.json({ error: "Failed to fetch form" }, { status: 500 });
  }
}

// ── PUT ───────────────────────────────────────────────────────────────────────
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; formId: string }> }
) {
  try {
    const { id: courseId, formId } = await params;
    const body = (await req.json()) as UpdateFormBody;

    const existingForm = await prisma.form.findFirst({
      where: { id: formId, courseId },
      select: { id: true },
    });

    if (!existingForm) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const questions = Array.isArray(body.questions) ? body.questions : [];

    await prisma.formQuestion.deleteMany({ where: { formId } });

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
        responseLimit: typeof body.responseLimit === "number" ? body.responseLimit : null,
        anonymousResponses: Boolean(body.anonymousResponses),
        showResultsToRespondents: Boolean(body.showResultsToRespondents),
        showOneAtATime: Boolean(body.showOneAtATime),
        lockQuestionsAfterAnswering: Boolean(body.lockQuestionsAfterAnswering),
        accessCode: body.accessCode?.trim() || null,
        confirmationMessage: body.confirmationMessage?.trim() || null,
        assignTo: Array.isArray(body.assignTo) ? body.assignTo : [],
        dueDate:       parseDatePh(body.dueDate, body.dueTime),
        dueTime:       body.dueTime || null,
        availableFrom: parseDatePh(body.availableFrom, body.availableFromTime),
        availableFromTime: body.availableFromTime || null,
        availableUntil: parseDatePh(body.availableUntil, body.availableUntilTime),
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
      include: { questions: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({
      form: {
        ...form,
        dueDate:            toPhDateString(form.dueDate),
        dueTime:            toPhTimeString(form.dueDate),
        availableFrom:      toPhDateString(form.availableFrom),
        availableFromTime:  toPhTimeString(form.availableFrom),
        availableUntil:     toPhDateString(form.availableUntil),
        availableUntilTime: toPhTimeString(form.availableUntil),
      },
    });
  } catch (error) {
    console.error("PUT /api/admin/courses/[id]/forms/[formId] error:", error);
    return NextResponse.json({ error: "Failed to update form" }, { status: 500 });
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────────────
// Handles partial updates:
//   - Toggle published status
//   - Update assignTo, dueDate, availableFrom, availableUntil (from Assign To panel)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; formId: string }> }
) {
  try {
    const { id: courseId, formId } = await params;
    const body = (await req.json()) as {
      published?: boolean;
      assignTo?: string[];
      dueDate?: string | null;
      dueTime?: string | null;
      availableFrom?: string | null;
      availableFromTime?: string | null;
      availableUntil?: string | null;
      availableUntilTime?: string | null;
    };

    const existingForm = await prisma.form.findFirst({
      where: { id: formId, courseId },
      select: { id: true },
    });

    if (!existingForm) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Build update object with only the fields that were sent
    const updateData: Record<string, unknown> = {};

    if (typeof body.published === "boolean") {
      updateData.published = body.published;
    }

    if (Array.isArray(body.assignTo)) {
      updateData.assignTo = body.assignTo;
    }

    if (body.dueDate !== undefined) {
      updateData.dueDate = parseDatePh(body.dueDate, body.dueTime ?? null);
      updateData.dueTime = body.dueTime ?? null;
    }

    if (body.availableFrom !== undefined) {
      updateData.availableFrom = parseDatePh(body.availableFrom, body.availableFromTime ?? null);
      updateData.availableFromTime = body.availableFromTime ?? null;
    }

    if (body.availableUntil !== undefined) {
      updateData.availableUntil = parseDatePh(body.availableUntil, body.availableUntilTime ?? null);
      updateData.availableUntilTime = body.availableUntilTime ?? null;
    }

    const form = await prisma.form.update({
      where: { id: formId },
      data: updateData,
      include: { questions: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({
      form: {
        ...form,
        dueDate:            toPhDateString(form.dueDate),
        dueTime:            toPhTimeString(form.dueDate),
        availableFrom:      toPhDateString(form.availableFrom),
        availableFromTime:  toPhTimeString(form.availableFrom),
        availableUntil:     toPhDateString(form.availableUntil),
        availableUntilTime: toPhTimeString(form.availableUntil),
      },
    });
  } catch (error) {
    console.error("PATCH /api/admin/courses/[id]/forms/[formId] error:", error);
    return NextResponse.json({ error: "Failed to update form" }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; formId: string }> }
) {
  try {
    const { id: courseId, formId } = await params;

    const existingForm = await prisma.form.findFirst({
      where: { id: formId, courseId },
      select: { id: true },
    });

    if (!existingForm) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    await prisma.form.delete({ where: { id: formId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/courses/[id]/forms/[formId] error:", error);
    return NextResponse.json({ error: "Failed to delete form" }, { status: 500 });
  }
}