// src/app/api/courses/[id]/forms/[formId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";
import { FormType, FormQuestionType } from "@/generated/prisma";

// ── Enum mappers ──────────────────────────────────────────────────────────────
function toFormType(value: string): FormType {
  const map: Record<string, FormType> = {
    "Survey / Feedback": FormType.SURVEY_FEEDBACK,
    "Evaluation":        FormType.EVALUATION,
    "Registration Form": FormType.REGISTRATION_FORM,
    "Graded Assessment": FormType.GRADED_ASSESSMENT,
  };
  return map[value] ?? FormType.SURVEY_FEEDBACK;
}

function fromFormType(value: FormType): string {
  const map: Record<FormType, string> = {
    [FormType.SURVEY_FEEDBACK]:   "Survey / Feedback",
    [FormType.EVALUATION]:        "Evaluation",
    [FormType.REGISTRATION_FORM]: "Registration Form",
    [FormType.GRADED_ASSESSMENT]: "Graded Assessment",
  };
  return map[value] ?? "Survey / Feedback";
}

function toFormQuestionType(value: string): FormQuestionType {
  const map: Record<string, FormQuestionType> = {
    multiple_choice: FormQuestionType.MULTIPLE_CHOICE,
    checkboxes:      FormQuestionType.CHECKBOXES,
    dropdown:        FormQuestionType.DROPDOWN,
    short_answer:    FormQuestionType.SHORT_ANSWER,
    paragraph:       FormQuestionType.PARAGRAPH,
    linear_scale:    FormQuestionType.LINEAR_SCALE,
    mc_grid:         FormQuestionType.MC_GRID,
    checkbox_grid:   FormQuestionType.CHECKBOX_GRID,
    date:            FormQuestionType.DATE,
    time:            FormQuestionType.TIME,
    file_upload:     FormQuestionType.FILE_UPLOAD,
    section:         FormQuestionType.SECTION,
  };
  return map[value] ?? FormQuestionType.SHORT_ANSWER;
}

function fromFormQuestionType(value: FormQuestionType): string {
  const map: Record<FormQuestionType, string> = {
    [FormQuestionType.MULTIPLE_CHOICE]: "multiple_choice",
    [FormQuestionType.CHECKBOXES]:      "checkboxes",
    [FormQuestionType.DROPDOWN]:        "dropdown",
    [FormQuestionType.SHORT_ANSWER]:    "short_answer",
    [FormQuestionType.PARAGRAPH]:       "paragraph",
    [FormQuestionType.LINEAR_SCALE]:    "linear_scale",
    [FormQuestionType.MC_GRID]:         "mc_grid",
    [FormQuestionType.CHECKBOX_GRID]:   "checkbox_grid",
    [FormQuestionType.DATE]:            "date",
    [FormQuestionType.TIME]:            "time",
    [FormQuestionType.FILE_UPLOAD]:     "file_upload",
    [FormQuestionType.SECTION]:         "section",
  };
  return map[value] ?? "short_answer";
}

// ── FIXED: Parse date+time as Philippine local time (UTC+8) ──────────────────
function parseDate(
  date: string | null | undefined,
  time: string | null | undefined
): Date | null {
  if (!date) return null;

  // Strip any time component — only keep YYYY-MM-DD
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

// ── FIXED: Convert stored UTC DateTime back to PH local date/time strings ────
function toPhDateString(dt: Date | null | undefined): string | null {
  if (!dt) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dt));
}

function toPhTimeString(dt: Date | null | undefined): string | null {
  if (!dt) return null;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(dt));
}

// ── FIXED: serializeForm converts DateTime fields back to PH date+time strings
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeForm(f: any) {
  return {
    ...f,
    formType:           fromFormType(f.formType),
    dueDate:            toPhDateString(f.dueDate),
    dueTime:            toPhTimeString(f.dueDate),
    availableFrom:      toPhDateString(f.availableFrom),
    availableFromTime:  toPhTimeString(f.availableFrom),
    availableUntil:     toPhDateString(f.availableUntil),
    availableUntilTime: toPhTimeString(f.availableUntil),
    questions: (f.questions ?? []).map((q: Record<string, unknown>) => ({
      ...q,
      type: fromFormQuestionType(q.type as FormQuestionType),
    })),
  };
}

