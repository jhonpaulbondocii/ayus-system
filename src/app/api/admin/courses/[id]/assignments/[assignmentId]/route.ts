// src/app/api/admin/courses/[id]/assignments/[assignmentId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

type RouteContext = {
  params: Promise<{ id: string; assignmentId: string }>;
};

function parseObjectLikeString(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  if (!trimmed || !(trimmed.startsWith("{") || trimmed.startsWith("["))) return null;

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    // Some legacy values were stored as JavaScript object literals instead of valid JSON.
  }

  const candidate = trimmed
    .replace(/([{,]\s*)([A-Za-z0-9_$]+)\s*:/g, '$1"$2":')
    .replace(/:\s*'([^']*)'/g, ': "$1"')
    .replace(/:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g, ': "$1"');

  try {
    const parsed = JSON.parse(candidate);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function normalizeLabelValue(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";

    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      const parsed = parseObjectLikeString(trimmed);
      if (parsed && typeof parsed.label === "string") {
        return parsed.label.trim();
      }
    }

    return trimmed;
  }

  if (value && typeof value === "object") {
    const entry = value as Record<string, unknown>;
    const label = typeof entry.label === "string" ? entry.label.trim() : "";
    return label || "";
  }

  return String(value ?? "").trim();
}

function normalizeAllowedFileTypes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const types: string[] = [];

  for (const item of value) {
    const normalized = typeof item === "string" ? item.replace(/^\./, "").trim().toLowerCase() : "";
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    types.push(normalized);
  }

  return types;
}

function normalizeMaxFileSizeValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function normalizeMaxFileSizeUnit(value: unknown): "KB" | "MB" {
  return value === "KB" ? "KB" : "MB";
}

