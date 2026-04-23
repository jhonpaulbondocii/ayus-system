// src/app/courses/[id]/assignments/[assignmentId]/page.tsx
import MainLayout from "@/components/layout/MainLayout";
import CourseAssignmentDetailPage from "@/components/layout/CourseAssignmentDetailPage";

type Props = { params: Promise<{ id: string; assignmentId: string }> };

export default async function Page({ params }: Props) {
  const { id, assignmentId } = await params;
  return (
    <MainLayout>
      <CourseAssignmentDetailPage courseId={id} assignmentId={assignmentId} />
    </MainLayout>
  );
}