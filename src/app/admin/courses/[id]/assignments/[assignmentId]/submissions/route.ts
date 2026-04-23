// src/app/api/admin/courses/[id]/assignments/[assignmentId]/submissions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SessionUser = { role?: string };

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  if ((session.user as SessionUser)?.role !== "ADMIN") return null;
  return session;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  if (!await requireAdmin())
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { assignmentId } = await params;

  const submissions = await prisma.submission.findMany({
    where: { assignmentId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  const result = submissions.map(s => ({
    id:          s.id,
    userId:      s.userId,
    userName:    s.user.name,
    userEmail:   s.user.email,
    status:      s.status,
    grade:       s.grade,
    fileUrl:     s.fileUrl,
    submittedAt: s.submittedAt?.toISOString() ?? null,
    feedback:    s.feedback,
  }));

  return NextResponse.json({ submissions: result });
}