import CourseLayout from "@/components/admin/CourseLayout";
import AdminCourseFormsPage from "@/components/admin/AdminCourseFormsPage";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return (
    <CourseLayout courseId={id} activeItem="Quizzes">
      <AdminCourseFormsPage courseId={id} />
    </CourseLayout>
  );
}