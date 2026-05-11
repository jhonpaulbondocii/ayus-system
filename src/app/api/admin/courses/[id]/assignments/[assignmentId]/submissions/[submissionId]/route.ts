// src/app/api/admin/courses/[id]/assignments/[assignmentId]/submissions/[submissionId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string; submissionId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { submissionId } = await params;
  const body = await req.json();
  const { grade, feedback, status, daysLate } = body;

  const validStatuses = ["PENDING", "SUBMITTED", "GRADED", "OVERDUE", "LATE", "MISSING", "EXCUSED"];
  const safeStatus = status && validStatuses.includes(status) ? status : undefined;

  const submission = await prisma.submission.update({
  where: { id: submissionId },
  data: {
    ...(grade    !== undefined && { grade:    grade    }),
    ...(feedback !== undefined && { feedback: feedback }),
    ...(safeStatus !== undefined && { status: safeStatus as never }),
    ...(daysLate !== undefined && daysLate !== null && { daysLate: daysLate }),
  },
  select: {
    id:       true,
    grade:    true,
    feedback: true,
    status:   true,
    daysLate: true,
  },
});

  return NextResponse.json({ submission });
}