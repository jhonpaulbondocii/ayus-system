// src/app/admin/courses/[id]/assignments/[assignmentId]/page.tsx
import CourseLayout from "@/components/admin/CourseLayout";
import AdminCourseAssignmentDetailPage from "@/components/admin/AdminCourseAssignmentDetailPage";

type Props = { params: Promise<{ id: string; assignmentId: string }> };

export default async function Page({ params }: Props) {
  const { id, assignmentId } = await params;
  return (
    <CourseLayout courseId={id} activeItem="Assignments">
      <AdminCourseAssignmentDetailPage courseId={id} assignmentId={assignmentId} />
    </CourseLayout>
  );
}