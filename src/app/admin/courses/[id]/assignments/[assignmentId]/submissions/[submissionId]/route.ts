// src/app/api/admin/courses/[id]/assignments/[assignmentId]/submissions/[submissionId]/route.ts
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string; submissionId: string }> }
) {
  if (!await requireAdmin())
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { submissionId } = await params;
  const { grade, feedback, status } = await req.json();

  const submission = await prisma.submission.update({
    where: { id: submissionId },
    data: {
      ...(grade    !== undefined && { grade }),
      ...(feedback !== undefined && { feedback }),
      ...(status   !== undefined && { status }),
    },
  });

  return NextResponse.json({ submission });
}