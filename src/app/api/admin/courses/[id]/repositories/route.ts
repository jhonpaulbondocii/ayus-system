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
        repositories: {
          include: {
            repository_files: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, image: true },
                },
                submissions: {
                  include: {
                    user: {
                      select: { id: true, name: true, email: true, image: true },
                    },
                  },
                },
              },
              orderBy: { uploadedAt: "desc" },
            },
            _count: { select: { repository_files: true, activity_logs: true } },
          },
        },
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.courseEnrollment.count({ where: { courseId } }),
  ]);

  const repositories = assignments.map((a) => {
    const repo = a.repositories;

    const files = (repo?.repository_files ?? []).map((f) => ({
      id:         f.id,
      fileName:   f.fileName,
      fileUrl:    f.fileUrl,
      fileSize:   f.fileSize,
      mimeType:   f.mimeType,
      uploadedAt: f.uploadedAt,
      // prefer submissions.user (the student), fallback to file uploader
      user: f.submissions?.user ?? f.user,
      submission: f.submissions
        ? {
            id:          f.submissions.id,
            status:      f.submissions.status,
            grade:       f.submissions.grade,
            feedback:    f.submissions.feedback,
            submittedAt: f.submissions.submittedAt,
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
        files: repo?._count.repository_files ?? 0,
        logs:  repo?._count.activity_logs  ?? 0,
      },
    };
  });

  return NextResponse.json({ repositories });
}