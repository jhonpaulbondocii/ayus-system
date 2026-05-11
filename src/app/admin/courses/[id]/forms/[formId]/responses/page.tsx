import CourseLayout from "@/components/admin/CourseLayout";
import AdminCourseFormResponsesPage from "@/components/admin/AdminCourseFormResponsesPage";

type Props = { params: Promise<{ id: string; formId: string }> };

export default async function Page({ params }: Props) {
  const { id, formId } = await params;
  return (
    <CourseLayout courseId={id} activeItem="Forms">
      <AdminCourseFormResponsesPage courseId={id} formId={formId} />
    </CourseLayout>
  );
}