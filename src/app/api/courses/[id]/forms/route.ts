// src/app/api/courses/[id]/forms/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";
import { FormType, FormQuestionType } from "@/generated/prisma";

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

function isAssignedToUser(
  assignTo: string[],
  userName: string,
  userSection: string,
  userCourseRole: string,
  userId: string
): boolean {
  if (!assignTo || assignTo.length === 0) return true;
  if (assignTo.includes("Everyone")) return true;
  if (userName       && assignTo.includes(userName))       return true;
  if (userSection    && assignTo.includes(userSection))    return true;
  if (userCourseRole && assignTo.includes(userCourseRole)) return true;
  if (assignTo.includes(userId)) return true;
  return false;
}

function parseDate(
  date: string | null | undefined,
  time: string | null | undefined
): Date | null {
  if (!date) return null;
  const datePart = date.includes("T") ? date.split("T")[0] : date;
  let hours = 0, minutes = 0;
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

function toPhDateString(dt: Date | null | undefined): string | null {
  if (!dt) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(dt));
}

function toPhTimeString(dt: Date | null | undefined): string | null {
  if (!dt) return null;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric", minute: "2-digit", hour12: true,
  }).format(new Date(dt));
}

function sanitizeQuestion(q: Record<string, unknown>, order: number): Record<string, unknown> {
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

function getRoleType(courseRole: string): "headOnly" | "both" | "staffOnly" {
  const roles = courseRole.split(",").map((r) => r.trim().toLowerCase());
  const hasHead = roles.includes("head");
  const hasStaff = roles.includes("staff");
  if (hasHead && hasStaff) return "both";
  if (hasHead) return "headOnly";
  return "staffOnly";
}

// ── GET /api/courses/[id]/forms ──────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: courseId } = await params;

  const access = await requireCoursePermission(courseId, "view_course");
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const userId  = access.userId;
  const isAdmin = access.systemRole === "ADMIN";

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { section: true, courseRole: true },
  });
  const userSection    = enrollment?.section    ?? "";
  const userCourseRole = enrollment?.courseRole ?? access.courseRole ?? "";

  const userRow = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });
  const userDisplayName = userRow?.name ?? "";

  const roleType = isAdmin ? "admin" : getRoleType(userCourseRole);
  const isHead = roleType === "headOnly" || roleType === "both";

  const allForms = await prisma.form.findMany({
    where: {
      courseId,
      ...(isAdmin || isHead ? {} : { published: true }),
    },
    include: {
      questions: { orderBy: { order: "asc" } },
      author: { select: { id: true, name: true, image: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const sanitized = allForms
    .filter((f) => {
      const assignTo = (f.assignTo as string[]) ?? [];
      const assignedToYou = isAssignedToUser(
        assignTo, userDisplayName, userSection, userCourseRole, userId
      );
      const isCreator = f.author?.id === userId || f.authorId === userId;

      // Check if the author is a system Admin
      const authorIsAdmin = f.author?.role === "ADMIN";

      if (roleType === "admin") return true;

      if (roleType === "headOnly") {
        // Head Only: sees forms they created + forms FROM ADMIN assigned to them
        return isCreator || (authorIsAdmin && assignedToYou);
      }

      if (roleType === "both") {
        // Both: sees forms they created + forms assigned to them (from Head or Admin)
        return isCreator || assignedToYou;
      }

      // Staff Only: only forms assigned to them
      return assignedToYou;
    })
    .map((f) => {
      const assignTo = (f.assignTo as string[]) ?? [];
      const isCreator = f.author?.id === userId || f.authorId === userId;

      let formRole: "manager" | "submitter";
      if (isAdmin || isCreator) {
        formRole = "manager";
      } else {
        formRole = "submitter";
      }

      return {
        ...serializeForm(f),
        assignTo,
        _formRole:        formRole,
        _publisherName:   f.author?.name  ?? null,
        _publisherImage:  f.author?.image ?? null,
        _publisherId:     f.author?.id    ?? null,
        isCreator,
        _isAssignedToYou: isAssignedToUser(
          assignTo, userDisplayName, userSection, userCourseRole, userId
        ),
      };
    });

  return NextResponse.json({
    forms: sanitized,
    viewer: {
      systemRole:     access.systemRole,
      courseRole:     access.courseRole,
      canManageForms: isAdmin || isHead,
    },
  });
}

// ── POST /api/courses/[id]/forms ─────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: courseId } = await params;

  const access = await requireCoursePermission(courseId, "manage_assignments");
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

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

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const resolvedAssignTo =
    !assignTo || assignTo.length === 0 || assignTo.includes("Everyone")
      ? []
      : assignTo;

  try {
    const form = await prisma.form.create({
      data: {
        courseId,
        authorId:                    access.userId,
        title:                       title.trim(),
        description:                 description               ?? "",
        formType:                    toFormType(formType ?? "Survey / Feedback"),
        assignmentGroup:             assignmentGroup           ?? "Assignments",
        points:                      parseFloat(String(points)) || 0,
        shuffleAnswers:              shuffleAnswers             ?? false,
        allowMultipleResponses:      allowMultipleResponses     ?? false,
        responseLimit:               responseLimit              ?? null,
        anonymousResponses:          anonymousResponses          ?? false,
        showResultsToRespondents:    showResultsToRespondents   ?? false,
        showOneAtATime:              showOneAtATime              ?? false,
        lockQuestionsAfterAnswering: lockQuestionsAfterAnswering ?? false,
        accessCode:                  accessCode                 ?? "",
        confirmationMessage:         confirmationMessage         ?? "",
        assignTo:                    resolvedAssignTo,
        dueDate:                     parseDate(dueDate, dueTime),
        availableFrom:               parseDate(availableFrom, availableFromTime),
        availableUntil:              parseDate(availableUntil, availableUntilTime),
        published:                   published ?? false,
        questions:
          questions?.length
            ? {
                create: (questions as Record<string, unknown>[]).map((q, i) =>
                  sanitizeQuestion(q, i)
                ),
              }
            : undefined,
      },
      include: { questions: true },
    });

    return NextResponse.json({ form: serializeForm(form) });
  } catch (err) {
    console.error("[POST /api/courses/[id]/forms]", err);
    return NextResponse.json({ error: "Failed to create form" }, { status: 500 });
  }
}