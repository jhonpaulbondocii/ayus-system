import CourseLayout from "@/components/admin/CourseLayout";
import AdminCourseFormDetailPage from "@/components/admin/AdminCourseFormDetailPage";

type Props = { params: Promise<{ id: string; assignmentId: string }> };

export default async function Page({ params }: Props) {
  const { id, assignmentId } = await params;
  return (
    <CourseLayout courseId={id} activeItem="Assignments">
      <AdminCourseFormDetailPage courseId={id} formId={assignmentId} />
    </CourseLayout>
  );
}