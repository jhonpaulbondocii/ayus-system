import CourseLayout from "@/components/admin/CourseLayout";
import CourseAssignmentsPage from "@/components/admin/CourseAssignmentsPage";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return (
    <CourseLayout courseId={id} activeItem="Assignments">
      <CourseAssignmentsPage courseId={id} />
    </CourseLayout>
  );
}