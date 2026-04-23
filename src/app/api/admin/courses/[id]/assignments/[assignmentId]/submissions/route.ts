// src/app/api/admin/courses/[id]/assignments/[assignmentId]/submissions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ── Helper: parse stored fileUrl (may be JSON v2 or plain URL) ────────────────
export type ParsedEntry = {
  entryId:    string;
  label:      string;
  type:       string;
  fileUrl:    string | null;
  fileName:   string | null;
  textEntry:  string | null;
  websiteUrl: string | null;
  required:   boolean;
};

export function parseStoredFileUrl(raw: string | null): {
  isMulti:  boolean;
  entries:  ParsedEntry[];
  fileUrl:  string | null;
} {
  if (!raw) return { isMulti: false, entries: [], fileUrl: null };

  // Try JSON v2
  if (raw.trimStart().startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as { version?: number; entries?: ParsedEntry[] };
      if (parsed.version === 2 && Array.isArray(parsed.entries)) {
        return { isMulti: true, entries: parsed.entries, fileUrl: null };
      }
    } catch { /* not JSON */ }
  }

  // Legacy plain URL
  return { isMulti: false, entries: [], fileUrl: raw };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { assignmentId } = await params;

  const submissions = await prisma.submission.findMany({
    where: { assignmentId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  return NextResponse.json({
    submissions: submissions.map(s => {
      const { isMulti, entries, fileUrl } = parseStoredFileUrl(s.fileUrl);
      return {
        id:          s.id,
        userId:      s.userId,
        userName:    s.user.name,
        userEmail:   s.user.email,
        status:      s.status,
        grade:       s.grade,
        feedback:    s.feedback,
        submittedAt: s.submittedAt?.toISOString() ?? null,
        textEntry:   s.textEntry,
        websiteUrl:  s.websiteUrl,
        comments:    s.comments,
        // Multi-entry support
        isMulti,
        entries,
        // Legacy single file (plain URL)
        fileUrl: isMulti ? (entries.find(e => e.fileUrl)?.fileUrl ?? null) : fileUrl,
        // All file URLs for download-all
        allFileUrls: isMulti
          ? entries.filter(e => e.fileUrl).map(e => ({ label: e.label, url: e.fileUrl! }))
          : s.fileUrl ? [{ label: "Submission", url: s.fileUrl }] : [],
      };
    }),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { assignmentId } = await params;
  const body = await req.json() as { submissionId: string; grade?: number; feedback?: string; status?: string };

  const submission = await prisma.submission.update({
    where: { id: body.submissionId },
    data: {
      ...(body.grade    !== undefined && { grade:    body.grade }),
      ...(body.feedback !== undefined && { feedback: body.feedback }),
      ...(body.status   !== undefined && { status:   body.status as never }),
    },
  });

  return NextResponse.json({ submission });
}