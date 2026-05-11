// src/app/courses/[id]/assignments/[assignmentId]/speedgrader/page.tsx

import SpeedGraderHeadClient from "@/components/layout/course/SpeedGraderHeadClient";

interface Props {
  params: Promise<{ id: string; assignmentId: string }>;
  searchParams: Promise<{ submissionId?: string; staffId?: string }>;
}

export default async function SpeedGraderPage({ params, searchParams }: Props) {
  const { id, assignmentId } = await params;
  const { staffId } = await searchParams;

  return (
    <SpeedGraderHeadClient
      courseId={id}
      assignmentId={assignmentId}
      initialStudentId={staffId ?? null}
    />
  );
}