// src/app/api/admin/courses/[id]/repositories/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: courseId } = await params;

  const [assignments, enrollmentCount] = await Promise.all([
    prisma.assignment.findMany({
      where: { courseId },
      include: {
        repository: {
          include: {
            files: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, image: true },
                },
                // FIX: removed the conflicting `select` block — Prisma does not
                // allow `include` and `select` on the same relation at once.
                // Keep only `include` and list the fields you need via nested select.
                submission: {
                  include: {
                    user: {
                      select: { id: true, name: true, email: true, image: true },
                    },
                  },
                },
              },
              orderBy: { uploadedAt: "desc" },
            },
            _count: { select: { files: true, logs: true } },
          },
        },
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.courseEnrollment.count({ where: { courseId } }),
  ]);

  const repositories = assignments.map((a) => {
    const repo = a.repository;

    const files = (repo?.files ?? []).map((f) => ({
      id:         f.id,
      fileName:   f.fileName,
      fileUrl:    f.fileUrl,
      fileSize:   f.fileSize,
      mimeType:   f.mimeType,
      uploadedAt: f.uploadedAt,
      // prefer submission.user (the student), fallback to file uploader
      user: f.submission?.user ?? f.user,
      submission: f.submission
        ? {
            id:          f.submission.id,
            status:      f.submission.status,
            grade:       f.submission.grade,
            feedback:    f.submission.feedback,
            submittedAt: f.submission.submittedAt,
          }
        : null,
    }));

    return {
      id:           repo?.id ?? `assignment-${a.id}`,
      name:         repo?.name ?? a.title,
      assignmentId: a.id,
      courseId,
      createdAt:    repo?.createdAt ?? a.createdAt,
      hasRepo:      !!repo,
      assignment: {
        id:              a.id,
        title:           a.title,
        dueDate:         a.dueDate,
        points:          a.points,
        status:          a.status,
        submissionCount: a._count.submissions,
        enrollmentCount,
      },
      files,
      _count: {
        files: repo?._count.files ?? 0,
        logs:  repo?._count.logs  ?? 0,
      },
    };
  });

  return NextResponse.json({ repositories });
}