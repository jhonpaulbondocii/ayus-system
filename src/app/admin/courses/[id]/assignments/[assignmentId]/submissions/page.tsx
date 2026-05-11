// src/app/admin/courses/[id]/assignments/[assignmentId]/submissions/page.tsx
import CourseLayout from "@/components/admin/CourseLayout";
import AdminCourseAssignmentSubmissionsPage from "@/components/admin/AdminCourseAssignmentSubmissionsPage";

type Props = { params: Promise<{ id: string; assignmentId: string }> };

export default async function Page({ params }: Props) {
  const { id, assignmentId } = await params;
  return (
    <CourseLayout courseId={id} activeItem="Assignments">
      <AdminCourseAssignmentSubmissionsPage courseId={id} assignmentId={assignmentId} />
    </CourseLayout>
  );
}