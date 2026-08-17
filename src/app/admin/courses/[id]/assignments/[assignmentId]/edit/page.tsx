import CourseLayout from "@/components/admin/CourseLayout";
import AssignmentEditClient from "./AssignmentEditClient";

type Props = { params: Promise<{ id: string; assignmentId: string }> };

export default async function Page({ params }: Props) {
  const { id, assignmentId } = await params;
  return (
    <CourseLayout courseId={id} activeItem="Assignments" subItem="Edit">
      <AssignmentEditClient courseId={id} assignmentId={assignmentId} />
    </CourseLayout>
  );
}