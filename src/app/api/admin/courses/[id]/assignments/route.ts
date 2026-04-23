import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id: courseId } = await context.params;

    const assignments = await prisma.assignment.findMany({
      where: { courseId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error("ASSIGNMENTS GET ERROR:", error);
    return NextResponse.json({ error: "Failed to fetch assignments." }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id: courseId } = await context.params;

    const body = await req.json();

    // ── Required fields ──────────────────────────────────────────────────────
    const title = String(body?.title ?? "").trim();
    if (!title) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    // ── Basic fields ─────────────────────────────────────────────────────────
    const description        = body?.description ? String(body.description) : null;
    const points             = Number(body?.points ?? 0);
    const status             = body?.status === "PUBLISHED" ? "PUBLISHED" : "UNPUBLISHED";
    const assignmentGroup    = String(body?.assignmentGroup ?? "Assignments");
    const submissionType     = String(body?.submissionType ?? "Online");
    const displayGradeAs     = String(body?.displayGradeAs ?? "Points");
    const submissionAttempts = String(body?.submissionAttempts ?? "Unlimited");
    const allowedAttempts    = body?.allowedAttempts ? Number(body.allowedAttempts) : null;
    const doNotCount         = Boolean(body?.doNotCount ?? false);
    const isGroupAssignment  = Boolean(body?.isGroupAssignment ?? false);
    const groupSetId         = body?.groupSetId ? String(body.groupSetId) : null;
    const notifyUsers        = Boolean(body?.notifyUsers ?? false);
    const assignees: string[] = Array.isArray(body?.assignees) ? body.assignees : [];

    // ── submissionEntries → stored as onlineEntryOptions (string labels) ─────
    // The schema has `onlineEntryOptions String[]` on the Assignment model.
    // We map the entry labels from the form into that array.
    const onlineEntryOptions: string[] = Array.isArray(body?.submissionEntries)
      ? body.submissionEntries
          .map((e: { label?: string; type?: string }) =>
            [e.label, e.type].filter(Boolean).join(" - ")
          )
          .filter(Boolean)
      : Array.isArray(body?.onlineEntryOptions)
      ? body.onlineEntryOptions
      : [];

    // ── Due date ──────────────────────────────────────────────────────────────
    let dueDate: Date | null = null;
    if (body?.dueDate) {
      const dateStr = body.dueTime
        ? `${body.dueDate} ${body.dueTime}`
        : `${body.dueDate} 11:59 PM`;
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) dueDate = d;
    }

    // ── Available from ────────────────────────────────────────────────────────
    let availableFrom: Date | null = null;
    if (body?.availableFrom) {
      const dateStr = body.availableFromTime
        ? `${body.availableFrom} ${body.availableFromTime}`
        : `${body.availableFrom} 12:00 AM`;
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) availableFrom = d;
    }

    // ── Available until ───────────────────────────────────────────────────────
    let availableUntil: Date | null = null;
    if (body?.availableUntil) {
      const dateStr = body.untilTime
        ? `${body.availableUntil} ${body.untilTime}`
        : `${body.availableUntil} 11:59 PM`;
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) availableUntil = d;
    }

    // ── Create ────────────────────────────────────────────────────────────────
    const assignment = await prisma.assignment.create({
      data: {
        courseId,
        title,
        description,
        points,
        status,
        assignmentGroup,
        submissionType,
        displayGradeAs,
        onlineEntryOptions,
        submissionAttempts,
        allowedAttempts,
        doNotCount,
        isGroupAssignment,
        groupSetId,
        notifyUsers,
        assignees,
        dueDate,
        availableFrom,
        availableUntil,
      },
    });

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    console.error("ASSIGNMENTS POST ERROR:", error);
    return NextResponse.json(
      { error: "Failed to create assignment." },
      { status: 500 }
    );
  }
}