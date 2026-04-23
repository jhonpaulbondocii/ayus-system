// src/app/admin/courses/[id]/assignments/[assignmentId]/edit/page.tsx
import CourseLayout from "@/components/admin/CourseLayout";
import EditAssignmentPage from "@/components/admin/EditAssignmentPage";

type Props = { params: Promise<{ id: string; assignmentId: string }> };

export default async function Page({ params }: Props) {
  const { id, assignmentId } = await params;
  return (
    <CourseLayout courseId={id} activeItem="Assignments" subItem="Edit">
      <EditAssignmentPage courseId={id} assignmentId={assignmentId} />
    </CourseLayout>
  );
}