function normalizeSubmissionEntry(entry: Record<string, unknown>) {
  let label = normalizeLabelValue(entry.label ?? "");
  let required = typeof entry.required === "boolean" ? entry.required : false;
  let type = typeof entry.type === "string" ? entry.type : "File Upload";

  if (typeof entry.label === "string" && (entry.label.trim().startsWith("{") || entry.label.trim().startsWith("["))) {
    const parsed = parseObjectLikeString(entry.label.trim());
    if (parsed) {
      if (typeof parsed.label === "string") label = parsed.label.trim();
      if (typeof parsed.required === "boolean") required = parsed.required;
      if (typeof parsed.type === "string") type = parsed.type;
    }
  }

  const normalizedType = ["File Upload", "Text Entry", "Website URL", "Media Recording"].includes(type) ? type : "File Upload";
  const allowedFileTypes = normalizedType === "File Upload" || normalizedType === "Media Recording"
    ? normalizeAllowedFileTypes(entry.allowedFileTypes)
    : [];

  return {
    ...entry,
    label,
    required,
    type: normalizedType,
    allowedFileTypes,
    maxFiles: (normalizedType === "File Upload" || normalizedType === "Media Recording")
      ? Number(entry.maxFiles ?? 1) > 0
        ? Number(entry.maxFiles ?? 1)
        : 1
      : null,
    maxFileSizeValue: (normalizedType === "File Upload" || normalizedType === "Media Recording")
      ? normalizeMaxFileSizeValue(entry.maxFileSizeValue)
      : null,
    maxFileSizeUnit: (normalizedType === "File Upload" || normalizedType === "Media Recording")
      ? normalizeMaxFileSizeUnit(entry.maxFileSizeUnit)
      : null,
  };
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id: courseId, assignmentId } = await context.params;

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment || assignment.courseId !== courseId) {
      return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
    }

    // ── Resolve creator from the current session ──────────────────────────────
    // Since the Assignment schema has no createdById field, we identify the
    // creator as the currently logged-in admin/staff viewing or managing the course.
    // For display purposes we look up their enrollment in this specific course
    // so we can show their correct courseRole (e.g. "Head", "Staff", "Admin").
    let creator = null;

    const session = await getServerSession(authOptions);
    const sessionUserId = (session?.user as { id?: string })?.id ?? null;

    if (sessionUserId) {
      const enrollment = await prisma.courseEnrollment.findFirst({
        where: { userId: sessionUserId, courseId },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      if (enrollment) {
        creator = {
          id: enrollment.user.id,
          name: enrollment.user.name ?? "Unknown",
          email: enrollment.user.email,
          courseRole: enrollment.courseRole,
          createdAt: assignment.createdAt.toISOString(),
        };
      } else {
        // Session user exists but is not enrolled in this course (e.g. super-admin).
        // Fall back to their user record with a generic role label.
        const user = await prisma.user.findUnique({
          where: { id: sessionUserId },
          select: { id: true, name: true, email: true, role: true },
        });
        if (user) {
          creator = {
            id: user.id,
            name: user.name ?? "Unknown",
            email: user.email,
            courseRole: user.role, // "ADMIN" | "STAFF"
            createdAt: assignment.createdAt.toISOString(),
          };
        }
      }
    }

    const submissionEntries = (() => {
  try {
    const raw = (assignment as Record<string, unknown>).submissionEntries;
    let entries: unknown[] = [];
    if (Array.isArray(raw)) entries = raw;
    else if (typeof raw === "string") {
      try {
        entries = JSON.parse(raw) as unknown[];
      } catch {
        entries = [];
      }
    }

    // Fallback: kung empty ang submissionEntries, gamitin ang onlineEntryOptions
    if (entries.length === 0) {
      const legacy = (assignment as Record<string, unknown>).onlineEntryOptions;
      if (Array.isArray(legacy) && legacy.length > 0) {
        entries = legacy.map((item: unknown) => {
          if (typeof item === "string") {
            try { return JSON.parse(item) as unknown; } catch { return null; }
          }
          return item;
        }).filter(Boolean);
      }
    }

    return entries
      .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object")
      .map((entry) => normalizeSubmissionEntry(entry));
  } catch { return []; }
})();

return NextResponse.json({ assignment: { ...assignment, submissionEntries }, creator });
  } catch (error) {
    console.error("ASSIGNMENT GET ERROR:", error);
    return NextResponse.json({ error: "Failed to fetch assignment." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { assignmentId } = await context.params;
    const body = await req.json();

    const data: Record<string, unknown> = {};

    if (body.status          !== undefined) data.status          = body.status;
    if (body.title           !== undefined) data.title           = body.title;
    if (body.description     !== undefined) data.description     = body.description;
    if (body.points          !== undefined) data.points          = Number(body.points);
    if (body.assignmentGroup !== undefined) data.assignmentGroup = body.assignmentGroup;
    if (body.assignees           !== undefined) data.assignees           = body.assignees;
    if (body.submissionType      !== undefined) data.submissionType      = body.submissionType;
    if (body.submissionAttempts  !== undefined) data.submissionAttempts  = body.submissionAttempts;
    if (body.allowedAttempts     !== undefined) data.allowedAttempts     = body.allowedAttempts;
    if (body.displayGradeAs      !== undefined) data.displayGradeAs      = body.displayGradeAs;
    if (body.doNotCount          !== undefined) data.doNotCount          = body.doNotCount;
    if (body.isGroupAssignment   !== undefined) data.isGroupAssignment   = body.isGroupAssignment;
    if (body.notifyUsers         !== undefined) data.notifyUsers         = body.notifyUsers;
    if (body.submissionEntries !== undefined) {
      data.onlineEntryOptions = Array.isArray(body.submissionEntries)
        ? body.submissionEntries.map((e: unknown) => JSON.stringify(e))
        : [];
      data.submissionEntries = Array.isArray(body.submissionEntries)
        ? body.submissionEntries.map((entry: Record<string, unknown>) => {
            if (!entry || typeof entry !== "object") return entry;
            const normalized = entry as Record<string, unknown>;
            const label = normalizeLabelValue(normalized.label ?? "");
            const type = typeof normalized.type === "string" && ["File Upload", "Text Entry", "Website URL", "Media Recording"].includes(normalized.type)
              ? normalized.type
              : "File Upload";
            const allowedFileTypes = (type === "File Upload" || type === "Media Recording")
              ? normalizeAllowedFileTypes(normalized.allowedFileTypes)
              : [];

            return {
              ...normalized,
              label,
              required: typeof normalized.required === "boolean" ? normalized.required : false,
              type,
              allowedFileTypes,
              maxFiles: (type === "File Upload" || type === "Media Recording")
                ? Number(normalized.maxFiles ?? 1) > 0
                  ? Number(normalized.maxFiles ?? 1)
                  : 1
                : null,
              maxFileSizeValue: (type === "File Upload" || type === "Media Recording")
                ? normalizeMaxFileSizeValue(normalized.maxFileSizeValue)
                : null,
              maxFileSizeUnit: (type === "File Upload" || type === "Media Recording")
                ? normalizeMaxFileSizeUnit(normalized.maxFileSizeUnit)
                : null,
            };
          })
        : body.submissionEntries;
    }
    if (body.onlineEntryOptions  !== undefined) data.onlineEntryOptions  = body.onlineEntryOptions;

    // ── Date fields ────────────────────────────────────────────────────────────
    if (body.dueDate !== undefined) {
      if (body.dueDate) {
        const d = new Date(`${body.dueDate} ${body.dueTime || "11:59 PM"}`);
        data.dueDate = isNaN(d.getTime()) ? null : d;
      } else {
        data.dueDate = null;
      }
    }

    if (body.availableFrom !== undefined) {
      if (body.availableFrom) {
        const d = new Date(`${body.availableFrom} ${body.availableFromTime || "12:00 AM"}`);
        data.availableFrom = isNaN(d.getTime()) ? null : d;
      } else {
        data.availableFrom = null;
      }
    }

    if (body.availableUntil !== undefined) {
      if (body.availableUntil) {
        const d = new Date(`${body.availableUntil} ${body.untilTime || "11:59 PM"}`);
        data.availableUntil = isNaN(d.getTime()) ? null : d;
      } else {
        data.availableUntil = null;
      }
    }

    const assignment = await prisma.assignment.update({
      where: { id: assignmentId },
      data,
    });

    return NextResponse.json({ assignment });
  } catch (error) {
    console.error("ASSIGNMENT PATCH ERROR:", error);
    return NextResponse.json({ error: "Failed to update assignment." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { assignmentId } = await context.params;

    await prisma.assignment.delete({ where: { id: assignmentId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ASSIGNMENT DELETE ERROR:", error);
    return NextResponse.json({ error: "Failed to delete assignment." }, { status: 500 });
  }
}