function sanitizeQuestion(
  q: Record<string, unknown>,
  order: number
): Record<string, unknown> {
  const STRIP = new Set(["id", "createdAt", "updatedAt", "formId", "isActive"]);
  const clean: Record<string, unknown> = { order };
  for (const [k, v] of Object.entries(q)) {
    if (STRIP.has(k)) continue;
    if (k === "type" && typeof v === "string") {
      clean[k] = toFormQuestionType(v);
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

// ── GET single form ──────────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; formId: string }> }
) {
  const { id: courseId, formId } = await params;
  const access = await requireCoursePermission(courseId, "view_course");
  if (!access.ok)
    return NextResponse.json({ error: access.error }, { status: access.status });

  const form = await prisma.form.findUnique({
    where: { id: formId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ form: serializeForm(form) });
}

// ── PATCH (edit / publish-toggle) ────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; formId: string }> }
) {
  const { id: courseId, formId } = await params;
  const access = await requireCoursePermission(courseId, "manage_assignments");
  if (!access.ok)
    return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  const {
    title, description, formType, assignmentGroup,
    points, shuffleAnswers, allowMultipleResponses,
    responseLimit, anonymousResponses, showResultsToRespondents,
    showOneAtATime, lockQuestionsAfterAnswering,
    accessCode, confirmationMessage,
    assignTo, dueDate, dueTime,
    availableFrom, availableFromTime,
    availableUntil, availableUntilTime,
    published, questions,
  } = body;

  const resolvedAssignTo =
    assignTo !== undefined
      ? !assignTo || assignTo.length === 0 || assignTo.includes("Everyone")
        ? []
        : assignTo
      : undefined;

  try {
    if (questions !== undefined) {
      await prisma.formQuestion.deleteMany({ where: { formId } });
    }

    const form = await prisma.form.update({
      where: { id: formId },
      data: {
        ...(title                        !== undefined ? { title: title.trim() }                                            : {}),
        ...(description                  !== undefined ? { description }                                                    : {}),
        ...(formType                     !== undefined ? { formType: toFormType(formType) }                                 : {}),
        ...(assignmentGroup              !== undefined ? { assignmentGroup }                                                : {}),
        ...(points                       !== undefined ? { points: parseFloat(String(points)) || 0 }                       : {}),
        ...(shuffleAnswers               !== undefined ? { shuffleAnswers }                                                 : {}),
        ...(allowMultipleResponses       !== undefined ? { allowMultipleResponses }                                         : {}),
        ...(responseLimit                !== undefined ? { responseLimit }                                                  : {}),
        ...(anonymousResponses           !== undefined ? { anonymousResponses }                                             : {}),
        ...(showResultsToRespondents     !== undefined ? { showResultsToRespondents }                                       : {}),
        ...(showOneAtATime               !== undefined ? { showOneAtATime }                                                 : {}),
        ...(lockQuestionsAfterAnswering  !== undefined ? { lockQuestionsAfterAnswering }                                    : {}),
        ...(accessCode                   !== undefined ? { accessCode }                                                     : {}),
        ...(confirmationMessage          !== undefined ? { confirmationMessage }                                            : {}),
        ...(resolvedAssignTo             !== undefined ? { assignTo: resolvedAssignTo }                                     : {}),
        ...(dueDate                      !== undefined ? { dueDate: parseDate(dueDate, dueTime) }                          : {}),
        ...(availableFrom                !== undefined ? { availableFrom: parseDate(availableFrom, availableFromTime) }     : {}),
        ...(availableUntil               !== undefined ? { availableUntil: parseDate(availableUntil, availableUntilTime) }  : {}),
        ...(published                    !== undefined ? { published }                                                      : {}),
        ...(questions                    !== undefined ? {
          questions: {
            create: (questions as Record<string, unknown>[]).map((q, i) =>
              sanitizeQuestion(q, i)
            ),
          },
        } : {}),
      },
      include: { questions: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ form: serializeForm(form) });
  } catch (err) {
    console.error("[PATCH /api/courses/[id]/forms/[formId]]", err);
    return NextResponse.json({ error: "Failed to update form" }, { status: 500 });
  }
}

// ── DELETE ───────────────────────────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; formId: string }> }
) {
  const { id: courseId, formId } = await params;
  const access = await requireCoursePermission(courseId, "manage_assignments");
  if (!access.ok)
    return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    await prisma.formQuestion.deleteMany({ where: { formId } });
    await prisma.form.delete({ where: { id: formId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/courses/[id]/forms/[formId]]", err);
    return NextResponse.json({ error: "Failed to delete form" }, { status: 500 });
  }
}