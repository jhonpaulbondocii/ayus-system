// src/app/admin/courses/[id]/assignments/[assignmentId]/speedgrader/page.tsx
import SpeedGraderClient from "@/components/admin/SpeedGrader";

type Props = { params: Promise<{ id: string; assignmentId: string }>; searchParams: Promise<{ student_id?: string }> };

export default async function SpeedGraderPage({ params, searchParams }: Props) {
  const { id, assignmentId } = await params;
  const { student_id } = await searchParams;
  return (
    <SpeedGraderClient
      courseId={id}
      assignmentId={assignmentId}
      initialStudentId={student_id ?? null}
    />
  );
}