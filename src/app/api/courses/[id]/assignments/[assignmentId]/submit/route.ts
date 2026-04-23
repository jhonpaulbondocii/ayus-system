// src/app/api/courses/[id]/assignments/[assignmentId]/submit/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AssignmentStatus } from "@/generated/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: courseId, assignmentId } = await params;
    const userId = (session.user as { id?: string })?.id ?? "";

    if (!userId) {
      return NextResponse.json({ error: "User ID missing from session." }, { status: 401 });
    }

    // ── Verify enrollment ──────────────────────────────────────────────────
    const enrollment = await prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { id: true, courseRole: true },
    });

    if (!enrollment) {
      const systemUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (systemUser?.role !== "ADMIN") {
        return NextResponse.json(
          { error: "You are not enrolled in this course." },
          { status: 403 }
        );
      }
    }

    // ── Verify assignment ──────────────────────────────────────────────────
    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, courseId },
      select: {
        id:                 true,
        allowedAttempts:    true,
        availableFrom:      true,
        availableUntil:     true,
        status:             true,
        submissionType:     true,
        onlineEntryOptions: true,
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
    }

    if (assignment.status !== "PUBLISHED") {
      return NextResponse.json({ error: "This assignment is not available." }, { status: 403 });
    }

    const now = new Date();
    if (assignment.availableFrom && now < new Date(assignment.availableFrom)) {
      return NextResponse.json({ error: "This assignment is not yet available." }, { status: 403 });
    }
    if (assignment.availableUntil && now > new Date(assignment.availableUntil)) {
      return NextResponse.json({ error: "The submission window has closed." }, { status: 403 });
    }

    if (assignment.allowedAttempts != null) {
      const attemptCount = await prisma.submission.count({ where: { assignmentId, userId } });
      if (attemptCount >= assignment.allowedAttempts) {
        return NextResponse.json(
          { error: `You have used all ${assignment.allowedAttempts} allowed attempt(s).` },
          { status: 403 }
        );
      }
    }

    // ── Parse body ─────────────────────────────────────────────────────────
    const body = await req.json() as {
      // Legacy single-entry fields (backward compat)
      textEntry?:  string;
      fileUrl?:    string;
      websiteUrl?: string;
      comments?:   string;
      // New multi-entry fields — one per submission entry
      entries?: {
        entryId:     string;
        label:       string;
        type:        string;        // "File Upload" | "Text Entry" | "Website URL" | "Media Recording"
        fileUrl?:    string;        // already uploaded, URL returned by /api/upload
        fileName?:   string;
        textEntry?:  string;
        websiteUrl?: string;
        required:    boolean;
      }[];
    };

    const { textEntry, fileUrl, websiteUrl, comments, entries } = body;

    // ── Validate required entries ──────────────────────────────────────────
    if (Array.isArray(entries) && entries.length > 0) {
      for (const entry of entries) {
        if (!entry.required) continue;
        const hasValue =
          (entry.fileUrl    && entry.fileUrl.trim())    ||
          (entry.textEntry  && entry.textEntry.trim())  ||
          (entry.websiteUrl && entry.websiteUrl.trim());
        if (!hasValue) {
          return NextResponse.json(
            { error: `"${entry.label || entry.type}" is required but was not submitted.` },
            { status: 400 }
          );
        }
      }
    }

    const hasContent =
      (textEntry  && textEntry.trim().length  > 0) ||
      (fileUrl    && fileUrl.trim().length    > 0) ||
      (websiteUrl && websiteUrl.trim().length > 0) ||
      (Array.isArray(entries) && entries.some(e => e.fileUrl || e.textEntry || e.websiteUrl));

    if (!hasContent) {
      return NextResponse.json(
        { error: "Please provide at least one submission." },
        { status: 400 }
      );
    }

    // ── Build storage values ───────────────────────────────────────────────
    // We store multi-entry data as JSON in fileUrl so no schema migration is needed.
    // Shape stored: JSON.stringify({ entries: [...], version: 2 })
    // Legacy single-file submissions keep a plain URL string.

    let storedFileUrl: string | null = null;
    let storedTextEntry: string | null = textEntry ?? null;
    let storedWebsiteUrl: string | null = websiteUrl ?? null;

    if (Array.isArray(entries) && entries.length > 0) {
      // Multi-entry: serialize all entries as JSON
      const serialized = JSON.stringify({
        version: 2,
        entries: entries.map(e => ({
          entryId:    e.entryId,
          label:      e.label,
          type:       e.type,
          fileUrl:    e.fileUrl    ?? null,
          fileName:   e.fileName   ?? null,
          textEntry:  e.textEntry  ?? null,
          websiteUrl: e.websiteUrl ?? null,
          required:   e.required,
        })),
      });
      storedFileUrl = serialized;
      // Also populate legacy fields from first matching entry for backward compat
      storedTextEntry  = entries.find(e => e.textEntry)?.textEntry   ?? null;
      storedWebsiteUrl = entries.find(e => e.websiteUrl)?.websiteUrl ?? null;
    } else {
      // Legacy single-entry
      storedFileUrl = fileUrl ?? null;
    }

    // ── Upsert submission ──────────────────────────────────────────────────
    const submission = await prisma.submission.upsert({
      where:  { userId_assignmentId: { userId, assignmentId } },
      create: {
        userId,
        assignmentId,
        status:      AssignmentStatus.SUBMITTED,
        submittedAt: now,
        fileUrl:     storedFileUrl,
        textEntry:   storedTextEntry,
        websiteUrl:  storedWebsiteUrl,
        comments:    comments ?? null,
        grade:       null,
        feedback:    null,
      },
      update: {
        status:      AssignmentStatus.SUBMITTED,
        submittedAt: now,
        fileUrl:     storedFileUrl,
        textEntry:   storedTextEntry,
        websiteUrl:  storedWebsiteUrl,
        comments:    comments ?? null,
        grade:       null,
        feedback:    null,
      },
    });

    return NextResponse.json({ submission });
  } catch (err) {
    console.error("[POST submit]", err);
    return NextResponse.json({ error: "Failed to submit assignment." }, { status: 500 });
  }
}