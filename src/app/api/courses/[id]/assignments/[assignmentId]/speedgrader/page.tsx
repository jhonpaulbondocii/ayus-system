// src/app/courses/[id]/assignments/[assignmentId]/speedgrader/page.tsx

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SpeedGraderHeadClient from "@/components/layout/course/SpeedGraderHeadClient";

interface Props {
  params: Promise<{ id: string; assignmentId: string }>;
  searchParams: Promise<{ student?: string }>;
}

export default async function SpeedGraderPage({ params, searchParams }: Props) {
  const { id: courseId, assignmentId } = await params;
  const { student: initialStudentId = null } = await searchParams;

  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id?: string })?.id ?? "";

  // Check enrollment — must be Head or Admin
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { courseRole: true },
  });

  const systemUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  const isAdmin = systemUser?.role === "ADMIN";
  const isHead  = enrollment?.courseRole === "Head";

  if (!isAdmin && !isHead) {
    redirect(`/courses/${courseId}/assignments/${assignmentId}`);
  }

  return (
    <SpeedGraderHeadClient
      courseId={courseId}
      assignmentId={assignmentId}
      initialStudentId={initialStudentId}
    />
  );
}