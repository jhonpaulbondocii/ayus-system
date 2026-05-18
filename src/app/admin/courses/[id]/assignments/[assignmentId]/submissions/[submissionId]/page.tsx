// src/app/admin/courses/[id]/assignments/[assignmentId]/submissions/[submissionId]/page.tsx
import SpeedGraderClient from "@/components/admin/SpeedGrader";

type Props = {
  params: Promise<{ id: string; assignmentId: string; submissionId: string }>;
};

export default async function SubmissionPage({ params }: Props) {
  const { id, assignmentId } = await params;
  return (
    <SpeedGraderClient
      courseId={id}
      assignmentId={assignmentId}
      initialStudentId={null}
    />
  );
}