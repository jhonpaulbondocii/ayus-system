// src/app/api/courses/[id]/assignments/[assignmentId]/submit/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AssignmentStatus } from "@/generated/prisma";

type SubmissionEntryRule = {
  id: string | number;
  label?: string;
  required?: boolean;
  type?: string;
  allowedFileTypes?: string[];
  maxFiles?: number | null;
};

type SubmittedEntry = {
  entryId: string;
  label: string;
  type: string;
  fileUrl?: string;
  fileName?: string;
  textEntry?: string;
  websiteUrl?: string;
  required: boolean;
};

function parseSubmissionRules(options: string[]): SubmissionEntryRule[] {
  const rules: SubmissionEntryRule[] = [];
  for (const option of options ?? []) {
    try {
      const parsed = JSON.parse(option) as SubmissionEntryRule;
      if (parsed && typeof parsed === "object" && "id" in parsed) {
        rules.push(parsed);
      }
    } catch {
      // legacy option, ignore
    }
  }
  return rules;
}

function getFileExtension(fileNameOrUrl?: string | null): string {
  if (!fileNameOrUrl) return "";
  const clean = fileNameOrUrl.split("?")[0].split("#")[0];
  return clean.split(".").pop()?.toLowerCase() ?? "";
}

function validateSubmittedFile(entry: SubmittedEntry, rule?: SubmissionEntryRule) {
  if (!rule || rule.type !== "File Upload") return null;
  const allowed = (rule.allowedFileTypes ?? [])
    .map((t) => t.toLowerCase().replace(".", "").trim())
    .filter(Boolean);
  if (allowed.length === 0) return null;
  const ext = getFileExtension(entry.fileName || entry.fileUrl);
  if (!ext || !allowed.includes(ext)) {
    return `"${entry.label || "File Upload"}" only accepts: ${allowed.map((t) => t.toUpperCase()).join(", ")}.`;
  }
  return null;
}

