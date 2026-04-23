import CourseLayout from "@/components/admin/CourseLayout";
import CoursePagesPage from "@/components/admin/CoursePagesPage";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return (
    <CourseLayout courseId={id} activeItem="Pages">
      <CoursePagesPage />
    </CourseLayout>
  );
}