// ── Helper: upsert repo + sync RepositoryFile records after submission ────────
async function syncRepositoryFiles(
  submission: { id: string; userId: string },
  assignmentId: string,
  courseId: string,
  assignmentTitle: string,
  entries: SubmittedEntry[] | null,
  legacyFileUrl: string | null,
  legacyFileName: string | null,
) {
  type FileEntry = { fileUrl: string; fileName: string };
  const filesToSync: FileEntry[] = [];

  if (Array.isArray(entries) && entries.length > 0) {
    for (const entry of entries) {
      if (entry.fileUrl?.trim()) {
        filesToSync.push({
          fileUrl:  entry.fileUrl,
          fileName: entry.fileName ?? entry.fileUrl.split("/").pop() ?? "file",
        });
      }
    }
  } else if (legacyFileUrl?.trim()) {
    filesToSync.push({
      fileUrl:  legacyFileUrl,
      fileName: legacyFileName ?? legacyFileUrl.split("/").pop() ?? "file",
    });
  }

  if (filesToSync.length === 0) return;

  // FIX: upsert the repository so it always exists before we try to link files.
  // Previously this returned early if no repo existed, meaning first-time
  // submissions never created repo files.
  const repository = await prisma.repository.upsert({
    where:  { assignmentId },
    create: {
      assignmentId,
      courseId,
      name: assignmentTitle,
    },
    update: {}, // already exists — nothing to change
  });

  // Remove old RepositoryFile records for this submission (handles resubmits)
  await prisma.repositoryFile.deleteMany({
    where: { submissionId: submission.id },
  });

  // Re-create one RepositoryFile per uploaded file
  for (let i = 0; i < filesToSync.length; i++) {
    const f = filesToSync[i];
    await prisma.repositoryFile.create({
      data: {
        repositoryId: repository.id,
        userId:       submission.userId,
        // schema has submissionId @unique — only link the first file
        submissionId: i === 0 ? submission.id : null,
        fileName:     f.fileName,
        fileUrl:      f.fileUrl,
        fileSize:     null,
        mimeType:     null,
      },
    });
  }

  await prisma.activityLog.create({
    data: {
      repositoryId: repository.id,
      userId:       submission.userId,
      action:       "UPLOAD",
      targetType:   "file",
      targetName:   filesToSync[0].fileName,
      metadata:     { count: String(filesToSync.length) },
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: courseId, assignmentId } = await params;
    const userId = (session.user as { id?: string })?.id ?? "";

    if (!userId) return NextResponse.json({ error: "User ID missing from session." }, { status: 401 });

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
        return NextResponse.json({ error: "You are not enrolled in this course." }, { status: 403 });
      }
    }

    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, courseId },
      select: {
        id: true,
        title: true,       // needed for repo name on first create
        allowedAttempts: true,
        availableFrom: true,
        availableUntil: true,
        status: true,
        submissionType: true,
        onlineEntryOptions: true,
      },
    });

    if (!assignment) return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
    if (assignment.status !== "PUBLISHED") return NextResponse.json({ error: "This assignment is not available." }, { status: 403 });

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
        return NextResponse.json({ error: `You have used all ${assignment.allowedAttempts} allowed attempt(s).` }, { status: 403 });
      }
    }

    const body = (await req.json()) as {
      textEntry?: string;
      fileUrl?: string;
      fileName?: string;
      websiteUrl?: string;
      comments?: string;
      entries?: SubmittedEntry[];
    };

    const { textEntry, fileUrl, fileName, websiteUrl, comments, entries } = body;

    const rules   = parseSubmissionRules(assignment.onlineEntryOptions);
    const ruleMap = new Map(rules.map((rule) => [String(rule.id), rule]));

    if (Array.isArray(entries) && entries.length > 0) {
      for (const entry of entries) {
        const rule = ruleMap.get(String(entry.entryId));
        if (entry.required) {
          const hasValue = !!entry.fileUrl?.trim() || !!entry.textEntry?.trim() || !!entry.websiteUrl?.trim();
          if (!hasValue) {
            return NextResponse.json({ error: `"${entry.label || entry.type}" is required but was not submitted.` }, { status: 400 });
          }
        }
        const fileError = validateSubmittedFile(entry, rule);
        if (fileError) return NextResponse.json({ error: fileError }, { status: 400 });
      }
    } else if (fileUrl) {
      const firstFileRule = rules.find((rule) => rule.type === "File Upload");
      const fileError = validateSubmittedFile(
        { entryId: String(firstFileRule?.id ?? "legacy"), label: firstFileRule?.label ?? "File Upload", type: "File Upload", fileUrl, fileName, required: true },
        firstFileRule,
      );
      if (fileError) return NextResponse.json({ error: fileError }, { status: 400 });
    }

    const hasContent =
      !!textEntry?.trim() ||
      !!fileUrl?.trim() ||
      !!websiteUrl?.trim() ||
      (Array.isArray(entries) && entries.some((e) => !!e.fileUrl?.trim() || !!e.textEntry?.trim() || !!e.websiteUrl?.trim()));

    if (!hasContent) return NextResponse.json({ error: "Please provide at least one submission." }, { status: 400 });

    let storedFileUrl:    string | null = null;
    let storedTextEntry:  string | null = textEntry ?? null;
    let storedWebsiteUrl: string | null = websiteUrl ?? null;

    if (Array.isArray(entries) && entries.length > 0) {
      storedFileUrl = JSON.stringify({
        version: 2,
        entries: entries.map((entry) => ({
          entryId:    entry.entryId,
          label:      entry.label,
          type:       entry.type,
          fileUrl:    entry.fileUrl    ?? null,
          fileName:   entry.fileName   ?? null,
          textEntry:  entry.textEntry  ?? null,
          websiteUrl: entry.websiteUrl ?? null,
          required:   entry.required,
        })),
      });
      storedTextEntry  = entries.find((e) => e.textEntry)?.textEntry   ?? null;
      storedWebsiteUrl = entries.find((e) => e.websiteUrl)?.websiteUrl ?? null;
    } else {
      storedFileUrl = fileUrl ?? null;
    }

    const submission = await prisma.submission.upsert({
      where:  { userId_assignmentId: { userId, assignmentId } },
      create: {
        userId, assignmentId,
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

    // FIX: pass courseId and assignmentTitle so the repo can be created on the fly
    await syncRepositoryFiles(
      { id: submission.id, userId },
      assignmentId,
      courseId,
      assignment.title,
      Array.isArray(entries) && entries.length > 0 ? entries : null,
      fileUrl ?? null,
      fileName ?? null,
    );

    return NextResponse.json({ submission });
  } catch (err) {
    console.error("[POST submit]", err);
    return NextResponse.json({ error: "Failed to submit assignment." }, { status: 500 });
  }
}